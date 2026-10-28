import { memo } from "react";
import { cn } from "@/lib/utils";
import type { ToothFace, ToothProcedure } from "@/types/api";
import { STATUS_VISUAL, dominantStatusForFace, faceLayoutFor } from "./fdi";

interface ToothProps {
  fdi: string;
  procedures: ToothProcedure[];
  onSelect: (fdi: string) => void;
  selected?: boolean;
}

// Função que retorna o formato do dente baseado no número FDI
function getToothPath(fdi: string) {
  const num = parseInt(fdi[1]);
  // 1, 2 = Incisivos Centrais e Laterais
  if (num === 1 || num === 2) {
    return "M 10 5 Q 20 5 30 5 L 30 35 Q 20 38 10 35 Z"; 
  }
  // 3 = Caninos
  if (num === 3) {
    return "M 20 2 Q 30 5 32 15 L 28 35 Q 20 38 12 35 L 8 15 Q 10 5 20 2 Z";
  }
  // 4, 5 = Pré-molares
  if (num === 4 || num === 5) {
    return "M 12 6 Q 20 4 28 6 L 32 20 Q 30 35 20 36 Q 10 35 8 20 Z";
  }
  // 6, 7, 8 = Molares
  return "M 8 4 Q 20 2 32 4 L 36 18 Q 36 36 20 36 Q 4 36 4 18 Z";
}

function ToothImpl({ fdi, procedures, onSelect, selected }: ToothProps) {
  const layout = faceLayoutFor(fdi);
  const basePath = getToothPath(fdi);

  function colorFor(code: ToothFace): { fill: string; stroke: string } {
    const status = dominantStatusForFace(procedures, code);
    if (!status) return { fill: "#FFFFFF", stroke: "#94A3B8" };
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
        "hover:bg-slate-100 hover:scale-110 hover:z-10 relative",
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
          "drop-shadow-sm group-hover:drop-shadow-md"
        )}
      >
        <defs>
          <clipPath id={`clip-${fdi}`}>
            <path d={basePath} />
          </clipPath>
          <linearGradient id={`grad-top-${fdi}`} x1="0" y1="0" x2="0" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id={`grad-center-${fdi}`} x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(0,0,0,0.05)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>

        {/* Base do dente com formato anatômico */}
        <path d={basePath} fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />

        <g clipPath={`url(#clip-${fdi})`}>
          {/* Face Superior (Vestibular ou Lingual) */}
          <path d={`M 0 0 L 40 0 L 40 ${fdi[1] === '3' ? '12' : '15'} L 0 ${fdi[1] === '3' ? '12' : '15'} Z`} fill={top.fill} stroke={top.stroke} strokeWidth="1" />
          {/* Face Inferior (Lingual ou Vestibular) */}
          <path d={`M 0 40 L 40 40 L 40 ${fdi[1] === '3' ? '28' : '25'} L 0 ${fdi[1] === '3' ? '28' : '25'} Z`} fill={bottom.fill} stroke={bottom.stroke} strokeWidth="1" />
          
          {/* Face Direita (Mesial ou Distal) */}
          <path d={`M 40 0 L 40 40 L ${fdi[1] === '1' || fdi[1] === '2' ? '28' : '25'} 40 L ${fdi[1] === '1' || fdi[1] === '2' ? '28' : '25'} 0 Z`} fill={right.fill} stroke={right.stroke} strokeWidth="1" />
          {/* Face Esquerda (Distal ou Mesial) */}
          <path d={`M 0 0 L 0 40 L ${fdi[1] === '1' || fdi[1] === '2' ? '12' : '15'} 40 L ${fdi[1] === '1' || fdi[1] === '2' ? '12' : '15'} 0 Z`} fill={left.fill} stroke={left.stroke} strokeWidth="1" />
          
          {/* Centro (Oclusal / Incisal) */}
          <rect 
            x={fdi[1] === '1' || fdi[1] === '2' ? '12' : '15'} 
            y={fdi[1] === '3' ? '12' : '15'} 
            width={fdi[1] === '1' || fdi[1] === '2' ? '16' : '10'} 
            height={fdi[1] === '3' ? '16' : '10'} 
            fill={center.fill} 
            stroke={center.stroke} 
            strokeWidth="1" 
          />

          {/* Efeitos 3D (Brilho e Sombra) */}
          <path d={basePath} fill={`url(#grad-top-${fdi})`} />
          <rect x="0" y="0" width="40" height="40" fill={`url(#grad-center-${fdi})`} />
        </g>
        
        {/* Borda final para manter o formato perfeito */}
        <path d={basePath} fill="transparent" stroke="#94A3B8" strokeWidth="1" strokeLinejoin="round" />
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
