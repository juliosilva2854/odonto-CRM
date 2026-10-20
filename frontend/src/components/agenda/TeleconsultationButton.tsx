import { useState } from "react";
import { Loader2, Video } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { agendaService } from "@/services/agenda.service";
import type { AppointmentStatus, TeleconsultationResponse } from "@/types/api";

/** Statuses where the video room can be opened (before or during care). */
export const TELECONSULTATION_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "waiting_room",
  "in_progress",
];

interface TeleconsultationButtonProps
  extends Omit<ButtonProps, "onClick" | "children" | "variant"> {
  appointmentId: string;
  label?: string;
  onOpened?: (room: TeleconsultationResponse) => void;
}

/**
 * Opens the appointment's Jitsi Meet room in a new tab
 * (`GET /api/agenda/appointments/{id}/teleconsultation`).
 *
 * Popup-blocker safe: a blank tab is opened synchronously on click and then
 * redirected to the room once the API answers.
 */
export function TeleconsultationButton({
  appointmentId,
  label = "Iniciar Teleconsulta",
  onOpened,
  className,
  disabled,
  ...rest
}: TeleconsultationButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (pending) return;
    const win = window.open("about:blank", "_blank");
    setPending(true);
    try {
      const room = await agendaService.getTeleconsultation(appointmentId);
      if (win && !win.closed) {
        win.opener = null;
        win.location.href = room.room_url;
      } else {
        window.open(room.room_url, "_blank", "noopener,noreferrer");
      }
      toast({
        variant: "success",
        title: "Teleconsulta aberta",
        description: `Sala ${room.room_name}`,
      });
      onOpened?.(room);
    } catch (err) {
      win?.close();
      toast({
        variant: "destructive",
        title: "Não foi possível abrir a teleconsulta",
        description: getErrorMessage(err, "Tente novamente."),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="accent"
      onClick={handleClick}
      disabled={disabled || pending}
      data-testid="appointment-teleconsultation-button"
      className={cn(
        "w-full shadow-soft transition-all duration-150 active:scale-[0.98]",
        className,
      )}
      {...rest}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Video className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
