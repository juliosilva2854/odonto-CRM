import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  LogIn,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  formatDate,
  formatDateTime,
  useImpersonate,
} from "@/pages/admin/shared";
import type { BillingEventStatus } from "@/types/api";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function EventBadge({ status }: { status: BillingEventStatus }) {
  const variant =
    status === "processed"
      ? "success"
      : status === "failed"
        ? "destructive"
        : status === "ignored"
          ? "outline"
          : "warning";
  return <Badge variant={variant}>{status}</Badge>;
}

export default function AdminClinicDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const impersonate = useImpersonate();
  const [confirmImpersonate, setConfirmImpersonate] = useState(false);

  const clinicQuery = useQuery({
    queryKey: ["admin", "clinic", id],
    queryFn: () => adminService.getClinic(id),
    enabled: Boolean(id),
  });
  const eventsQuery = useQuery({
    queryKey: ["admin", "clinic", id, "billing-events"],
    queryFn: () => adminService.listBillingEvents(id, 20),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "clinic", id] });
    qc.invalidateQueries({ queryKey: ["admin", "clinics"] });
  };
  const onError = (err: unknown) =>
    toast({
      variant: "destructive",
      title: "Ação não concluída",
      description: getErrorMessage(err, "Tente novamente."),
    });

  const extend = useMutation({
    mutationFn: () => adminService.extendTrial(id, 7),
    onSuccess: () => {
      toast({ variant: "success", title: "Trial estendido por 7 dias" });
      invalidate();
    },
    onError,
  });
  const suspend = useMutation({
    mutationFn: () => adminService.suspend(id),
    onSuccess: () => {
      toast({ variant: "success", title: "Clínica suspensa" });
      invalidate();
    },
    onError,
  });
  const reactivate = useMutation({
    mutationFn: () => adminService.reactivate(id),
    onSuccess: () => {
      toast({ variant: "success", title: "Clínica reativada" });
      invalidate();
    },
    onError,
  });

  const c = clinicQuery.data;

  return (
    <div className="space-y-6" data-testid="admin-clinic-detail">
      <button
        onClick={() => navigate("/admin/clinics")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent"
        data-testid="detail-back"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para clínicas
      </button>

      {clinicQuery.isLoading ? (
        <Card className="p-6">
          <Skeleton className="h-8 w-64" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </Card>
      ) : clinicQuery.isError || !c ? (
        <Alert variant="destructive">
          <AlertDescription>
            Não foi possível carregar a clínica.{" "}
            <Link to="/admin/clinics" className="underline">
              Voltar
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {c.trade_name}
                </h1>
                <SubStatusBadge status={c.subscription_status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{c.legal_name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={extend.isPending}
                onClick={() => extend.mutate()}
                data-testid="detail-extend"
              >
                <Clock className="h-4 w-4" /> Estender +7d
              </Button>
              {c.subscription_status === "canceled" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reactivate.isPending}
                  onClick={() => reactivate.mutate()}
                  data-testid="detail-reactivate"
                >
                  <CheckCircle2 className="h-4 w-4" /> Reativar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={suspend.isPending}
                  onClick={() => suspend.mutate()}
                  data-testid="detail-suspend"
                >
                  <Ban className="h-4 w-4" /> Suspender
                </Button>
              )}
              <Button
                variant="accent"
                size="sm"
                onClick={() => setConfirmImpersonate(true)}
                data-testid="detail-impersonate"
              >
                <LogIn className="h-4 w-4" /> Impersonar
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-2 text-sm font-semibold text-foreground">
                Dados da clínica
              </h2>
              <InfoRow label="CNPJ" value={c.cnpj} />
              <InfoRow label="Plano" value={<span className="capitalize">{c.plan}</span>} />
              <InfoRow label="Admin" value={c.admin_email ?? "—"} />
              <InfoRow label="Usuários" value={c.users_count} />
              <InfoRow label="Pacientes" value={c.patients_count} />
              <InfoRow label="Trial termina" value={formatDate(c.trial_ends_at)} />
              <InfoRow label="Período atual até" value={formatDate(c.current_period_end)} />
              <InfoRow label="Criada em" value={formatDate(c.created_at)} />
              <InfoRow
                label="Stripe"
                value={
                  c.stripe_customer_linked ? (
                    <Badge variant="success">Vinculado</Badge>
                  ) : (
                    <Badge variant="outline">Não vinculado</Badge>
                  )
                }
              />
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  Últimos eventos de cobrança
                </h2>
              </div>
              {eventsQuery.isLoading ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : !eventsQuery.data || eventsQuery.data.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Nenhum evento de cobrança registrado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Quando</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventsQuery.data.map((ev) => (
                      <TableRow key={ev.id} data-testid={`billing-event-${ev.id}`}>
                        <TableCell className="font-medium text-foreground">
                          {ev.event_type}
                        </TableCell>
                        <TableCell>
                          <EventBadge status={ev.status} />
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDateTime(ev.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        </>
      )}

      <Dialog open={confirmImpersonate} onOpenChange={setConfirmImpersonate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" /> Impersonar clínica
            </DialogTitle>
            <DialogDescription>
              Você vai operar o sistema como <strong>administrador desta
              clínica</strong>. Seus acessos ficam registrados para auditoria e a
              sessão de plataforma será substituída. Para voltar ao painel da
              plataforma, basta sair e entrar novamente como super admin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmImpersonate(false)}>
              Cancelar
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                setConfirmImpersonate(false);
                impersonate(id);
              }}
              data-testid="confirm-impersonate"
            >
              <LogIn className="h-4 w-4" /> Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(extend.isPending || suspend.isPending || reactivate.isPending) && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm text-white shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" /> Processando…
        </div>
      )}
    </div>
  );
}
