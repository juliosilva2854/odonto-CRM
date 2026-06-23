import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Lock,
  LockOpen,
  MessageSquarePlus,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { clinicalRecordsService } from "@/services/clinical-records.service";
import type { ClinicalRecord, ClinicalRecordType } from "@/types/api";

const RECORD_TYPE_LABEL: Record<ClinicalRecordType, string> = {
  evolution: "Evolução clínica",
  anamnesis: "Anamnese",
  prescription: "Prescrição",
  exam: "Exame",
  consent: "Consentimento",
  other: "Outro",
};

interface RecordsTimelineProps {
  records: ClinicalRecord[];
}

export function RecordsTimeline({ records }: RecordsTimelineProps) {
  return (
    <ol
      data-testid="records-timeline"
      className="relative space-y-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border"
    >
      {records.map((record, idx) => (
        <li key={record.id} className="relative pl-12">
          <span
            className={cn(
              "absolute left-3 top-5 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-card",
              record.is_locked
                ? "border-muted-foreground/40"
                : "border-accent ring-2 ring-accent/15",
            )}
            aria-hidden
          >
            <FileText
              className={cn(
                "h-2.5 w-2.5",
                record.is_locked ? "text-muted-foreground" : "text-accent",
              )}
            />
          </span>
          <RecordCard record={record} isFirst={idx === 0} />
        </li>
      ))}
    </ol>
  );
}

function RecordCard({ record, isFirst }: { record: ClinicalRecord; isFirst: boolean }) {
  const [open, setOpen] = useState(false);

  // Lazy-load addendums only when the user expands the card.
  const addendumsQuery = useQuery({
    queryKey: ["clinical-record-addendums", record.id],
    queryFn: () => clinicalRecordsService.listAddendums(record.id),
    enabled: open,
    staleTime: 30_000,
  });

  const addendumCount = addendumsQuery.data?.length ?? 0;
  const hasAddendumsHint = isFirst || addendumCount > 0;

  return (
    <article
      data-testid={`record-card-${record.id}`}
      className="rounded-2xl border border-border bg-card shadow-xs transition-shadow hover:shadow-soft"
    >
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold leading-tight text-foreground">
              {record.title}
            </h4>
            <Badge variant="outline" className="text-[10px]">
              {RECORD_TYPE_LABEL[record.record_type]}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {format(new Date(record.created_at), "d 'de' MMMM 'de' yyyy · HH:mm", {
              locale: ptBR,
            })}
          </p>
        </div>

        {record.is_locked ? (
          <Badge variant="default" className="border-rose-200 bg-rose-50 text-rose-600">
            <Lock className="h-3 w-3" /> Bloqueado
          </Badge>
        ) : (
          <Badge variant="default" className="border-success/20 bg-success/10 text-success">
            <LockOpen className="h-3 w-3" /> Aberto p/ edição
          </Badge>
        )}
      </header>

      {/* Body */}
      <div className="px-5 py-4">
        <p className="whitespace-pre-wrap text-[13px] leading-[1.75] text-foreground/90">
          {record.content}
        </p>
      </div>

      {/* Addendums (lazy) */}
      {hasAddendumsHint && (
        <div className="border-t border-border bg-secondary/30 px-5 py-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            data-testid={`record-addendums-toggle-${record.id}`}
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <MessageSquarePlus className="h-3.5 w-3.5" />
            {addendumsQuery.isLoading
              ? "Carregando adendos…"
              : addendumCount > 0
                ? `${addendumCount} adendo${addendumCount === 1 ? "" : "s"} legal${addendumCount === 1 ? "" : "is"}`
                : "Ver adendos"}
          </button>

          {open && (
            <div className="mt-3 space-y-2 border-l border-border pl-4">
              {addendumsQuery.isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : addendumCount === 0 ? (
                <p className="text-[11px] italic text-muted-foreground">
                  Sem adendos para este registro.
                </p>
              ) : (
                addendumsQuery.data!.map((ad) => (
                  <div
                    key={ad.id}
                    className="rounded-lg border border-border bg-card px-3.5 py-2.5"
                    data-testid={`addendum-${ad.id}`}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Adendo ·{" "}
                      {format(new Date(ad.created_at), "d MMM yyyy · HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground/90">
                      {ad.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
