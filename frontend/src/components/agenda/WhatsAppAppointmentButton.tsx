import { useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { agendaService } from "@/services/agenda.service";
import type { SendWhatsAppResponse, WhatsAppTemplate } from "@/types/api";

interface WhatsAppAppointmentButtonProps
  extends Omit<ButtonProps, "onClick" | "children" | "variant"> {
  appointmentId: string;
  template?: WhatsAppTemplate;
  label?: string;
  /** Disabled reason shown as tooltip (e.g. appointment already finished). */
  disabledReason?: string | null;
  onSent?: (result: SendWhatsAppResponse) => void;
}

/**
 * WhatsApp Click-to-Chat for appointments — same emerald visual as
 * `WhatsAppQuoteButton`, but the pt-BR message is rendered by the backend
 * (`POST /api/agenda/appointments/{id}/send-whatsapp`), which also audits the
 * use of the patient's phone (LGPD).
 *
 * Popup-blocker safe: a blank tab is opened synchronously on click and then
 * redirected to wa.me once the API answers.
 */
export function WhatsAppAppointmentButton({
  appointmentId,
  template = "confirmation",
  label = "Enviar WhatsApp",
  disabledReason,
  onSent,
  className,
  disabled,
  ...rest
}: WhatsAppAppointmentButtonProps) {
  const [pending, setPending] = useState(false);
  const blocked = Boolean(disabledReason);

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (blocked || pending) return;
    const win = window.open("about:blank", "_blank");
    setPending(true);
    try {
      const result = await agendaService.sendWhatsapp(appointmentId, template);
      if (win && !win.closed) {
        win.opener = null;
        win.location.href = result.whatsapp_url;
      } else {
        window.open(result.whatsapp_url, "_blank", "noopener,noreferrer");
      }
      toast({
        variant: "success",
        title: "WhatsApp aberto",
        description: `${result.template_label} para ${result.patient_name}.`,
      });
      onSent?.(result);
    } catch (err) {
      win?.close();
      toast({
        variant: "destructive",
        title: "Não foi possível preparar a mensagem",
        description: getErrorMessage(err, "Tente novamente."),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={disabled || blocked || pending}
      title={disabledReason ?? undefined}
      data-testid="appointment-whatsapp-button"
      className={cn(
        "transition-all duration-150",
        "border border-emerald-200 bg-emerald-50 text-emerald-700",
        "hover:bg-emerald-100 hover:border-emerald-300 hover:text-emerald-800",
        "hover:shadow-soft active:scale-[0.98]",
        "focus-visible:ring-emerald-300",
        className,
      )}
      {...rest}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
