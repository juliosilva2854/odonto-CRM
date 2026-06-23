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

/**\n * Builds a Brazilian-Portuguese sales follow-up message for a quote.\n *\n * Boutique Clinic register \u2014 formal treatment (Sr(a). + senhor(a)), no emojis,\n * single paragraph. Line breaks are real `\\n` chars \u2014 encodeURIComponent\n * will turn them into `%0A` automatically.\n */
export function buildQuoteWhatsappMessage({
  patient,
  clinic,
  quote,
}: {
  patient: Pick<Patient, "full_name" | "social_name">;
  clinic: Pick<ClinicSummary, "trade_name">;
  quote: Pick<Quote, "number" | "total">;
}): string {
  const treatmentName =
    patient.social_name?.trim() || patient.full_name.trim();
  const clinicName = clinic.trade_name.trim();
  const formattedTotal = formatBRL(quote.total);

  return [
    `Ol\u00e1, Sr(a). ${treatmentName}. Como o(a) senhor(a) est\u00e1?`,
    "",
    `Aqui \u00e9 da recep\u00e7\u00e3o da cl\u00ednica ${clinicName}. O seu planejamento cl\u00ednico personalizado j\u00e1 foi cuidadosamente estruturado pelo Doutor(a).`,
    "",
    `O valor do investimento do seu tratamento ficou em *${formattedTotal}*.`,
    "",
    "O(a) senhor(a) gostaria que eu enviasse o documento detalhado por aqui para sua avalia\u00e7\u00e3o em casa?",
  ].join("\n");
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
