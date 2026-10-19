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
        className="shrink-0 drop-shadow-sm"
      >
        <defs>
          {/* Rounded tooth silhouette — clips the 5 faces into an anatomical shape */}
          <clipPath id={`tooth-clip-${fdi}`}>
            <path d="M 20 1.5 C 29 1.5 38.5 5 38.5 15 C 38.5 24 38.5 30 34 36 C 30.5 40.5 9.5 40.5 6 36 C 1.5 30 1.5 24 1.5 15 C 1.5 5 11 1.5 20 1.5 Z" />
          </clipPath>
        </defs>

        <g clipPath={`url(#tooth-clip-${fdi})`}>
          {/* Top — V or L */}
          <path
            d="M 0 0 L 40 0 L 27 14 L 13 14 Z"
            fill={top.fill}
            stroke={top.stroke}
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          {/* Right — M or D */}
          <path
            d="M 40 0 L 40 40 L 26 26 L 27 14 Z"
            fill={right.fill}
            stroke={right.stroke}
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          {/* Bottom — L or V */}
          <path
            d="M 0 40 L 40 40 L 26 26 L 14 26 Z"
            fill={bottom.fill}
            stroke={bottom.stroke}
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          {/* Left — M or D */}
          <path
            d="M 0 0 L 0 40 L 14 26 L 13 14 Z"
            fill={left.fill}
            stroke={left.stroke}
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          {/* Center — O or I (occlusal / incisal surface) */}
          <rect
            x="13"
            y="14"
            width="14"
            height="12"
            rx="3"
            fill={center.fill}
            stroke={center.stroke}
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
        </g>

        {/* Clean anatomical outline on top of the faces */}
        <path
          d="M 20 1.5 C 29 1.5 38.5 5 38.5 15 C 38.5 24 38.5 30 34 36 C 30.5 40.5 9.5 40.5 6 36 C 1.5 30 1.5 24 1.5 15 C 1.5 5 11 1.5 20 1.5 Z"
          fill="none"
          stroke="#94A3B8"
          strokeWidth="1.25"
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
