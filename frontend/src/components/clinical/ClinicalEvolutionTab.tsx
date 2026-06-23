import { useQuery } from "@tanstack/react-query";
import { FilePlus, Inbox } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { clinicalRecordsService } from "@/services/clinical-records.service";

import { RecordsTimeline } from "./RecordsTimeline";
import { NewRecordEditor } from "./NewRecordEditor";

interface ClinicalEvolutionTabProps {
  patientId: string;
  /** Patient anonymized (LGPD) — fully read-only. */
  patientReadOnly?: boolean;
}

/**
 * Two-column layout:
 *   Left  → Timeline of past clinical records (with nested addendums)
 *   Right → Editor (PUT latest · POST new · or POST addendum when locked)
 */
export function ClinicalEvolutionTab({
  patientId,
  patientReadOnly = false,
}: ClinicalEvolutionTabProps) {
  const recordsQuery = useQuery({
    queryKey: ["clinical-records", patientId, { page: 1, page_size: 50 }],
    queryFn: () => clinicalRecordsService.list(patientId, { page: 1, page_size: 50 }),
    enabled: !!patientId,
  });

  if (recordsQuery.isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-96 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (recordsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível carregar o prontuário. Tente recarregar a página.
        </AlertDescription>
      </Alert>
    );
  }

  const records = recordsQuery.data?.items ?? [];
  // The API returns most-recent first (ordered by created_at desc on the
  // service). The first item is the "current" record for lock logic.
  const latestRecord = records[0] ?? null;

  return (
    <div
      data-testid="clinical-evolution-tab"
      className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
    >
      {/* Timeline */}
      <section className="min-w-0">
        {records.length === 0 ? (
          <EmptyTimeline />
        ) : (
          <RecordsTimeline records={records} />
        )}
      </section>

      {/* Editor */}
      <aside className="min-w-0">
        <div className="sticky top-24">
          <NewRecordEditor
            patientId={patientId}
            latestRecord={latestRecord}
            disabled={patientReadOnly}
          />
        </div>
      </aside>
    </div>
  );
}

function EmptyTimeline() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-8 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
        <Inbox className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">
        Nenhuma evolução registrada
      </h3>
      <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
        Use o editor ao lado para criar a primeira entrada clínica deste paciente.
        Após salvar, você terá 24h para editar livremente antes do lock CFO.
      </p>
      <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-accent">
        <FilePlus className="h-3 w-3" />
        Comece pela coluna ao lado
      </p>
    </div>
  );
}
