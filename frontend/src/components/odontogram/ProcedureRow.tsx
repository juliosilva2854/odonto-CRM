import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, MoreHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { odontogramService } from "@/services/odontogram.service";
import type {
  Procedure,
  ToothProcedure,
  ToothProcedureStatus,
} from "@/types/api";

import { ALLOWED_TRANSITIONS, STATUS_VISUAL } from "./fdi";

interface ProcedureRowProps {
  patientId: string;
  procedure: ToothProcedure;
  catalogProcedure?: Procedure;
  disabled?: boolean;
}

/**
 * Single line item inside the ToothDetailSheet showing a procedure planned
 * on the tooth, with a status badge and a "more" dropdown to change status
 * (validated against the backend state machine).
 *
 * When status changes to "done" (or any other), invalidates the odontogram
 * cache so the SVG repaints instantly.
 */
export function ProcedureRow({
  patientId,
  procedure,
  catalogProcedure,
  disabled = false,
}: ProcedureRowProps) {
  const queryClient = useQueryClient();
  const visual = STATUS_VISUAL[procedure.status];
  const allowedTargets = ALLOWED_TRANSITIONS[procedure.status];
  const isTerminal = allowedTargets.length === 0;

  const mutation = useMutation({
    mutationFn: (newStatus: ToothProcedureStatus) =>
      odontogramService.changeStatus(procedure.id, newStatus),
    onSuccess: () => {
      // Repaint the odontogram chart + tooth sheet immediately.
      queryClient.invalidateQueries({ queryKey: ["odontogram", patientId] });
    },
  });

  return (
    <li
      data-testid={`procedure-row-${procedure.id}`}
      className={cn(
        "group flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3 transition-shadow hover:shadow-xs",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {catalogProcedure?.name ?? "Procedimento"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Faces: {procedure.faces.length === 0 ? "—" : procedure.faces.join(" · ")}
        </p>
        {procedure.notes && (
          <p className="mt-1 text-xs text-muted-foreground/90 line-clamp-2">
            “{procedure.notes}”
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Badge variant="default" className={cn("shrink-0", visual.badgeClass)}>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: visual.fill }}
          />
          {visual.label}
        </Badge>

        {!isTerminal && !disabled && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Mudar status"
                data-testid={`procedure-menu-${procedure.id}`}
                disabled={mutation.isPending}
                className="opacity-60 hover:opacity-100"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-3.5 w-3.5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Mudar status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allowedTargets.map((target) => {
                const tv = STATUS_VISUAL[target];
                return (
                  <DropdownMenuItem
                    key={target}
                    onSelect={(e) => {
                      e.preventDefault();
                      mutation.mutate(target);
                    }}
                    data-testid={`procedure-status-${procedure.id}-${target}`}
                  >
                    <span
                      className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/5"
                      style={{ backgroundColor: tv.fill }}
                    />
                    <span className="flex-1">{tv.label}</span>
                    {target === "done" && (
                      <Check className="h-3.5 w-3.5 text-success" />
                    )}
                    {target === "cancelled" && (
                      <X className="h-3.5 w-3.5 text-rose-500" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}
