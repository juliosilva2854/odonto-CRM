import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Wand2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { catalogService } from "@/services/catalog.service";
import { odontogramService } from "@/services/odontogram.service";
import { quotesService } from "@/services/quotes.service";
import type {
  Procedure,
  Quote,
  QuoteCreatePayload,
  ToothProcedure,
} from "@/types/api";

import { formatBRL } from "./quote-status";

interface NewQuoteSheetProps {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (quote: Quote) => void;
}

/**
 * Slide-over to build a new quote out of the patient's PLANNED tooth
 * procedures. Each selected ToothProcedure becomes a QuoteItem (with
 * `tooth_procedure_id` so the backend snapshots tooth/face/price).
 */
export function NewQuoteSheet({
  patientId,
  open,
  onOpenChange,
  onCreated,
}: NewQuoteSheetProps) {
  const queryClient = useQueryClient();

  // Odontogram — source of planned procedures.
  const odontogramQuery = useQuery({
    queryKey: ["odontogram", patientId],
    queryFn: () => odontogramService.snapshot(patientId),
    enabled: open && !!patientId,
  });

  // Catalog — to display procedure name + base price for each row.
  const catalogQuery = useQuery({
    queryKey: ["catalog", "procedures"],
    queryFn: () => catalogService.listProcedures({}),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const procedureById = useMemo<Record<string, Procedure>>(() => {
    const map: Record<string, Procedure> = {};
    (catalogQuery.data?.items ?? []).forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [catalogQuery.data]);

  const plannedProcedures: ToothProcedure[] = useMemo(
    () =>
      (odontogramQuery.data?.procedures ?? []).filter(
        (p) => p.status === "planned",
      ),
    [odontogramQuery.data],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState("");

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(plannedProcedures.map((p) => p.id)));
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  const subtotal = useMemo(() => {
    let sum = 0;
    for (const id of selectedIds) {
      const p = plannedProcedures.find((tp) => tp.id === id);
      if (p) sum += Number(p.price_snapshot ?? 0);
    }
    return sum;
  }, [selectedIds, plannedProcedures]);

  const total = useMemo(
    () => Math.max(0, subtotal - Number(discount || 0)),
    [subtotal, discount],
  );

  const createMutation = useMutation({
    mutationFn: (payload: QuoteCreatePayload) => quotesService.create(payload),
    onSuccess: (quote) => {
      queryClient.invalidateQueries({
        queryKey: ["quotes", { patient_id: patientId }],
      });
      // Reset form & close
      clearAll();
      setNotes("");
      setValidUntil("");
      setDiscount("");
      onCreated(quote);
    },
  });

  function onSubmit() {
    if (selectedIds.size === 0) return;
    const items = Array.from(selectedIds)
      .map((id) => plannedProcedures.find((tp) => tp.id === id))
      .filter((tp): tp is ToothProcedure => !!tp)
      .map((tp) => ({
        procedure_id: tp.procedure_id,
        tooth_procedure_id: tp.id,
        tooth_fdi: tp.tooth_fdi ?? null,
        faces: tp.faces,
      }));

    createMutation.mutate({
      patient_id: patientId,
      items,
      discount_amount: discount ? Number(discount).toFixed(2) : "0",
      notes: notes.trim() || null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
    });
  }

  const isLoading = odontogramQuery.isLoading || catalogQuery.isLoading;
  const canSubmit =
    selectedIds.size > 0 && !createMutation.isPending && !isLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col p-0 sm:max-w-xl"
        data-testid="new-quote-sheet"
      >
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle>Novo orçamento</SheetTitle>
              <SheetDescription>
                Selecione os procedimentos planejados que farão parte deste orçamento.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : plannedProcedures.length === 0 ? (
            <EmptyPlanned />
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Procedimentos planejados · {plannedProcedures.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    data-testid="select-all-planned"
                  >
                    Selecionar todos
                  </Button>
                  {selectedIds.size > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAll}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>

              <ul className="space-y-2" data-testid="planned-procedures-list">
                {plannedProcedures.map((p) => {
                  const active = selectedIds.has(p.id);
                  const proc = procedureById[p.procedure_id];
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => toggle(p.id)}
                        data-testid={`planned-procedure-${p.id}`}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all",
                          active
                            ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                            : "border-border bg-card hover:border-accent/40 hover:bg-secondary/40",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            active
                              ? "border-accent bg-accent text-white"
                              : "border-border bg-card",
                          )}
                          aria-hidden
                        >
                          {active && (
                            <svg viewBox="0 0 12 12" className="h-3 w-3">
                              <path
                                d="M2 6.5 L5 9 L10 3"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {proc?.name ?? "Procedimento"}
                            </p>
                            {p.tooth_fdi && (
                              <Badge variant="outline" className="text-[10px]">
                                Dente {p.tooth_fdi}
                              </Badge>
                            )}
                            {p.faces.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {p.faces.join(" · ")}
                              </span>
                            )}
                          </div>
                          {p.notes && (
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                              {p.notes}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {formatBRL(p.price_snapshot)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <Separator className="my-5" />

              {/* Extra fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quote-discount">Desconto (R$)</Label>
                  <Input
                    id="quote-discount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    data-testid="quote-discount-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-valid-until">Válido até</Label>
                  <Input
                    id="quote-valid-until"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    data-testid="quote-valid-until-input"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="quote-notes">Observações</Label>
                <Textarea
                  id="quote-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Condições, formas de pagamento, garantias…"
                  data-testid="quote-notes-input"
                />
              </div>

              {/* Totals */}
              <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({selectedIds.size} item{selectedIds.size === 1 ? "" : "s"})</span>
                  <span className="tabular-nums">{formatBRL(subtotal)}</span>
                </div>
                {Number(discount) > 0 && (
                  <div className="mt-1 flex justify-between text-muted-foreground">
                    <span>Desconto</span>
                    <span className="tabular-nums">− {formatBRL(discount)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex items-center justify-between text-base font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="tabular-nums text-foreground">{formatBRL(total)}</span>
                </div>
              </div>

              {createMutation.error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>
                    {getErrorMessage(createMutation.error, "Não foi possível gerar o orçamento.")}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="accent"
            onClick={onSubmit}
            disabled={!canSubmit}
            data-testid="create-quote-submit"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Gerar orçamento
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function EmptyPlanned() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">
        Nenhum procedimento planejado
      </p>
      <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
        Volte ao odontograma e adicione procedimentos com status{" "}
        <span className="font-medium">Planejado</span> para gerar um orçamento.
      </p>
    </div>
  );
}
