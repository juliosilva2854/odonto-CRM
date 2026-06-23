import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QuoteItemStatus, QuoteStatus } from "@/types/api";

interface QuoteStatusVisual {
  label: string;
  classes: string;
  dot: string;
}

export const QUOTE_STATUS_VISUAL: Record<QuoteStatus, QuoteStatusVisual> = {
  draft: {
    label: "Rascunho",
    classes: "border-border bg-secondary text-muted-foreground",
    dot: "#94A3B8",
  },
  sent: {
    label: "Enviado",
    classes: "border-accent/20 bg-accent/10 text-accent",
    dot: "#6366F1",
  },
  approved_partial: {
    label: "Aprovado parcial",
    classes: "border-amber-300 bg-amber-50 text-amber-700",
    dot: "#F59E0B",
  },
  approved: {
    label: "Aprovado",
    classes: "border-success/30 bg-success/10 text-success",
    dot: "#10B981",
  },
  rejected: {
    label: "Rejeitado",
    classes: "border-rose-200 bg-rose-50 text-rose-600",
    dot: "#F87171",
  },
  cancelled: {
    label: "Cancelado",
    classes: "border-border bg-secondary text-muted-foreground line-through",
    dot: "#CBD5E1",
  },
  expired: {
    label: "Expirado",
    classes: "border-rose-200 bg-rose-50/50 text-rose-500",
    dot: "#FCA5A5",
  },
};

export const QUOTE_ITEM_STATUS_VISUAL: Record<QuoteItemStatus, QuoteStatusVisual> = {
  pending: {
    label: "Pendente",
    classes: "border-border bg-secondary text-muted-foreground",
    dot: "#94A3B8",
  },
  approved: {
    label: "Aprovado",
    classes: "border-success/30 bg-success/10 text-success",
    dot: "#10B981",
  },
  rejected: {
    label: "Rejeitado",
    classes: "border-rose-200 bg-rose-50 text-rose-600",
    dot: "#F87171",
  },
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const v = QUOTE_STATUS_VISUAL[status];
  return (
    <Badge
      variant="default"
      className={cn("shrink-0", v.classes)}
      data-testid={`quote-status-${status}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: v.dot }}
      />
      {v.label}
    </Badge>
  );
}

export function QuoteItemStatusBadge({ status }: { status: QuoteItemStatus }) {
  const v = QUOTE_ITEM_STATUS_VISUAL[status];
  return (
    <Badge
      variant="default"
      className={cn("shrink-0", v.classes)}
      data-testid={`quote-item-status-${status}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: v.dot }}
      />
      {v.label}
    </Badge>
  );
}

export function formatBRL(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "R$ 0,00";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}
