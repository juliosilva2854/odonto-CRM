/**
 * FDI / ISO 3950 layout helpers + face mapping.
 *
 * Doctor-view chart layout (mirror of patient):
 *
 *   Upper:  [Q1: 18→→→11] | [Q2: 21→→→28]
 *   Lower:  [Q4: 48→→→41] | [Q3: 31→→→38]
 */
import type { ToothFace, ToothProcedure, ToothProcedureStatus } from "@/types/api";

export type Quadrant = 1 | 2 | 3 | 4;

export const QUADRANTS: Record<Quadrant, string[]> = {
  1: ["18", "17", "16", "15", "14", "13", "12", "11"],
  2: ["21", "22", "23", "24", "25", "26", "27", "28"],
  3: ["31", "32", "33", "34", "35", "36", "37", "38"],
  4: ["48", "47", "46", "45", "44", "43", "42", "41"],
};

export const ANTERIOR_FDI = new Set([
  "11", "12", "13",
  "21", "22", "23",
  "31", "32", "33",
  "41", "42", "43",
]);

export function isAnterior(fdi: string): boolean {
  return ANTERIOR_FDI.has(fdi);
}

export function getQuadrant(fdi: string): Quadrant {
  return Number(fdi[0]) as Quadrant;
}

export function isUpperArch(fdi: string): boolean {
  const q = getQuadrant(fdi);
  return q === 1 || q === 2;
}

/**
 * For a given tooth, returns the **canonical face code** for each visual
 * position (top, right, bottom, left, center) considering FDI quadrant.
 */
export function faceLayoutFor(fdi: string): {
  top: ToothFace;
  right: ToothFace;
  bottom: ToothFace;
  left: ToothFace;
  center: ToothFace;
} {
  const q = getQuadrant(fdi);
  const upper = isUpperArch(fdi);
  const anterior = isAnterior(fdi);

  // Vestibular / Lingual placement — doctor view, mouth open.
  const vlVertical: { top: ToothFace; bottom: ToothFace } = upper
    ? { top: "V", bottom: "L" }
    : { top: "L", bottom: "V" };

  // Mesial / Distal placement — mesial is always toward midline.
  //   Q1 (upper-right of patient) shown on the LEFT of upper row:
  //     midline is on the RIGHT of the tooth visual → M = right, D = left.
  //   Q4 (lower-right) shown on the LEFT of lower row: same rule.
  //   Q2 / Q3 are on the right half → M = left, D = right.
  const mdHorizontal: { left: ToothFace; right: ToothFace } =
    q === 1 || q === 4
      ? { left: "D", right: "M" }
      : { left: "M", right: "D" };

  return {
    top: vlVertical.top,
    bottom: vlVertical.bottom,
    left: mdHorizontal.left,
    right: mdHorizontal.right,
    center: anterior ? "I" : "O",
  };
}

// ─────────────────────────────────────────────────────────────────
// Status → visual mapping
// ─────────────────────────────────────────────────────────────────

export interface StatusVisual {
  fill: string;
  stroke: string;
  label: string;
  badgeClass: string;
}

export const STATUS_VISUAL: Record<ToothProcedureStatus, StatusVisual> = {
  planned: {
    fill: "#E2E8F0", // slate-200 — light gray
    stroke: "#94A3B8",
    label: "Planejado",
    badgeClass: "border-border bg-secondary text-foreground",
  },
  to_execute: {
    fill: "#6366F1", // indigo-500 — tech blue
    stroke: "#4F46E5",
    label: "A executar",
    badgeClass: "border-accent/20 bg-accent/10 text-accent",
  },
  in_progress: {
    fill: "#F59E0B", // amber-500
    stroke: "#D97706",
    label: "Em andamento",
    badgeClass: "border-amber-300 bg-amber-50 text-amber-700",
  },
  done: {
    fill: "#10B981", // emerald-500 — vibrant green
    stroke: "#059669",
    label: "Concluído",
    badgeClass: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
  cancelled: {
    fill: "#FECACA", // red-200
    stroke: "#F87171",
    label: "Cancelado",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-600",
  },
};

const STATUS_PRIORITY: Record<ToothProcedureStatus, number> = {
  cancelled: 0,
  planned: 1,
  to_execute: 2,
  in_progress: 3,
  done: 4,
};

/** Returns the dominant (highest priority) status for a given face code. */
export function dominantStatusForFace(
  procedures: ToothProcedure[],
  faceCode: ToothFace,
): ToothProcedureStatus | null {
  let best: ToothProcedureStatus | null = null;
  for (const p of procedures) {
    if (p.status === "cancelled") continue;
    const faces = p.faces ?? [];
    // A procedure with no faces (e.g. extraction) lights up the whole tooth.
    const matches = faces.length === 0 || faces.includes(faceCode);
    if (!matches) continue;
    if (best === null || STATUS_PRIORITY[p.status] > STATUS_PRIORITY[best]) {
      best = p.status;
    }
  }
  return best;
}

/** Groups procedures by tooth FDI (procedures with no tooth are filtered out). */
export function groupByTooth(
  procedures: ToothProcedure[],
): Record<string, ToothProcedure[]> {
  const map: Record<string, ToothProcedure[]> = {};
  for (const p of procedures) {
    if (!p.tooth_fdi) continue;
    if (!map[p.tooth_fdi]) map[p.tooth_fdi] = [];
    map[p.tooth_fdi].push(p);
  }
  return map;
}

export const FACE_NAMES: Record<ToothFace, string> = {
  M: "Mesial",
  D: "Distal",
  V: "Vestibular",
  L: "Lingual",
  P: "Palatina",
  B: "Bucal",
  O: "Oclusal",
  I: "Incisal",
};
