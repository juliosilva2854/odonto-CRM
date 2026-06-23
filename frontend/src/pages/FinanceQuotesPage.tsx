import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Receipt,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { patientsService } from "@/services/patients.service";
import { quotesService } from "@/services/quotes.service";
import type { Quote } from "@/types/api";
import {
  QuoteStatusBadge,
  formatBRL,
} from "@/components/quotes/quote-status";

export default function FinanceQuotesPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["quotes", "global", { page: 1, page_size: 100 }],
    queryFn: () => quotesService.list({ page: 1, page_size: 100 }),
  });

  const quotes = data?.items ?? [];

  // ── Metric aggregation (computed in-memory across the page window) ──────
  const metrics = useMemo(() => computeMetrics(quotes), [quotes]);

  // ── Client-side filtering (patient name resolved per row via React Query) ──
  const filteredQuotes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return quotes;
    return quotes.filter(
      (q) =>
        q.number.toLowerCase().includes(term) ||
        (q.notes ?? "").toLowerCase().includes(term),
    );
    // Patient name filter happens inside each row component (it has the data).
  }, [quotes, search]);

  return (
    <div className="mx-auto max-w-7xl space-y-8" data-testid="finance-quotes-page">
      {/* Page header */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Financeiro
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          Orçamentos
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Visualize todos os orçamentos da clínica, acompanhe conversão e faça
          follow-up de propostas pendentes.
        </p>
      </header>

      {/* Metrics row */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CalendarClock}
          label="Aguardando aprovação"
          value={metrics.pendingAmount}
          count={metrics.pendingCount}
          tone="accent"
          loading={isLoading}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Aprovados no mês"
          value={metrics.approvedMonthAmount}
          count={metrics.approvedMonthCount}
          tone="success"
          loading={isLoading}
        />
        <MetricCard
          icon={TrendingUp}
          label="Conversão (mês)"
          value={metrics.conversionRateLabel}
          count={metrics.approvedMonthCount + metrics.rejectedMonthCount}
          tone="info"
          loading={isLoading}
          isPercentage
        />
        <MetricCard
          icon={Banknote}
          label="Volume total"
          value={metrics.totalAmount}
          count={metrics.totalCount}
          tone="neutral"
          loading={isLoading}
        />
      </section>

      {/* Search */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder='Buscar por número (ORC-2026-X) ou nome do paciente…'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="quotes-search"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {data ? `${data.total} orçamento(s) no total` : "—"}
        </p>
      </section>

      {/* Table */}
      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Não foi possível carregar a lista de orçamentos.
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <QuotesTableSkeleton />
      ) : filteredQuotes.length === 0 ? (
        <EmptyState hasSearch={!!search.trim()} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Número</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.map((q) => (
                <QuoteRow key={q.id} quote={q} searchTerm={search} />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Row — lazily resolves patient name (React Query dedupes per id)
// ────────────────────────────────────────────────────────────────────

function QuoteRow({ quote, searchTerm }: { quote: Quote; searchTerm: string }) {
  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", quote.patient_id],
    queryFn: () => patientsService.get(quote.patient_id),
    enabled: !!quote.patient_id,
    staleTime: 60_000,
  });

  // If user is searching, hide rows whose patient name doesn't match either
  // (patient name is async — hide only after we have data).
  const term = searchTerm.trim().toLowerCase();
  if (term && patient && !quote.number.toLowerCase().includes(term)) {
    if (!patient.full_name.toLowerCase().includes(term)) {
      return null;
    }
  }

  return (
    <TableRow
      data-testid={`global-quote-row-${quote.id}`}
      className="group cursor-pointer"
    >
      <TableCell className="font-mono text-[12.5px] font-semibold text-foreground">
        <Link to={`/patients/${quote.patient_id}?tab=quotes&quote=${quote.id}`}>
          {quote.number}
        </Link>
      </TableCell>
      <TableCell>
        <Link
          to={`/patients/${quote.patient_id}`}
          className="text-sm font-medium text-foreground transition-colors hover:text-accent"
        >
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            patient?.full_name ?? "—"
          )}
        </Link>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {format(new Date(quote.created_at), "d MMM yyyy · HH:mm", {
          locale: ptBR,
        })}
      </TableCell>
      <TableCell className="text-sm">
        {quote.items.length}
        <span className="ml-1 text-muted-foreground">item(ns)</span>
      </TableCell>
      <TableCell className="text-right tabular-nums font-semibold text-foreground">
        {formatBRL(quote.total)}
      </TableCell>
      <TableCell>
        <QuoteStatusBadge status={quote.status} />
      </TableCell>
      <TableCell>
        <Link
          to={`/patients/${quote.patient_id}?tab=quotes&quote=${quote.id}`}
          aria-label="Abrir orçamento"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
        </Link>
      </TableCell>
    </TableRow>
  );
}

// ────────────────────────────────────────────────────────────────────
// MetricCard
// ────────────────────────────────────────────────────────────────────

type Tone = "accent" | "success" | "info" | "neutral";

const TONE_CLASSES: Record<Tone, { ring: string; iconBg: string; iconColor: string }> = {
  accent: {
    ring: "hover:shadow-glow",
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
  },
  success: {
    ring: "hover:shadow-soft",
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  info: {
    ring: "hover:shadow-soft",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  neutral: {
    ring: "hover:shadow-soft",
    iconBg: "bg-secondary",
    iconColor: "text-foreground",
  },
};

function MetricCard({
  icon: Icon,
  label,
  value,
  count,
  tone,
  loading,
  isPercentage = false,
}: {
  icon: typeof Sparkles;
  label: string;
  value: number | string;
  count: number;
  tone: Tone;
  loading?: boolean;
  isPercentage?: boolean;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <Card className={cn("transition-shadow", t.ring)} data-testid={`metric-${label}`}>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            t.iconBg,
            t.iconColor,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-1.5 h-7 w-28" />
          ) : (
            <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
              {isPercentage || typeof value === "string" ? value : formatBRL(value)}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            {count} orçamento{count === 1 ? "" : "s"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Metric computation
// ────────────────────────────────────────────────────────────────────

function computeMetrics(quotes: Quote[]) {
  let pendingAmount = 0;
  let pendingCount = 0;
  let approvedMonthAmount = 0;
  let approvedMonthCount = 0;
  let rejectedMonthCount = 0;
  let totalAmount = 0;

  for (const q of quotes) {
    const total = Number(q.total ?? 0);
    totalAmount += total;
    const createdInMonth = isThisMonth(new Date(q.created_at));

    if (q.status === "draft" || q.status === "sent" || q.status === "approved_partial") {
      pendingAmount += total;
      pendingCount += 1;
    }
    if (createdInMonth && (q.status === "approved" || q.status === "approved_partial")) {
      approvedMonthAmount += total;
      approvedMonthCount += 1;
    }
    if (createdInMonth && q.status === "rejected") {
      rejectedMonthCount += 1;
    }
  }

  const considered = approvedMonthCount + rejectedMonthCount;
  const conversionRateLabel =
    considered === 0
      ? "—"
      : `${Math.round((approvedMonthCount / considered) * 100)}%`;

  return {
    pendingAmount,
    pendingCount,
    approvedMonthAmount,
    approvedMonthCount,
    rejectedMonthCount,
    totalAmount,
    totalCount: quotes.length,
    conversionRateLabel,
  };
}

// ────────────────────────────────────────────────────────────────────
// Empty + skeleton
// ────────────────────────────────────────────────────────────────────

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center px-8 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <Receipt className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-foreground">
          {hasSearch
            ? "Nenhum orçamento corresponde à sua busca"
            : "Nenhum orçamento ainda na clínica"}
        </h3>
        <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
          {hasSearch
            ? "Tente buscar por outro número (ex: ORC-2026-1) ou nome do paciente."
            : "Os orçamentos são gerados a partir da página do paciente, na aba Orçamentos."}
        </p>
      </CardContent>
    </Card>
  );
}

function QuotesTableSkeleton() {
  return (
    <Card>
      <CardContent className="divide-y divide-border p-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="ml-auto h-5 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
