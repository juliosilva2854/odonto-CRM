import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Ban, Loader2, LogIn, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { agendaService } from "@/services/agenda.service";
import type { AppointmentBoardItem, AppointmentStatus } from "@/types/api";

type QuickAction = "checkin" | "cancelled" | "no_show";

/** Mirrors backend ALLOWED_TRANSITIONS (agenda/enums.py) for the quick actions. */
const ACTION_ALLOWED_FROM: Record<QuickAction, AppointmentStatus[]> = {
  checkin: ["scheduled", "confirmed"],
  no_show: ["scheduled", "confirmed"],
  cancelled: ["scheduled", "confirmed", "waiting_room", "in_progress"],
};

const SUCCESS_TITLE: Record<QuickAction, string> = {
  checkin: "Check-in realizado",
  cancelled: "Agendamento cancelado",
  no_show: "Marcado como não compareceu",
};

const TERMINAL: AppointmentStatus[] = ["completed", "cancelled", "no_show"];

interface AppointmentStatusActionsProps {
  appointment: AppointmentBoardItem;
  /** Called after a successful transition (parent refreshes the agenda). */
  onChanged?: (newStatus: AppointmentStatus) => void;
}

export function AppointmentStatusActions({
  appointment,
  onChanged,
}: AppointmentStatusActionsProps) {
  // Terminal actions (cancel / no-show) need an explicit second click.
  const [confirming, setConfirming] = useState<Exclude<QuickAction, "checkin"> | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    setConfirming(null);
    setReason("");
  }, [appointment.id, appointment.status]);

  const mutation = useMutation({
    mutationFn: async (action: QuickAction): Promise<AppointmentStatus> => {
      if (action === "checkin") {
        await agendaService.checkinManual(appointment.id);
        return "waiting_room";
      }
      const updated = await agendaService.changeStatus(
        appointment.id,
        action,
        action === "cancelled" ? reason.trim() : null,
      );
      return updated.status;
    },
    onSuccess: (newStatus, action) => {
      toast({
        variant: "success",
        title: SUCCESS_TITLE[action],
        description: appointment.patient_name,
      });
      setConfirming(null);
      setReason("");
      onChanged?.(newStatus);
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: "Não foi possível atualizar o agendamento",
        description: getErrorMessage(err, "Tente novamente."),
      }),
  });

  const can = (action: QuickAction) =>
    ACTION_ALLOWED_FROM[action].includes(appointment.status);
  const busy = mutation.isPending;
  const runningAction = busy ? mutation.variables : null;

  if (TERMINAL.includes(appointment.status)) {
    return (
      <section aria-label="Ações rápidas" className="space-y-2">
        <p className="text-sm font-medium text-foreground">Ações rápidas</p>
        <p
          className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground"
          data-testid="status-actions-closed"
        >
          Agendamento encerrado — nenhuma ação disponível.
        </p>
      </section>
    );
  }

  const spinnerOr = (action: QuickAction, icon: React.ReactNode) =>
    runningAction === action ? <Loader2 className="h-4 w-4 animate-spin" /> : icon;

  return (
    <section aria-label="Ações rápidas" className="space-y-2">
      <p className="text-sm font-medium text-foreground">Ações rápidas</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!can("checkin") || busy}
          title={can("checkin") ? "Registrar chegada e mover para a sala de espera" : "Check-in já realizado ou indisponível"}
          onClick={() => {
            setConfirming(null);
            mutation.mutate("checkin");
          }}
          data-testid="status-action-checkin"
          className="border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100"
        >
          {spinnerOr("checkin", <LogIn className="h-4 w-4" />)}
          Check-in
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!can("cancelled") || busy}
          onClick={() => setConfirming(confirming === "cancelled" ? null : "cancelled")}
          aria-pressed={confirming === "cancelled"}
          data-testid="status-action-cancel"
          className={cn(
            "border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50",
            confirming === "cancelled" && "bg-rose-50 ring-1 ring-rose-300",
          )}
        >
          {spinnerOr("cancelled", <Ban className="h-4 w-4" />)}
          Cancelar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!can("no_show") || busy}
          title={can("no_show") ? undefined : "Disponível apenas antes do check-in"}
          onClick={() => setConfirming(confirming === "no_show" ? null : "no_show")}
          aria-pressed={confirming === "no_show"}
          data-testid="status-action-no-show"
          className={cn(
            "text-muted-foreground hover:text-foreground",
            confirming === "no_show" && "bg-secondary ring-1 ring-border",
          )}
        >
          {spinnerOr("no_show", <UserX className="h-4 w-4" />)}
          Não Compareceu
        </Button>
      </div>

      {confirming && (
        <div
          className={cn(
            "space-y-2 rounded-md border p-3",
            confirming === "cancelled"
              ? "border-rose-200 bg-rose-50/60"
              : "border-border bg-secondary/50",
          )}
          data-testid="status-action-confirm-panel"
        >
          <p className="text-xs text-foreground">
            {confirming === "cancelled"
              ? "Confirmar o cancelamento? O horário será liberado na agenda."
              : "Confirmar que o paciente não compareceu? Esta ação encerra o agendamento."}
          </p>
          {confirming === "cancelled" && (
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo (opcional)"
              maxLength={300}
              className="h-8 bg-background text-xs"
              data-testid="status-action-reason"
            />
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfirming(null)}
            >
              Voltar
            </Button>
            <Button
              type="button"
              size="sm"
              variant={confirming === "cancelled" ? "destructive" : "default"}
              disabled={busy}
              onClick={() => mutation.mutate(confirming)}
              data-testid="status-action-confirm"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirming === "cancelled" ? "Confirmar cancelamento" : "Confirmar não comparecimento"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
