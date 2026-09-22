import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PLANS, PLAN_MAP, planLabel } from "@/lib/plans";
import { billingService } from "@/services/billing.service";
import type { BillingStatus, PlanTier } from "@/types/api";

function daysUntil(iso: string | null): number {
  if (!iso) return 0;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function BillingPage() {
  const [params] = useSearchParams();
  const blocked = params.get("reason") === "blocked";

  const statusQuery = useQuery({
    queryKey: ["billing", "status"],
    queryFn: () => billingService.getStatus(),
  });

  const checkout = useMutation({
    mutationFn: (plan: PlanTier) => billingService.createCheckout(plan),
    onSuccess: ({ checkout_url }) => {
      window.location.href = checkout_url;
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: "Não foi possível iniciar o checkout",
        description: getErrorMessage(err, "Tente novamente em instantes."),
      }),
  });

  const portal = useMutation({
    mutationFn: () => billingService.createPortal(),
    onSuccess: ({ portal_url }) => {
      window.open(portal_url, "_blank", "noopener,noreferrer");
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: "Não foi possível abrir o portal",
        description: getErrorMessage(err, "Tente novamente em instantes."),
      }),
  });

  const status = statusQuery.data;
  const pendingPlan = checkout.isPending ? checkout.variables : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="billing-page">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Configurações
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Assinatura &amp; Plano
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seu plano, período de teste e pagamentos.
        </p>
      </header>

      {blocked && (
        <Alert variant="destructive" data-testid="billing-blocked-alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Sua assinatura está inativa. Regularize o pagamento para continuar
            usando todos os recursos.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Status card ─────────────────────────────────────── */}
      {statusQuery.isLoading ? (
        <Card className="p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-3 h-4 w-64" />
        </Card>
      ) : status ? (
        <StatusCard
          status={status}
          blocked={blocked}
          onSubscribe={(plan) => checkout.mutate(plan)}
          onPortal={() => portal.mutate()}
          portalPending={portal.isPending}
          checkoutPending={checkout.isPending}
        />
      ) : (
        <Card className="p-6 text-sm text-muted-foreground">
          Não foi possível carregar o status da assinatura.
        </Card>
      )}

      {/* ── Plans grid ──────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Planos
        </h2>
        <div className="grid gap-4 md:grid-cols-3" data-testid="billing-plans">
          {PLANS.map((p) => {
            const isCurrent = status?.plan === p.tier;
            const paidActive = status?.subscription_status === "active";
            const currentPrice = status
              ? PLAN_MAP[(status.plan as PlanTier)]?.priceMonthly ?? 0
              : 0;

            let cta = "Assinar";
            if (paidActive && !isCurrent) {
              cta = p.priceMonthly > currentPrice ? "Fazer upgrade" : "Fazer downgrade";
            }

            return (
              <Card
                key={p.tier}
                className={cn(
                  "relative flex flex-col p-5",
                  p.highlight && "border-accent/50 shadow-glow",
                  isCurrent && "ring-2 ring-accent",
                )}
                data-testid={`billing-plan-${p.tier}`}
              >
                {p.highlight && !isCurrent && (
                  <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                    <Sparkles className="h-3 w-3" /> Mais escolhido
                  </span>
                )}
                {isCurrent && (
                  <Badge variant="accent" className="absolute -top-2.5 left-5">
                    Plano atual
                  </Badge>
                )}

                <div className="mb-3">
                  <p className="text-base font-semibold text-foreground">
                    {p.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.tagline}</p>
                </div>
                <div className="mb-4 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight text-foreground">
                    {p.priceLabel}
                  </span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>

                <ul className="mb-5 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isCurrent ? "outline" : p.highlight ? "accent" : "default"}
                  className="w-full"
                  disabled={
                    (isCurrent && paidActive) ||
                    checkout.isPending
                  }
                  onClick={() => checkout.mutate(p.tier)}
                  data-testid={`billing-subscribe-${p.tier}`}
                >
                  {pendingPlan === p.tier ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Redirecionando…
                    </>
                  ) : isCurrent && paidActive ? (
                    "Plano atual"
                  ) : (
                    cta
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Billing history placeholder ─────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Histórico de cobrança
        </h2>
        <Card className="flex items-center justify-center p-10 text-sm text-muted-foreground">
          Em breve
        </Card>
      </div>
    </div>
  );
}

function StatusCard({
  status,
  blocked,
  onSubscribe,
  onPortal,
  portalPending,
  checkoutPending,
}: {
  status: BillingStatus;
  blocked: boolean;
  onSubscribe: (plan: PlanTier) => void;
  onPortal: () => void;
  portalPending: boolean;
  checkoutPending: boolean;
}) {
  const trialDays = daysUntil(status.trial_ends_at);
  const trialUrgent = trialDays < 3;
  const planTier = status.plan as PlanTier;

  const config = useMemo(() => {
    switch (status.subscription_status) {
      case "trialing":
        return {
          icon: <Clock className="h-5 w-5" />,
          tone: trialUrgent
            ? "bg-destructive/10 text-destructive"
            : "bg-warning/10 text-amber-600",
          badge: (
            <Badge variant={trialUrgent ? "destructive" : "warning"}>
              Trial — {trialDays} {trialDays === 1 ? "dia restante" : "dias restantes"}
            </Badge>
          ),
          title: "Período de teste",
          desc: `Seu trial termina em ${formatDate(status.trial_ends_at)}.`,
          action: (
            <Button
              variant="accent"
              onClick={() => onSubscribe(planTier)}
              disabled={checkoutPending}
              data-testid="status-subscribe"
            >
              <CreditCard className="h-4 w-4" /> Assinar agora
            </Button>
          ),
        };
      case "active":
        return {
          icon: <CheckCircle2 className="h-5 w-5" />,
          tone: "bg-success/10 text-success",
          badge: <Badge variant="success">Ativo</Badge>,
          title: `Plano ${planLabel(status.plan)}`,
          desc: status.current_period_end
            ? `Renova em ${formatDate(status.current_period_end)}.`
            : "Assinatura ativa.",
          action: (
            <Button
              variant="outline"
              onClick={onPortal}
              disabled={portalPending}
              data-testid="status-portal"
            >
              {portalPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
              Gerenciar assinatura
            </Button>
          ),
        };
      case "past_due":
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          tone: "bg-destructive/10 text-destructive",
          badge: <Badge variant="destructive">Pagamento pendente</Badge>,
          title: "Regularize seu pagamento",
          desc: "Detectamos uma falha na cobrança. Atualize sua forma de pagamento.",
          action: (
            <Button
              variant="destructive"
              onClick={onPortal}
              disabled={portalPending}
              data-testid="status-regularize"
            >
              <CreditCard className="h-4 w-4" /> Regularizar
            </Button>
          ),
        };
      case "canceled":
      default:
        return {
          icon: <XCircle className="h-5 w-5" />,
          tone: "bg-secondary text-muted-foreground",
          badge: <Badge variant="default">Cancelado</Badge>,
          title: "Assinatura cancelada",
          desc: "Reative para voltar a usar todos os recursos.",
          action: (
            <Button
              variant="accent"
              onClick={() => onSubscribe(planTier)}
              disabled={checkoutPending}
              data-testid="status-reactivate"
            >
              <CreditCard className="h-4 w-4" /> Reativar assinatura
            </Button>
          ),
        };
    }
  }, [status, trialDays, trialUrgent, planTier, onSubscribe, onPortal, portalPending, checkoutPending]);

  return (
    <Card
      className={cn(
        "flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between",
        blocked && "border-destructive ring-1 ring-destructive",
      )}
      data-testid="billing-status-card"
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            config.tone,
          )}
        >
          {config.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {config.title}
            </h3>
            {config.badge}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{config.desc}</p>
        </div>
      </div>
      <div className="shrink-0">{config.action}</div>
    </Card>
  );
}
