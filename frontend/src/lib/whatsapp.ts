/**
 * WhatsApp Click-to-Chat deep-link helpers.
 *
 * Uses the **public** API (wa.me) — zero backend, zero credentials, opens
 * either WhatsApp Web or the native app depending on the user agent.
 */
import { formatBRL } from "@/components/quotes/quote-status";
import type { ClinicSummary, Patient, Quote } from "@/types/api";

/**
 * Strips any non-digit char so the phone is wa.me compatible.
 * Phones stored in `phone_e164` already start with `+` and the country code,
 * so we just remove the `+` and any leftover formatting.
 */
export function cleanPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D+/g, "");
}

/**
 * Builds a Brazilian-Portuguese sales follow-up message for a quote.
 *
 * Keeps it warm, concise, and ends with a soft CTA so the receptionist can
 * naturally continue the conversation. Line breaks are real `\n` chars —
 * encodeURIComponent will turn them into `%0A` automatically.
 */
export function buildQuoteWhatsappMessage({
  patient,
  clinic,
  quote,
}: {
  patient: Pick<Patient, "full_name" | "social_name">;
  clinic: Pick<ClinicSummary, "trade_name">;
  quote: Pick<Quote, "number" | "total">;
}): string {
  const greetingName = patient.social_name?.trim() || firstName(patient.full_name);
  const clinicName = clinic.trade_name.trim();
  const formattedTotal = formatBRL(quote.total);

  return [
    `Olá, ${greetingName}! Tudo bem? 😊`,
    "",
    `Aqui é da clínica ${clinicName}. O(a) Dr(a). finalizou o seu planejamento clínico personalizado (orçamento ${quote.number}).`,
    "",
    `O valor do investimento ficou em *${formattedTotal}*, com condições facilitadas.`,
    "",
    "Posso te enviar o documento em PDF por aqui para você avaliar com calma?",
  ].join("\n");
}

function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || fullName;
}

/**
 * Builds the full https://wa.me/<phone>?text=<msg> URL.
 * Returns `null` if the phone is not usable (no digits).
 */
export function buildWhatsappUrl({
  phone,
  message,
}: {
  phone: string | null | undefined;
  message: string;
}): string | null {
  const digits = cleanPhoneNumber(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Opens the deep-link in a new tab. */
export function openWhatsapp(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
