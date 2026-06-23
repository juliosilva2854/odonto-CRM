import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, ChevronRight } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { catalogService } from "@/services/catalog.service";
import { odontogramService } from "@/services/odontogram.service";
import type {
  AddProcedurePayload,
  Procedure,
  ToothFace,
  ToothProcedure,
} from "@/types/api";

import {
  FACE_NAMES,
  faceLayoutFor,
  isAnterior,
  isUpperArch,
} from "./fdi";
import { ProcedureRow } from "./ProcedureRow";

interface ToothDetailSheetProps {
  patientId: string;
  toothFdi: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proceduresForTooth: ToothProcedure[];
  /** Patient is anonymized or record is read-only → disable mutations. */
  disabled?: boolean;
}

export function ToothDetailSheet({
  patientId,
  toothFdi,
  open,
  onOpenChange,
  proceduresForTooth,
  disabled = false,
}: ToothDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-testid="tooth-sheet"
        className="flex w-full flex-col p-0 sm:max-w-lg"
      >
        {toothFdi && (
          <ToothDetail
            patientId={patientId}
            toothFdi={toothFdi}
            proceduresForTooth={proceduresForTooth}
            disabled={disabled}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ToothDetail({
  patientId,
  toothFdi,
  proceduresForTooth,
  disabled,
  onClose,
}: {
  patientId: string;
  toothFdi: string;
  proceduresForTooth: ToothProcedure[];
  disabled: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const arch = isUpperArch(toothFdi) ? "Arcada superior" : "Arcada inferior";
  const type = isAnterior(toothFdi) ? "Anterior" : "Posterior";

  const layout = faceLayoutFor(toothFdi);
  const availableFaces: ToothFace[] = useMemo(
    () => [layout.top, layout.bottom, layout.left, layout.right, layout.center],
    [layout],
  );

  // Procedure catalog — cached, only fetched once per session.
  const { data: catalog, isLoading: loadingCatalog } = useQuery({
    queryKey: ["catalog", "procedures"],
    queryFn: () => catalogService.listProcedures({}),
    staleTime: 5 * 60 * 1000,
  });

  const [procedureId, setProcedureId] = useState<string>("");
  const [selectedFaces, setSelectedFaces] = useState<ToothFace[]>([]);
  const [notes, setNotes] = useState("");

  const procedureOptions: Procedure[] = catalog?.items ?? [];
  const selectedProcedure = procedureOptions.find((p) => p.id === procedureId);

  const addMutation = useMutation({
    mutationFn: (payload: AddProcedurePayload) =>
      odontogramService.addProcedure(patientId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["odontogram", patientId],
      });
      // Reset form to allow rapid follow-ups.
      setProcedureId("");
      setSelectedFaces([]);
      setNotes("");
    },
  });

  function toggleFace(code: ToothFace) {
    setSelectedFaces((prev) =>
      prev.includes(code) ? prev.filter((f) => f !== code) : [...prev, code],
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!procedureId) return;
    const payload: AddProcedurePayload = {
      procedure_id: procedureId,
      tooth_fdi: toothFdi,
      faces: selectedFaces,
      notes: notes.trim() || null,
    };
    addMutation.mutate(payload);
  }

  const canSubmit =
    !disabled &&
    !!procedureId &&
    (!selectedProcedure?.requires_faces || selectedFaces.length > 0) &&
    !addMutation.isPending;

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-base font-semibold text-accent">
            {toothFdi}
          </div>
          <div className="min-w-0">
            <SheetTitle>Dente {toothFdi}</SheetTitle>
            <SheetDescription>
              {arch} · {type} · FDI / ISO 3950
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Existing procedures on this tooth */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Procedimentos no dente
          </h3>
          {proceduresForTooth.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhum procedimento registrado neste dente.
            </p>
          ) : (
            <ul className="mt-3 space-y-2" data-testid="tooth-procedures-list">
              {proceduresForTooth.map((p) => (
                <ProcedureRow
                  key={p.id}
                  patientId={patientId}
                  procedure={p}
                  catalogProcedure={procedureOptions.find((c) => c.id === p.procedure_id)}
                  disabled={disabled}
                />
              ))}
            </ul>
          )}
        </section>

        <Separator className="my-6" />

        {/* Add procedure form */}
        <section>
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Plus className="h-3.5 w-3.5" />
            Novo procedimento
          </h3>

          {disabled && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>
                Este prontuário está bloqueado para edições. Utilize um adendo.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={onSubmit} className="mt-4 space-y-4" data-testid="add-procedure-form">
            <div className="space-y-2">
              <Label htmlFor="procedure">Procedimento</Label>
              <select
                id="procedure"
                value={procedureId}
                onChange={(e) => setProcedureId(e.target.value)}
                disabled={disabled || loadingCatalog}
                className={cn(
                  "flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
                )}
                data-testid="add-procedure-select"
                required
              >
                <option value="">
                  {loadingCatalog ? "Carregando catálogo…" : "Selecione um procedimento…"}
                </option>
                {procedureOptions
                  .filter((p) => p.is_active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — R$ {p.base_price}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Faces afetadas</Label>
                <span className="text-[11px] text-muted-foreground">
                  {selectedProcedure?.requires_faces ? "obrigatório" : "opcional"}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2" data-testid="face-picker">
                {availableFaces.map((code) => {
                  const active = selectedFaces.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleFace(code)}
                      disabled={disabled}
                      data-testid={`face-toggle-${code}`}
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-xs transition-all",
                        active
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground",
                        disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <span className="text-sm font-semibold">{code}</span>
                      <span className="text-[10px]">{FACE_NAMES[code]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalhes clínicos, indicações, materiais…"
                disabled={disabled}
                rows={3}
                data-testid="notes-input"
              />
            </div>

            {addMutation.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {getErrorMessage(addMutation.error, "Não foi possível registrar o procedimento.")}
                </AlertDescription>
              </Alert>
            )}

            {addMutation.isSuccess && (
              <Alert variant="success">
                <AlertDescription>
                  Procedimento adicionado ao odontograma.
                </AlertDescription>
              </Alert>
            )}

            {/* Hidden submit — actual button is on the footer for stickiness */}
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>
        </section>
      </div>

      <SheetFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
        >
          Fechar
        </Button>
        <Button
          type="button"
          onClick={(e) => {
            const form = (e.currentTarget.closest("[role='dialog']") as HTMLElement | null)?.querySelector(
              "[data-testid='add-procedure-form']",
            ) as HTMLFormElement | null;
            form?.requestSubmit();
          }}
          disabled={!canSubmit}
          variant="accent"
          data-testid="add-procedure-submit"
        >
          {addMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Registrando…
            </>
          ) : (
            <>
              Adicionar procedimento
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </SheetFooter>
    </>
  );
}
