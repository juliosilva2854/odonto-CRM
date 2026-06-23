import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Check,
  FilePlus2,
  Loader2,
  Lock,
  LockOpen,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { clinicalRecordsService } from "@/services/clinical-records.service";
import type { ClinicalRecord } from "@/types/api";

interface NewRecordEditorProps {
  patientId: string;
  latestRecord: ClinicalRecord | null;
  /** Patient anonymized / read-only — disable everything. */
  disabled?: boolean;
}

/**
 * Smart editor that adapts to the CFO Lock state of the most recent record:
 *
 * ─ No record yet           → Create first evolution (POST)
 * ─ Latest record open      → "Salvar evolução" updates latest (PUT)
 *                              + optional "Nova evolução" to start a fresh entry (POST)
 * ─ Latest record LOCKED    → Editor goes read-only with restricted styling.
 *                              Secondary "+ Adicionar Adendo Legal" appends an addendum.
 */
export function NewRecordEditor({
  patientId,
  latestRecord,
  disabled = false,
}: NewRecordEditorProps) {
  type Mode = "edit" | "create" | "addendum";
  const initialMode: Mode =
    !latestRecord ? "create" : latestRecord.is_locked ? "addendum" : "edit";

  const [mode, setMode] = useState<Mode>(initialMode);

  // Keep mode in sync if latestRecord identity / lock state changes (e.g. after save).
  useEffect(() => {
    setMode(!latestRecord ? "create" : latestRecord.is_locked ? "addendum" : "edit");
  }, [latestRecord?.id, latestRecord?.is_locked]);

  return (
    <Card data-testid="clinical-editor" className="overflow-hidden">
      <EditorHeader latestRecord={latestRecord} mode={mode} />
      <CardContent className="p-6">
        {mode === "addendum" && latestRecord && (
          <AddendumForm
            patientId={patientId}
            record={latestRecord}
            disabled={disabled}
          />
        )}
        {mode === "edit" && latestRecord && (
          <EditEvolutionForm
            patientId={patientId}
            record={latestRecord}
            disabled={disabled}
            onSwitchToCreate={() => setMode("create")}
          />
        )}
        {mode === "create" && (
          <CreateEvolutionForm
            patientId={patientId}
            disabled={disabled}
            onCancel={
              latestRecord && !latestRecord.is_locked
                ? () => setMode("edit")
                : undefined
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Header (context-aware)
// ────────────────────────────────────────────────────────────────────

function EditorHeader({
  latestRecord,
  mode,
}: {
  latestRecord: ClinicalRecord | null;
  mode: "edit" | "create" | "addendum";
}) {
  let title = "Nova evolução";
  let description = "Registre a primeira entrada clínica deste paciente.";
  let icon = <Sparkles className="h-4 w-4 text-accent" />;

  if (mode === "edit" && latestRecord) {
    title = "Editar evolução atual";
    description = `Janela CFO aberta · última atualização em ${format(
      new Date(latestRecord.updated_at),
      "d MMM yyyy 'às' HH:mm",
      { locale: ptBR },
    )}`;
    icon = <LockOpen className="h-4 w-4 text-success" />;
  } else if (mode === "addendum" && latestRecord) {
    title = "Adendo legal";
    description = "Janela CFO de 24h encerrada. Novas informações entram como adendo.";
    icon = <ShieldAlert className="h-4 w-4 text-rose-500" />;
  } else if (mode === "create") {
    title = "Nova evolução";
    description = "Crie uma nova entrada independente no prontuário.";
    icon = <FilePlus2 className="h-4 w-4 text-accent" />;
  }

  return (
    <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
          {icon}
        </div>
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </CardHeader>
  );
}

// ────────────────────────────────────────────────────────────────────
// EDIT mode (PUT)
// ────────────────────────────────────────────────────────────────────

function EditEvolutionForm({
  patientId,
  record,
  disabled,
  onSwitchToCreate,
}: {
  patientId: string;
  record: ClinicalRecord;
  disabled: boolean;
  onSwitchToCreate: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(record.title);
  const [content, setContent] = useState(record.content);

  // Reset whenever the underlying record id changes.
  useEffect(() => {
    setTitle(record.title);
    setContent(record.content);
  }, [record.id]);

  const hoursLeft = useMemo(() => {
    if (!record.locks_at) return null;
    const ms = new Date(record.locks_at).getTime() - Date.now();
    return Math.max(0, Math.round(ms / (60 * 60 * 1000)));
  }, [record.locks_at]);

  const mutation = useMutation({
    mutationFn: () =>
      clinicalRecordsService.update(record.id, {
        title: title.trim(),
        content: content.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinical-records", patientId] });
    },
  });

  const canSubmit =
    !disabled &&
    title.trim().length >= 2 &&
    content.trim().length >= 1 &&
    !mutation.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="edit-evolution-form">
      <Alert variant="success" className="border-success/30 bg-success/5">
        <LockOpen className="h-4 w-4" />
        <AlertTitle className="text-success">Prontuário editável</AlertTitle>
        <AlertDescription className="text-success/80">
          Você pode editar este registro por mais ~{hoursLeft ?? 0}h. Após o lock CFO,
          mudanças exigirão um adendo legal.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="edit-title">Título</Label>
        <Input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled}
          minLength={2}
          maxLength={180}
          data-testid="edit-title-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-content">Evolução clínica</Label>
        <Textarea
          id="edit-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          disabled={disabled}
          placeholder="Descreva o atendimento, achados, condutas e próximos passos…"
          className="font-sans leading-[1.7] text-[13.5px]"
          data-testid="edit-content-textarea"
        />
        <p className="text-right text-[10px] text-muted-foreground">
          {content.length}/20000
        </p>
      </div>

      {mutation.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {getErrorMessage(mutation.error, "Não foi possível salvar a evolução.")}
          </AlertDescription>
        </Alert>
      )}

      {mutation.isSuccess && (
        <Alert variant="success">
          <Check className="h-4 w-4" />
          <AlertDescription>Evolução atualizada com sucesso.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSwitchToCreate}
          disabled={disabled}
          data-testid="switch-to-create"
        >
          <FilePlus2 className="h-3.5 w-3.5" /> Nova evolução (separada)
        </Button>
        <Button
          type="submit"
          variant="accent"
          disabled={!canSubmit}
          data-testid="save-evolution-button"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> Salvar evolução
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────
// CREATE mode (POST)
// ────────────────────────────────────────────────────────────────────

function CreateEvolutionForm({
  patientId,
  disabled,
  onCancel,
}: {
  patientId: string;
  disabled: boolean;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const today = format(new Date(), "d MMM yyyy", { locale: ptBR });
  const [title, setTitle] = useState(`Evolução clínica — ${today}`);
  const [content, setContent] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      clinicalRecordsService.create(patientId, {
        title: title.trim(),
        content: content.trim(),
        record_type: "evolution",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinical-records", patientId] });
      setContent("");
    },
  });

  const canSubmit =
    !disabled &&
    title.trim().length >= 2 &&
    content.trim().length >= 1 &&
    !mutation.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="create-evolution-form">
      <div className="space-y-2">
        <Label htmlFor="create-title">Título</Label>
        <Input
          id="create-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled}
          minLength={2}
          maxLength={180}
          data-testid="create-title-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="create-content">Evolução clínica</Label>
        <Textarea
          id="create-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          disabled={disabled}
          placeholder="Descreva o atendimento, achados, condutas e próximos passos…"
          className="font-sans leading-[1.7] text-[13.5px]"
          data-testid="create-content-textarea"
        />
        <p className="text-right text-[10px] text-muted-foreground">
          {content.length}/20000
        </p>
      </div>

      {mutation.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {getErrorMessage(mutation.error, "Não foi possível criar a evolução.")}
          </AlertDescription>
        </Alert>
      )}

      {mutation.isSuccess && (
        <Alert variant="success">
          <Check className="h-4 w-4" />
          <AlertDescription>Evolução registrada no prontuário.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          variant="accent"
          disabled={!canSubmit}
          data-testid="create-evolution-button"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
            </>
          ) : (
            <>
              <FilePlus2 className="h-4 w-4" /> Criar evolução
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────
// ADDENDUM mode (POST /addendums)
// ────────────────────────────────────────────────────────────────────

function AddendumForm({
  patientId,
  record,
  disabled,
}: {
  patientId: string;
  record: ClinicalRecord;
  disabled: boolean;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      clinicalRecordsService.addAddendum(record.id, { content: content.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinical-records", patientId] });
      queryClient.invalidateQueries({
        queryKey: ["clinical-record-addendums", record.id],
      });
      setContent("");
    },
  });

  const canSubmit = !disabled && content.trim().length >= 1 && !mutation.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="addendum-form">
      <Alert variant="destructive" className="border-rose-200 bg-rose-50/60">
        <Lock className="h-4 w-4" />
        <AlertTitle>Prontuário bloqueado (CFO)</AlertTitle>
        <AlertDescription>
          A janela de 24h para edição livre expirou. Qualquer correção ou
          complemento deve ser registrado como adendo legal append-only.
        </AlertDescription>
      </Alert>

      {/* Read-only display of the locked record */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground">Registro original (bloqueado)</Label>
          <Badge variant="default" className="border-rose-200 bg-rose-50 text-rose-600">
            <Lock className="h-3 w-3" /> Lock CFO
          </Badge>
        </div>
        <div
          data-testid="locked-record-readonly"
          className={cn(
            "max-h-44 overflow-y-auto rounded-lg border bg-secondary/40 px-3.5 py-3 text-[12.5px] leading-relaxed text-muted-foreground",
            "border-rose-200/60",
          )}
        >
          <p className="mb-1 text-[10px] uppercase tracking-wider text-rose-500/80">
            {record.title} · {format(new Date(record.created_at), "d MMM yyyy · HH:mm", { locale: ptBR })}
          </p>
          <p className="whitespace-pre-wrap">{record.content}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="addendum-content">Adendo legal</Label>
        <Textarea
          id="addendum-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          disabled={disabled}
          placeholder="Descreva o complemento ou retificação. Este texto será anexado de forma imutável ao registro original."
          className={cn(
            "font-sans leading-[1.7] text-[13.5px]",
            "border-rose-200 focus-visible:ring-rose-300",
          )}
          data-testid="addendum-content-textarea"
        />
      </div>

      {mutation.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {getErrorMessage(mutation.error, "Não foi possível adicionar o adendo.")}
          </AlertDescription>
        </Alert>
      )}

      {mutation.isSuccess && (
        <Alert variant="success">
          <Check className="h-4 w-4" />
          <AlertDescription>Adendo registrado.</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end pt-1">
        <Button
          type="submit"
          variant="outline"
          className="border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100"
          disabled={!canSubmit}
          data-testid="add-addendum-button"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Registrando adendo…
            </>
          ) : (
            <>+ Adicionar Adendo Legal</>
          )}
        </Button>
      </div>
    </form>
  );
}
