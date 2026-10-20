import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Ban, CheckCircle2, Loader2, LogIn, PlayCircle, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { agendaService } from "@/services/agenda.service";
import type { AppointmentBoardItem, AppointmentStatus } from "@/types/api";

type QuickAction = "checkin" | "cancelled" | "no_show" | "in_progress" | "completed";

/** Mirrors backend ALLOWED_TRANSITIONS (agenda/enums.py) for the quick actions. */
const ACTION_ALLOWED_FROM: Record<QuickAction, AppointmentStatus[]> = {
  checkin: ["scheduled", "confirmed"],
  no_show: ["scheduled", "confirmed"],
  cancelled: ["scheduled", "confirmed", "waiting_room", "in_progress"],
  in_progress: ["waiting_room"],
  completed: ["in_progress"],
};

const SUCCESS_TITLE: Record<QuickAction, string> = {
  checkin: "Check-in realizado",
  cancelled: "Agendamento cancelado",
  no_show: "Marcado como não compareceu",
  in_progress: "Atendimento iniciado",
  completed: "Atendimento concluído",
};

/** Primary "next step" of the care flow, shown as a prominent button. */
const PRIMARY_ACTION: Partial<
  Record<
    AppointmentStatus,
    {
      action: "in_progress" | "completed";
      label: string;
      Icon: typeof PlayCircle;
      className: string;
      testId: string;
    }
  >
> = {
  waiting_room: {
    action: "in_progress",
    label: "Iniciar Atendimento",
    Icon: PlayCircle,
    className: "bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-300",
    testId: "status-action-start",
  },
  in_progress: {
    action: "completed",
    label: "Concluir Atendimento",
    Icon: CheckCircle2,
    className: "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-300",
    testId: "status-action-complete",
  },
};

const TERMINAL: AppointmentStatus[] = ["completed", "cancelled", "no_show"];

interface AppointmentStatusActionsProps {
  appointment: AppointmentBoardItem;
  /**
   * Called after every attempt (success OR error) so the parent re-syncs the
   * agenda — e.g. a 409 "check-in já realizado" means our local status is stale.
   */
  onChanged?: () => void;
}

export function AppointmentStatusActions({
  appointment,
  onChanged,
}: AppointmentStatusActionsProps) {
  // Terminal actions (cancel / no-show) need an explicit second click.
  const [confirming, setConfirming] = useState<"cancelled" | "no_show" | null>(null);

  useEffect(() => {
    setConfirming(null);
  }, [appointment.id, appointment.status]);

  const mutation = useMutation({
    mutationFn: async (action: QuickAction): Promise<AppointmentStatus> => {
      if (action === "checkin") {
        await agendaService.checkinManual(appointment.id);
        return "waiting_room";
      }
      const updated = await agendaService.changeStatus(appointment.id, action);
      return updated.status;
    },
    onSuccess: (_newStatus, action) => {
      toast({
        variant: "success",
        title: SUCCESS_TITLE[action],
        description: appointment.patient_name,
      });
      setConfirming(null);
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: "Não foi possível atualizar o agendamento",
        description: getErrorMessage(err, "Tente novamente."),
      }),
    onSettled: () => onChanged?.(),
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

  const primary = PRIMARY_ACTION[appointment.status];

  return (
    <section aria-label="Ações rápidas" className="space-y-2">
      <p className="text-sm font-medium text-foreground">Ações rápidas</p>

      {primary && (
        <Button
          type="button"
          disabled={busy}
          onClick={() => {
            setConfirming(null);
            mutation.mutate(primary.action);
          }}
          data-testid={primary.testId}
          className={cn(
            "w-full shadow-xs transition-all active:scale-[0.98]",
            primary.className,
          )}
        >
          {spinnerOr(primary.action, <primary.Icon className="h-4 w-4" />)}
          {primary.label}
        </Button>
      )}

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
