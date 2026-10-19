import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { toClinic } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/api";
import { adminService } from "@/services/admin.service";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth";
import type { SubscriptionStatus } from "@/types/api";

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: "Trial",
  active: "Ativa",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
};

export const STATUS_OPTIONS: { value: "" | SubscriptionStatus; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "trialing", label: "Trial" },
  { value: "active", label: "Ativa" },
  { value: "past_due", label: "Pagamento pendente" },
  { value: "canceled", label: "Cancelada" },
];

export function SubStatusBadge({ status }: { status: SubscriptionStatus }) {
  const variant =
    status === "active"
      ? "success"
      : status === "trialing"
        ? "accent"
        : status === "past_due"
          ? "warning"
          : "destructive";
  return <Badge variant={variant}>{STATUS_LABEL[status]}</Badge>;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Swaps the current (super-admin) session for an impersonation token scoped to
 * the clinic's admin, then lands on the clinic dashboard. React Query caches are
 * cleared so no cross-tenant data leaks between sessions.
 */
export function useImpersonate() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return async (clinicId: string) => {
    try {
      const res = await adminService.impersonate(clinicId);
      const store = useAuthStore.getState();
      store.setTokens(res.access_token, res.access_token);
      const me = await authService.me();
      store.setIdentity(me.user, toClinic(me));
      qc.clear();
      toast({
        variant: "success",
        title: "Operando como clínica",
        description: res.email,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Não foi possível impersonar",
        description: getErrorMessage(err, "Tente novamente."),
      });
    }
  };
}
