import type { AppointmentStatus } from "@/types/api";

export interface StatusVisual {
  label: string;
  bg: string;       // CSS hex (used in FullCalendar event)
  border: string;
  text: string;     // hex text color
  badgeClass: string; // tailwind classes for badges/legends
  dot: string;
}

/**
 * Sophisticated, neutral palette tuned for Modern Premium SaaS.
 * Backgrounds are pale (5–10% saturation), borders ~30%, text strong.
 */
export const APPOINTMENT_STATUS_VISUAL: Record<AppointmentStatus, StatusVisual> = {
  scheduled: {
    label: "Agendado",
    bg: "#F1F5F9",        // slate-100
    border: "#CBD5E1",    // slate-300
    text: "#334155",      // slate-700
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
    dot: "#94A3B8",
  },
  confirmed: {
    label: "Confirmado",
    bg: "#EEF2FF",        // indigo-50
    border: "#A5B4FC",    // indigo-300
    text: "#3730A3",      // indigo-800
    badgeClass: "border-accent/20 bg-accent/10 text-accent",
    dot: "#6366F1",
  },
  waiting_room: {
    label: "Sala de espera",
    bg: "#FFFBEB",        // amber-50
    border: "#FCD34D",    // amber-300
    text: "#92400E",      // amber-800
    badgeClass: "border-amber-300 bg-amber-50 text-amber-700",
    dot: "#F59E0B",
  },
  in_progress: {
    label: "Na cadeira",
    bg: "#ECFDF5",        // emerald-50
    border: "#6EE7B7",    // emerald-300
    text: "#065F46",      // emerald-800
    badgeClass: "border-success/30 bg-success/10 text-success",
    dot: "#10B981",
  },
  completed: {
    label: "Concluído",
    bg: "#F8FAFC",        // slate-50
    border: "#E2E8F0",    // slate-200
    text: "#475569",      // slate-600
    badgeClass: "border-border bg-secondary text-muted-foreground",
    dot: "#94A3B8",
  },
  cancelled: {
    label: "Cancelado",
    bg: "#FFF1F2",        // rose-50
    border: "#FECACA",    // rose-200
    text: "#9F1239",      // rose-800
    badgeClass: "border-rose-200 bg-rose-50 text-rose-600",
    dot: "#F87171",
  },
  no_show: {
    label: "Não compareceu",
    bg: "#FAFAFA",
    border: "#E5E7EB",
    text: "#6B7280",
    badgeClass: "border-border bg-secondary text-muted-foreground line-through",
    dot: "#CBD5E1",
  },
};
