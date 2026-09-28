import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarClock,
  DollarSign,
  ReceiptText,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { billingService } from "@/services/billing.service";
import { dashboardService } from "@/services/dashboard.service";
import { useAuthStore } from "@/store/auth";
import type { AppointmentStatus } from "@/types/api";

function greetingPrefix(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatBRL(value: string): string {
  const n = Number(value ?? 0);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  waiting_room: "Sala de espera",
  in_progress: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou",
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const clinic = useAuthStore((s) => s.clinic);

  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () => dashboardService.overview(),
  });

  const billingQuery = useQuery({
    queryKey: ["billing", "status"],
    queryFn: () => billingService.getStatus(),
    retry: false,
  });

  const data = overviewQuery.data;
  const firstName =
    data?.greeting_name || user?.full_name?.split(" ")[0] || "doutor(a)";

  const billing = billingQuery.data;
  const trialDaysLeft =
    billing?.is_trialing && billing?.trial_ends_at
      ? Math.max(
          0,
          Math.ceil(
            (new Date(billing.trial_ends_at).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;
  const showTrialBanner =
    billing?.subscription_status === "trialing" && trialDaysLeft !== null;

  return (
    <div className="mx-auto max-w-6xl space-y-6" data-testid="dashboard-page">
      {/* Trial banner */}
      {showTrialBanner && (
        <div
          data-testid="trial-banner"
          className="flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            <span>
              Seu período de teste termina em{" "}
              <strong>
                {trialDaysLeft} {trialDaysLeft === 1 ? "dia" : "dias"}
              </strong>
              .
            </span>
          </div>
          <Button asChild variant="accent" size="sm">
            <Link to="/settings/billing">Assinar agora</Link>
          </Button>
        </div>
      )}

      {/* Header */}
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          {clinic?.trade_name ?? "Clínica"}
        </p>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">
          {greetingPrefix()}, {firstName}.
        </h1>
        <p className="text-sm text-muted-foreground">
          Aqui está o resumo da sua clínica hoje.
        </p>
      </header>

      {/* KPI cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          Icon={CalendarClock}
          label="Consultas hoje"
          value={overviewQuery.isLoading ? null : String(data?.appointments_today_count ?? 0)}
          testId="kpi-appointments-today"
        />
        <KpiCard
          Icon={Users}
          label="Pacientes ativos"
          value={overviewQuery.isLoading ? null : String(data?.patients_total ?? 0)}
          hint={
            data ? `+${data.patients_new_this_month} este mês` : undefined
          }
          testId="kpi-patients-total"
        />
        <KpiCard
          Icon={DollarSign}
          label="Faturamento do mês"
          value={
            overviewQuery.isLoading
              ? null
              : formatBRL(data?.quotes_month_amount ?? "0")
          }
          hint={
            data ? `${data.quotes_month_approved} orçamentos aprovados` : undefined
          }
          testId="kpi-month-amount"
        />
        <KpiCard
          Icon={ReceiptText}
          label="Orçamentos pendentes"
          value={overviewQuery.isLoading ? null : String(data?.pending_quotes_count ?? 0)}
          testId="kpi-pending-quotes"
        />
      </section>

      {/* Detail grid */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Agenda de hoje */}
        <Card data-testid="card-agenda-today">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Agenda de hoje</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/agenda" className="inline-flex items-center gap-1 text-xs">
                Ver agenda completa
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (data?.appointments_today_list.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma consulta agendada para hoje.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data!.appointments_today_list.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {a.patient_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.starts_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {STATUS_LABEL[a.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top 5 procedimentos */}
        <Card data-testid="card-top-procedures">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Top 5 procedimentos do mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (data?.procedures_top_5.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sem procedimentos orçados este mês.
              </p>
            ) : (
              <ul className="space-y-3">
                {(() => {
                  const max = Math.max(
                    ...data!.procedures_top_5.map((p) => p.count),
                    1,
                  );
                  return data!.procedures_top_5.map((p) => (
                    <li key={p.procedure_name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate pr-2 font-medium text-foreground">
                          {p.procedure_name}
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          {p.count}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${(p.count / max) * 100}%` }}
                        />
                      </div>
                    </li>
                  ));
                })()}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Pending quotes CTA */}
      <Card data-testid="card-pending-quotes">
        <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Orçamentos aguardando aprovação
              </p>
              <p className="text-xs text-muted-foreground">
                {overviewQuery.isLoading
                  ? "Carregando…"
                  : `${data?.pending_quotes_count ?? 0} orçamento(s) pendente(s)`}
              </p>
            </div>
          </div>
          <Button asChild variant="accent" size="sm">
            <Link to="/finance/quotes">Ver orçamentos</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  Icon,
  label,
  value,
  hint,
  testId,
}: {
  Icon: typeof Users;
  label: string;
  value: string | null;
  hint?: string;
  testId?: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {value === null ? (
          <Skeleton className="mt-3 h-8 w-24" />
        ) : (
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        )}
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
