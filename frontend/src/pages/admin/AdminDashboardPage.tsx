import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarClock,
  CircleDollarSign,
  Clock,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/api";
import { adminService } from "@/services/admin.service";
import {
  SubStatusBadge,
  daysUntil,
  formatBRL,
  formatDate,
} from "@/pages/admin/shared";

function Kpi({
  label,
  value,
  icon: Icon,
  tone = "default",
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "accent" | "success" | "warning" | "destructive";
  loading?: boolean;
}) {
  const toneClass = {
    default: "bg-muted text-foreground",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-amber-600",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const qc = useQueryClient();
  const metricsQuery = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: () => adminService.getMetrics(),
  });

  const extend = useMutation({
    mutationFn: (id: string) => adminService.extendTrial(id, 7),
    onSuccess: () => {
      toast({ variant: "success", title: "Trial estendido por 7 dias" });
      qc.invalidateQueries({ queryKey: ["admin", "metrics"] });
      qc.invalidateQueries({ queryKey: ["admin", "clinics"] });
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: "Não foi possível estender",
        description: getErrorMessage(err, "Tente novamente."),
      }),
  });

  const m = metricsQuery.data;
  const loading = metricsQuery.isLoading;

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Plataforma
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Visão geral
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Métricas agregadas de todas as clínicas da plataforma.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi label="Total de Clínicas" value={m?.total_clinics ?? 0} icon={Building2} loading={loading} />
        <Kpi label="Ativas" value={m?.active_clinics ?? 0} icon={Users} tone="success" loading={loading} />
        <Kpi label="Trials" value={m?.trialing_clinics ?? 0} icon={Clock} tone="accent" loading={loading} />
        <Kpi label="Past Due" value={m?.past_due_clinics ?? 0} icon={CalendarClock} tone="warning" loading={loading} />
        <Kpi label="MRR Estimado" value={formatBRL(m?.mrr_brl ?? 0)} icon={CircleDollarSign} tone="success" loading={loading} />
        <Kpi label="Trials Vencendo" value={m?.trials_expiring_count ?? 0} icon={TrendingUp} tone="destructive" loading={loading} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Trials vencendo em 7 dias
            </h2>
            <p className="text-xs text-muted-foreground">
              Clientes que podem precisar de atenção comercial.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !m || m.trials_expiring.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum trial vencendo nos próximos 7 dias.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clínica</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Vence em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.trials_expiring.map((c) => {
                const d = daysUntil(c.trial_ends_at);
                return (
                  <TableRow key={c.id} data-testid={`expiring-row-${c.id}`}>
                    <TableCell className="font-medium text-foreground">
                      <Link to={`/admin/clinics/${c.id}`} className="hover:text-accent">
                        {c.trade_name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{c.cnpj}</div>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">{c.plan}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(c.trial_ends_at)}
                      {d !== null && (
                        <span className="ml-1 text-xs text-amber-600">({d}d)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <SubStatusBadge status={c.subscription_status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={extend.isPending}
                        onClick={() => extend.mutate(c.id)}
                        data-testid={`extend-trial-${c.id}`}
                      >
                        {extend.isPending && extend.variables === c.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Estender"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
