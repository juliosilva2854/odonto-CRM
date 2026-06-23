import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronRight, Inbox, Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { quotesService } from "@/services/quotes.service";

import { NewQuoteSheet } from "./NewQuoteSheet";
import { QuoteStatusBadge, formatBRL } from "./quote-status";

interface QuotesListProps {
  patientId: string;
  onSelectQuote: (id: string) => void;
  disabled?: boolean;
}

export function QuotesList({
  patientId,
  onSelectQuote,
  disabled = false,
}: QuotesListProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["quotes", { patient_id: patientId }],
    queryFn: () =>
      quotesService.list({ patient_id: patientId, page: 1, page_size: 50 }),
    enabled: !!patientId,
  });

  const quotes = data?.items ?? [];

  return (
    <div data-testid="quotes-list" className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Orçamentos do paciente
          </h2>
          <p className="text-xs text-muted-foreground">
            Snapshots de preço e comissão ficam congelados na criação de cada orçamento.
          </p>
        </div>
        <Button
          variant="accent"
          onClick={() => setSheetOpen(true)}
          disabled={disabled}
          data-testid="new-quote-button"
        >
          <Plus className="h-4 w-4" /> Novo orçamento
        </Button>
      </header>

      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Não foi possível carregar os orçamentos.
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="ml-auto h-5 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : quotes.length === 0 ? (
        <EmptyState onCreate={() => setSheetOpen(true)} disabled={disabled} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Número</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow
                  key={q.id}
                  onClick={() => onSelectQuote(q.id)}
                  className="cursor-pointer"
                  data-testid={`quote-row-${q.id}`}
                >
                  <TableCell className="font-mono text-[12.5px] font-semibold text-foreground">
                    {q.number}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(q.created_at), "d MMM yyyy · HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {q.items.length}
                    <span className="ml-1 text-muted-foreground">item(ns)</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-foreground">
                    {formatBRL(q.total)}
                  </TableCell>
                  <TableCell>
                    <QuoteStatusBadge status={q.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <NewQuoteSheet
        patientId={patientId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCreated={(quote) => {
          setSheetOpen(false);
          onSelectQuote(quote.id);
        }}
      />
    </div>
  );
}

function EmptyState({
  onCreate,
  disabled,
}: {
  onCreate: () => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center px-8 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <Inbox className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-foreground">
          Nenhum orçamento ainda
        </h3>
        <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
          Gere o primeiro orçamento a partir dos procedimentos planejados no odontograma.
        </p>
        <Button
          variant="accent"
          onClick={onCreate}
          disabled={disabled}
          className="mt-5"
          data-testid="new-quote-button-empty"
        >
          <Plus className="h-4 w-4" /> Criar primeiro orçamento
        </Button>
      </CardContent>
    </Card>
  );
}
