import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OdontogramSnapshot, ToothProcedure } from "@/types/api";

import { QUADRANTS, STATUS_VISUAL, groupByTooth } from "./fdi";
import { Tooth } from "./Tooth";

interface OdontogramChartProps {
  snapshot: OdontogramSnapshot | undefined;
  isLoading?: boolean;
  onSelectTooth: (fdi: string) => void;
  selectedTooth: string | null;
}

/**
 * 32 permanent teeth, FDI / ISO 3950, doctor view.
 *
 *   Upper:  [Q1: 18 → 11] | [Q2: 21 → 28]
 *   Lower:  [Q4: 48 → 41] | [Q3: 31 → 38]
 */
export function OdontogramChart({
  snapshot,
  isLoading,
  onSelectTooth,
  selectedTooth,
}: OdontogramChartProps) {
  const groupedByTooth = useMemo<Record<string, ToothProcedure[]>>(() => {
    if (!snapshot) return {};
    return groupByTooth(snapshot.procedures);
  }, [snapshot]);

  return (
    <Card data-testid="odontogram-chart" className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border">
        <div>
          <CardTitle className="text-base">Odontograma</CardTitle>
          <p className="text-xs text-muted-foreground">
            Padrão FDI / ISO 3950 · 32 dentes · 5 faces por dente (M/D/V/L/O ou I).
            Clique em um dente para detalhes.
          </p>
        </div>
        <StatusLegend />
      </CardHeader>

      <CardContent className="p-6">
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <div className="mx-auto max-w-3xl space-y-2">
            {/* Upper arch */}
            <ArchRow
              left={QUADRANTS[1]}
              right={QUADRANTS[2]}
              groupedByTooth={groupedByTooth}
              onSelectTooth={onSelectTooth}
              selectedTooth={selectedTooth}
            />
            <ArchDivider label="Linha do sorriso" />
            {/* Lower arch */}
            <ArchRow
              left={QUADRANTS[4]}
              right={QUADRANTS[3]}
              groupedByTooth={groupedByTooth}
              onSelectTooth={onSelectTooth}
              selectedTooth={selectedTooth}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ArchRow({
  left,
  right,
  groupedByTooth,
  onSelectTooth,
  selectedTooth,
}: {
  left: string[];
  right: string[];
  groupedByTooth: Record<string, ToothProcedure[]>;
  onSelectTooth: (fdi: string) => void;
  selectedTooth: string | null;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="flex justify-end gap-0.5 sm:gap-1">
        {left.map((fdi) => (
          <Tooth
            key={fdi}
            fdi={fdi}
            procedures={groupedByTooth[fdi] ?? []}
            onSelect={onSelectTooth}
            selected={selectedTooth === fdi}
          />
        ))}
      </div>
      <div className="h-12 w-px bg-border" aria-hidden />
      <div className="flex justify-start gap-0.5 sm:gap-1">
        {right.map((fdi) => (
          <Tooth
            key={fdi}
            fdi={fdi}
            procedures={groupedByTooth[fdi] ?? []}
            onSelect={onSelectTooth}
            selected={selectedTooth === fdi}
          />
        ))}
      </div>
    </div>
  );
}

function ArchDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
      <div className="h-px flex-1 bg-border" />
      <span>{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function StatusLegend() {
  const items = [
    { key: "planned", color: STATUS_VISUAL.planned.fill, label: "Planejado" },
    { key: "to_execute", color: STATUS_VISUAL.to_execute.fill, label: "A executar" },
    { key: "in_progress", color: STATUS_VISUAL.in_progress.fill, label: "Em andamento" },
    { key: "done", color: STATUS_VISUAL.done.fill, label: "Concluído" },
  ];
  return (
    <ul className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:flex">
      {items.map((it) => (
        <li key={it.key} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm ring-1 ring-inset ring-black/5"
            style={{ backgroundColor: it.color }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function ChartSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {[0, 1].map((row) => (
        <div
          key={row}
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"
        >
          <div className="flex justify-end gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={cn("h-10 w-9 rounded-md shimmer bg-secondary")} />
            ))}
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="flex justify-start gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={cn("h-10 w-9 rounded-md shimmer bg-secondary")} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
