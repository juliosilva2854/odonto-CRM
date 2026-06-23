import { Check, ListFilter, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { QuoteStatus } from "@/types/api";

import { QUOTE_STATUS_VISUAL } from "./quote-status";

const ALL_STATUSES: QuoteStatus[] = [
  "draft",
  "sent",
  "approved_partial",
  "approved",
  "rejected",
  "cancelled",
  "expired",
];

/** Curated quick-presets the receptionist actually uses day-to-day. */
const PRESETS: Array<{
  label: string;
  description: string;
  statuses: QuoteStatus[];
}> = [
  {
    label: "Para cobrar hoje",
    description: "Enviados ou parcialmente aprovados",
    statuses: ["sent", "approved_partial"],
  },
  {
    label: "Em elaboração",
    description: "Rascunhos não enviados",
    statuses: ["draft"],
  },
  {
    label: "Recusães",
    description: "Rejeitados ou expirados",
    statuses: ["rejected", "expired"],
  },
  {
    label: "Fechados",
    description: "Aprovados na clínica",
    statuses: ["approved"],
  },
];

interface QuoteStatusFilterProps {
  value: Set<QuoteStatus>;
  onChange: (next: Set<QuoteStatus>) => void;
}

export function QuoteStatusFilter({
  value,
  onChange,
}: QuoteStatusFilterProps) {
  const count = value.size;
  const hasFilter = count > 0;

  function toggle(status: QuoteStatus) {
    const next = new Set(value);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    onChange(next);
  }

  function setPreset(statuses: QuoteStatus[]) {
    onChange(new Set(statuses));
  }

  function clear() {
    onChange(new Set());
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="default"
          data-testid="status-filter-trigger"
          className={cn(
            "gap-2",
            hasFilter && "border-accent/40 text-accent",
          )}
        >
          <ListFilter className="h-4 w-4" />
          Status
          {hasFilter && (
            <Badge
              variant="accent"
              className="ml-0.5 h-5 rounded-md px-1.5 text-[10px] font-semibold tabular-nums"
            >
              {count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="start">
        {/* Presets */}
        <div className="px-3 pb-3 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Presets rápidos
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {PRESETS.map((preset) => {
              const active =
                value.size === preset.statuses.length &&
                preset.statuses.every((s) => value.has(s));
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setPreset(preset.statuses)}
                  data-testid={`status-preset-${preset.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={cn(
                    "group rounded-lg border px-2.5 py-2 text-left transition-all",
                    active
                      ? "border-accent/40 bg-accent/5 text-accent"
                      : "border-border bg-card hover:border-accent/30 hover:bg-secondary/60",
                  )}
                >
                  <p className="text-xs font-semibold">{preset.label}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-[10px] leading-tight",
                      active ? "text-accent/80" : "text-muted-foreground",
                    )}
                  >
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Individual checkboxes */}
        <div className="px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Status individuais
          </p>
          <ul className="mt-2 space-y-0.5">
            {ALL_STATUSES.map((s) => {
              const v = QUOTE_STATUS_VISUAL[s];
              const checked = value.has(s);
              return (
                <li key={s}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggle(s)}
                    data-testid={`status-checkbox-${s}`}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm",
                      "transition-colors hover:bg-secondary",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          checked
                            ? "border-accent bg-accent text-white"
                            : "border-border bg-card",
                        )}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: v.dot }}
                      />
                      <span className="text-foreground">{v.label}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {hasFilter && (
          <>
            <Separator />
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[11px] text-muted-foreground">
                {count} status selecionado{count === 1 ? "" : "s"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clear}
                data-testid="status-filter-clear"
              >
                <X className="h-3.5 w-3.5" /> Limpar
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
