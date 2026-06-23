import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Ban,
  Check,
  Loader2,
  ReceiptText,
  ShieldCheck,
  X,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { quotesService } from "@/services/quotes.service";
import type { QuoteItem } from "@/types/api";

import {
  QuoteItemStatusBadge,
  QuoteStatusBadge,
  formatBRL,
} from "./quote-status";
import { QuotePdfDialog } from "./QuotePdfDialog";
import { WhatsAppQuoteButton } from "./WhatsAppQuoteButton";
import { patientsService } from "@/services/patients.service";
import { useAuthStore } from "@/store/auth";

interface QuoteDetailProps {
  quoteId: string;
  patientId: string;
  onBack: () => void;
  disabled?: boolean;
}

export function QuoteDetail({
  quoteId,
  patientId,
  onBack,
  disabled = false,
}: QuoteDetailProps) {
  const queryClient = useQueryClient();

  const quoteQuery = useQuery({
    queryKey: ["quote", quoteId],
    queryFn: () => quotesService.get(quoteId),
    enabled: !!quoteId,
  });

  // Patient + clinic data drive the WhatsApp message + PDF header.
  const patientQuery = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => patientsService.get(patientId),
    enabled: !!patientId,
    staleTime: 60_000,
  });
  const clinic = useAuthStore((s) => s.clinic);

  // ── Mutations ────────────────────────────────────────────────────────────
  // After a per-item approval, the backend automatically flips the underlying
  // ToothProcedure to `to_execute`. So we MUST invalidate ["odontogram", patientId]
  // so the chart repaints those teeth in tech-blue immediately.
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
    queryClient.invalidateQueries({
      queryKey: ["quotes", { patient_id: patientId }],
    });
    queryClient.invalidateQueries({ queryKey: ["odontogram", patientId] });
  };

  const approveItem = useMutation({
    mutationFn: (itemId: string) =>
      quotesService.approveItem(quoteId, itemId),
    onSuccess: invalidateAll,
  });

  const rejectItem = useMutation({
    mutationFn: (itemId: string) =>
      quotesService.rejectItem(quoteId, itemId, {}),
    onSuccess: invalidateAll,
  });

  const approveAll = useMutation({
    mutationFn: () => quotesService.approveQuote(quoteId),
    onSuccess: invalidateAll,
  });

  const cancelQuote = useMutation({
    mutationFn: () => quotesService.cancel(quoteId, {}),
    onSuccess: invalidateAll,
  });

  // Track which item is currently mutating (for spinner state).
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  function handleApprove(item: QuoteItem) {
    setPendingItemId(item.id);
    approveItem.mutate(item.id, {
      onSettled: () => setPendingItemId(null),
    });
  }

  function handleReject(item: QuoteItem) {
    setPendingItemId(item.id);
    rejectItem.mutate(item.id, {
      onSettled: () => setPendingItemId(null),
    });
  }

  const quote = quoteQuery.data;
  const pendingCount = useMemo(
    () => (quote?.items ?? []).filter((i) => i.status === "pending").length,
    [quote],
  );

  if (quoteQuery.isLoading) {
    return <DetailSkeleton onBack={onBack} />;
  }

  if (quoteQuery.isError || !quote) {
    return (
      <div className="space-y-4">
        <BackButton onBack={onBack} />
        <Alert variant="destructive">
          <AlertDescription>
            Não foi possível carregar o orçamento.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isQuoteTerminal =
    quote.status === "cancelled" ||
    quote.status === "expired" ||
    quote.status === "rejected" ||
    quote.status === "approved";

  return (
    <div data-testid={`quote-detail-${quote.id}`} className="space-y-5">
      <BackButton onBack={onBack} />

      {/* Header card */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono text-lg font-semibold tracking-tight text-foreground">
                  {quote.number}
                </h2>
                <QuoteStatusBadge status={quote.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Criado em{" "}
                {format(new Date(quote.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
                {quote.valid_until && (
                  <>
                    {" · válido até "}
                    {format(new Date(quote.valid_until), "d MMM yyyy", { locale: ptBR })}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Total
            </span>
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatBRL(quote.total)}
            </span>
            {Number(quote.discount_amount) > 0 && (
              <span className="text-[11px] text-muted-foreground">
                Subtotal {formatBRL(quote.subtotal)} · Desconto −{" "}
                {formatBRL(quote.discount_amount)}
              </span>
            )}
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              <WhatsAppQuoteButton
                patient={patientQuery.data}
                clinic={clinic}
                quote={quote}
              />
              <QuotePdfDialog quote={quote} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item-level approval */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Procedimento</TableHead>
              <TableHead>Dente / Faces</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px] text-right">Decisão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quote.items.map((item) => {
              const isPending = item.status === "pending";
              const isThisMutating = pendingItemId === item.id;
              return (
                <TableRow
                  key={item.id}
                  data-testid={`quote-item-row-${item.id}`}
                  className={cn(
                    "hover:bg-secondary/30",
                    item.status === "approved" && "bg-success/5",
                    item.status === "rejected" && "bg-rose-50/40",
                  )}
                >
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">
                      {item.procedure_name_snapshot}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {item.procedure_code_snapshot}
                      {item.description ? ` · ${item.description}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.tooth_fdi ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {item.tooth_fdi}
                        </Badge>
                        {item.faces.length > 0 && (
                          <span className="font-medium">
                            {item.faces.join(" · ")}
                          </span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-foreground">
                    {formatBRL(item.line_total)}
                  </TableCell>
                  <TableCell>
                    <QuoteItemStatusBadge status={item.status} />
                    {item.status === "rejected" && item.rejection_reason && (
                      <p
                        className="mt-1 max-w-[180px] truncate text-[10px] italic text-rose-500"
                        title={item.rejection_reason}
                      >
                        “{item.rejection_reason}”
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isPending && !disabled ? (
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleReject(item)}
                          disabled={isThisMutating}
                          aria-label="Rejeitar"
                          data-testid={`reject-item-${item.id}`}
                          className={cn(
                            "h-8 w-8 rounded-md border border-transparent text-muted-foreground",
                            "transition-all duration-150",
                            "hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600",
                            "active:scale-[0.96]",
                          )}
                        >
                          {isThisMutating && rejectItem.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleApprove(item)}
                          disabled={isThisMutating}
                          aria-label="Aprovar"
                          data-testid={`approve-item-${item.id}`}
                          className={cn(
                            "h-8 w-8 rounded-md border border-transparent text-muted-foreground",
                            "transition-all duration-150",
                            "hover:border-success/30 hover:bg-success/10 hover:text-success",
                            "active:scale-[0.96]",
                          )}
                        >
                          {isThisMutating && approveItem.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        {item.decided_at &&
                          format(new Date(item.decided_at), "d MMM HH:mm", {
                            locale: ptBR,
                          })}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={2} className="text-xs text-muted-foreground">
                {quote.items.length} item{quote.items.length === 1 ? "" : "s"} ·{" "}
                {pendingCount} pendente{pendingCount === 1 ? "" : "s"}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {formatBRL(quote.total)}
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      {/* Quote-level error reporting */}
      {(approveItem.error || rejectItem.error || approveAll.error || cancelQuote.error) && (
        <Alert variant="destructive">
          <AlertDescription>
            {getErrorMessage(
              approveItem.error ?? rejectItem.error ?? approveAll.error ?? cancelQuote.error,
              "Operação não pôde ser concluída.",
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Bulk actions */}
      {!isQuoteTerminal && !disabled && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-success" />
            Itens aprovados aqui passam automaticamente para{" "}
            <span className="font-medium text-foreground">A executar</span> no odontograma.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => cancelQuote.mutate()}
              disabled={cancelQuote.isPending}
              data-testid="cancel-quote-button"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              {cancelQuote.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ban className="h-3.5 w-3.5" />
              )}
              Cancelar orçamento
            </Button>
            {pendingCount > 0 && (
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={() => approveAll.mutate()}
                disabled={approveAll.isPending}
                data-testid="approve-all-button"
              >
                {approveAll.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Aprovar todos pendentes ({pendingCount})
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      data-testid="back-to-quotes-list"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Voltar para orçamentos
    </button>
  );
}

function DetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-5">
      <BackButton onBack={onBack} />
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}
