import { MessageCircle } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildQuoteWhatsappMessage,
  buildWhatsappUrl,
  openWhatsapp,
} from "@/lib/whatsapp";
import type { ClinicSummary, Patient, Quote } from "@/types/api";

interface WhatsAppQuoteButtonProps
  extends Omit<ButtonProps, "onClick" | "children" | "variant"> {
  patient: Pick<Patient, "full_name" | "social_name" | "phone_e164"> | null | undefined;
  clinic: Pick<ClinicSummary, "trade_name"> | null | undefined;
  quote: Pick<Quote, "number" | "total">;
  /** Show the icon-only compact version (for table rows). */
  compact?: boolean;
  label?: string;
}

/**
 * WhatsApp Click-to-Chat button with a polished hover — emerald accent
 * matching the official brand without violating our Modern Premium tokens.
 */
export function WhatsAppQuoteButton({
  patient,
  clinic,
  quote,
  compact = false,
  label = "Enviar via WhatsApp",
  className,
  disabled,
  ...rest
}: WhatsAppQuoteButtonProps) {
  const phone = patient?.phone_e164 ?? null;
  const ready = !!patient && !!clinic && !!phone;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!ready) return;
    const message = buildQuoteWhatsappMessage({
      patient: patient!,
      clinic: clinic!,
      quote,
    });
    const url = buildWhatsappUrl({ phone, message });
    if (url) openWhatsapp(url);
  }

  const sharedClass = cn(
    "transition-all duration-150",
    // Emerald accent layered on top of the design system
    "border border-emerald-200 bg-emerald-50 text-emerald-700",
    "hover:bg-emerald-100 hover:border-emerald-300 hover:text-emerald-800",
    "hover:shadow-soft active:scale-[0.98]",
    "focus-visible:ring-emerald-300",
  );

  if (compact) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={handleClick}
        disabled={disabled || !ready}
        aria-label={label}
        title={ready ? label : "Telefone do paciente não cadastrado"}
        data-testid="whatsapp-button-compact"
        className={cn(sharedClass, className)}
        {...rest}
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={disabled || !ready}
      data-testid="whatsapp-button"
      title={ready ? undefined : "Telefone do paciente não cadastrado"}
      className={cn(sharedClass, className)}
      {...rest}
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </Button>
  );
}
