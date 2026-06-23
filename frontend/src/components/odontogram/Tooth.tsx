import { memo } from "react";

import { cn } from "@/lib/utils";
import type { ToothFace, ToothProcedure } from "@/types/api";

import {
  STATUS_VISUAL,
  dominantStatusForFace,
  faceLayoutFor,
} from "./fdi";

interface ToothProps {
  fdi: string;
  procedures: ToothProcedure[];
  onSelect: (fdi: string) => void;
  selected?: boolean;
}

/**
 * Single tooth SVG with 5 faces (M / D / V / L (or P) / O (or I)).
 *
 * Geometry: 40x40 viewBox split as 4 outer trapezoids + 1 central square.
 */
function ToothImpl({ fdi, procedures, onSelect, selected }: ToothProps) {
  const layout = faceLayoutFor(fdi);

  // Resolve the visual color for each region from the dominant status.
  function colorFor(code: ToothFace): { fill: string; stroke: string } {
    const status = dominantStatusForFace(procedures, code);
    if (!status) return { fill: "#FFFFFF", stroke: "#CBD5E1" };
    const v = STATUS_VISUAL[status];
    return { fill: v.fill, stroke: v.stroke };
  }

  const top = colorFor(layout.top);
  const right = colorFor(layout.right);
  const bottom = colorFor(layout.bottom);
  const left = colorFor(layout.left);
  const center = colorFor(layout.center);

  return (
    <button
      type="button"
      data-testid={`tooth-${fdi}`}
      onClick={() => onSelect(fdi)}
      className={cn(
        "group flex flex-col items-center gap-1 rounded-lg p-1 transition-all",
        "hover:bg-accent/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected && "bg-accent/10 ring-2 ring-accent",
      )}
      aria-label={`Dente ${fdi}`}
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Top — V or L */}
        <path
          d="M 1 1 L 39 1 L 28 12 L 12 12 Z"
          fill={top.fill}
          stroke={top.stroke}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Right — M or D */}
        <path
          d="M 39 1 L 39 39 L 28 28 L 28 12 Z"
          fill={right.fill}
          stroke={right.stroke}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Bottom — L or V */}
        <path
          d="M 1 39 L 39 39 L 28 28 L 12 28 Z"
          fill={bottom.fill}
          stroke={bottom.stroke}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Left — M or D */}
        <path
          d="M 1 1 L 1 39 L 12 28 L 12 12 Z"
          fill={left.fill}
          stroke={left.stroke}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Center — O or I */}
        <path
          d="M 12 12 L 28 12 L 28 28 L 12 28 Z"
          fill={center.fill}
          stroke={center.stroke}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={cn(
          "text-[10px] font-medium tabular-nums tracking-tight",
          selected ? "text-accent" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {fdi}
      </span>
    </button>
  );
}

export const Tooth = memo(ToothImpl);
