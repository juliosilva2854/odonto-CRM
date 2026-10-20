import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, DoorOpen, Stethoscope, User } from "lucide-react";

import { AppointmentStatusActions } from "@/components/agenda/AppointmentStatusActions";
import { WhatsAppAppointmentButton } from "@/components/agenda/WhatsAppAppointmentButton";
import { APPOINTMENT_STATUS_VISUAL } from "@/components/agenda/appointment-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  AppointmentBoardItem,
  AppointmentStatus,
  SendWhatsAppResponse,
  WhatsAppTemplate,
} from "@/types/api";

const TEMPLATE_OPTIONS: {
  value: WhatsAppTemplate;
  label: string;
  hint: string;
}[] = [
  {
    value: "confirmation",
    label: "Confirmação",
    hint: "Pede para o paciente confirmar a presença",
  },
  {
    value: "reminder",
    label: "Lembrete",
    hint: "Lembrete com orientação de chegar antes",
  },
  {
    value: "checkin",
    label: "Check-in (PIN)",
    hint: "Envia o PIN para o check-in no totem",
  },
];

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const DISABLED_REASON =
  "Disponível apenas para agendamentos agendados ou confirmados.";

const MESSAGEABLE: AppointmentStatus[] = ["scheduled", "confirmed"];

interface AppointmentDetailDialogProps {
  appointment: AppointmentBoardItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a quick status action succeeds (parent refreshes the agenda). */
  onStatusChanged?: (newStatus: AppointmentStatus) => void;
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="break-words text-sm font-medium text-foreground">
          {children}
        </p>
      </div>
    </div>
  );
}

export function AppointmentDetailDialog({
  appointment,
  open,
  onOpenChange,
  onStatusChanged,
}: AppointmentDetailDialogProps) {
  const [template, setTemplate] = useState<WhatsAppTemplate>("confirmation");
  const [lastSent, setLastSent] = useState<SendWhatsAppResponse | null>(null);

  // Reset local state whenever another appointment is opened.
  useEffect(() => {
    setTemplate(
      appointment?.status === "confirmed" ? "reminder" : "confirmation",
    );
    setLastSent(null);
  }, [appointment?.id, appointment?.status]);

  if (!appointment) return null;

  const visual = APPOINTMENT_STATUS_VISUAL[appointment.status];
  const starts = new Date(appointment.starts_at);
  const ends = new Date(appointment.ends_at);
  const canMessage = MESSAGEABLE.includes(appointment.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] max-w-lg grid-rows-[auto_minmax(0,1fr)_auto]"
        data-testid="appointment-detail-dialog"
      >
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle data-testid="appointment-detail-patient">
              {appointment.patient_name}
            </DialogTitle>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                visual.badgeClass,
              )}
              data-testid="appointment-detail-status"
            >
              {visual.label}
            </span>
          </div>
          <DialogDescription>Detalhes do agendamento</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto px-6 pb-1">
          <div className="divide-y divide-border/60 rounded-lg border border-border px-4">
            <DetailRow icon={CalendarClock} label="Quando">
              {capitalizeFirst(
                format(starts, "EEEE, dd 'de' MMMM", { locale: ptBR }),
              )}
              {" · "}
              {format(starts, "HH:mm")}–{format(ends, "HH:mm")}
            </DetailRow>
            <DetailRow icon={Stethoscope} label="Profissional">
              {appointment.professional_name}
            </DetailRow>
            <DetailRow icon={DoorOpen} label="Sala">
              {appointment.room_name}
            </DetailRow>
            {appointment.procedure_hint && (
              <DetailRow icon={User} label="Procedimento">
                {appointment.procedure_hint}
              </DetailRow>
            )}
          </div>

          <AppointmentStatusActions
            appointment={appointment}
            onChanged={onStatusChanged}
          />

          <section className="space-y-2" aria-label="Mensagem de WhatsApp">
            <p className="text-sm font-medium text-foreground">
              Mensagem de WhatsApp
            </p>
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              role="radiogroup"
            >
              {TEMPLATE_OPTIONS.map((opt) => {
                const active = template === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    title={opt.hint}
                    disabled={!canMessage}
                    onClick={() => setTemplate(opt.value)}
                    data-testid={`whatsapp-template-${opt.value}`}
                    className={cn(
                      "rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      active
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-border bg-background text-muted-foreground hover:border-emerald-200 hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {!canMessage && (
              <p
                className="text-xs text-muted-foreground"
                data-testid="whatsapp-disabled-reason"
              >
                {DISABLED_REASON}
              </p>
            )}
            {lastSent && (
              <pre
                className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border border-emerald-100 bg-emerald-50/50 p-3 font-sans text-xs text-foreground"
                data-testid="whatsapp-last-message"
              >
                {lastSent.message}
              </pre>
            )}
          </section>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <WhatsAppAppointmentButton
            appointmentId={appointment.id}
            template={template}
            disabledReason={
              canMessage
                ? null
                : DISABLED_REASON
            }
            onSent={setLastSent}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
