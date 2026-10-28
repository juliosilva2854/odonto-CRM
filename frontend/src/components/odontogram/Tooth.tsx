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

function ToothImpl({ fdi, procedures, onSelect, selected }: ToothProps) {
  const layout = faceLayoutFor(fdi);

  // Função para pegar a cor de preenchimento e contorno
  function colorFor(code: ToothFace): { fill: string; stroke: string } {
    const status = dominantStatusForFace(procedures, code);
    if (!status) return { fill: "url(#tooth-gradient)", stroke: "#94A3B8" };
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
        "group flex flex-col items-center gap-1 rounded-lg p-1 transition-all duration-200",
        "hover:bg-slate-100 hover:scale-110 hover:z-10 relative", // Efeito de hover (zoom e sombra)
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        selected && "bg-indigo-50 ring-2 ring-indigo-500 z-10",
      )}
      aria-label={`Dente ${fdi}`}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "shrink-0 transition-all duration-300",
          "drop-shadow-sm group-hover:drop-shadow-md" // Sombra para efeito 3D
        )}
      >
        <defs>
          {/* Gradiente de fundo para simular profundidade do dente vazio */}
          <linearGradient id="tooth-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F1F5F9" />
          </linearGradient>
          
          {/* Gradiente para o centro (oclusal/incisal) ficar mais escuro */}
          <radialGradient id="tooth-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </radialGradient>
        </defs>

        {/* Top */}
        <path
          d="M 2 2 L 38 2 L 28 12 L 12 12 Z"
          fill={top.fill === "url(#tooth-gradient)" ? "url(#tooth-gradient)" : top.fill}
          stroke={top.stroke}
          strokeWidth="1.2"
          strokeLinejoin="round"
          className="transition-all duration-300"
        />
        {/* Right */}
        <path
          d="M 38 2 L 38 38 L 28 28 L 28 12 Z"
          fill={right.fill === "url(#tooth-gradient)" ? "url(#tooth-gradient)" : right.fill}
          stroke={right.stroke}
          strokeWidth="1.2"
          strokeLinejoin="round"
          className="transition-all duration-300"
        />
        {/* Bottom */}
        <path
          d="M 2 38 L 38 38 L 28 28 L 12 28 Z"
          fill={bottom.fill === "url(#tooth-gradient)" ? "url(#tooth-gradient)" : bottom.fill}
          stroke={bottom.stroke}
          strokeWidth="1.2"
          strokeLinejoin="round"
          className="transition-all duration-300"
        />
        {/* Left */}
        <path
          d="M 2 2 L 2 38 L 12 28 L 12 12 Z"
          fill={left.fill === "url(#tooth-gradient)" ? "url(#tooth-gradient)" : left.fill}
          stroke={left.stroke}
          strokeWidth="1.2"
          strokeLinejoin="round"
          className="transition-all duration-300"
        />
        {/* Center */}
        <path
          d="M 12 12 L 28 12 L 28 28 L 12 28 Z"
          fill={center.fill === "url(#tooth-gradient)" ? "url(#tooth-center)" : center.fill}
          stroke={center.stroke}
          strokeWidth="1.2"
          strokeLinejoin="round"
          className="transition-all duration-300"
        />
        
        {/* Linha de detalhe para dar um charme no centro */}
        <circle cx="20" cy="20" r="4" fill="transparent" stroke={center.stroke} strokeWidth="0.5" opacity="0.3" />
      </svg>
      <span
        className={cn(
          "text-[10px] font-bold tabular-nums tracking-tight transition-colors",
          selected ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-700",
        )}
      >
        {fdi}
      </span>
    </button>
  );
}

export const Tooth = memo(ToothImpl);
