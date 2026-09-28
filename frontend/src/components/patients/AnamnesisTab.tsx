import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, History, Loader2, Save } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { anamnesisService } from "@/services/anamnesis.service";
import type {
  AnamnesisField,
  AnamnesisQuestionnaire,
  AnamnesisRecord,
} from "@/types/api";

// ── Template padrão (espelha backend: anamnesis/template.py) ──────────────
function defaultTemplate(): AnamnesisQuestionnaire {
  return {
    alergias: {
      type: "checkbox",
      options: ["dipirona", "penicilina", "anestésicos", "látex", "outros"],
      value: [],
    },
    medicamentos_uso: { type: "text", value: "" },
    doencas_preexistentes: {
      type: "checkbox",
      options: [
        "diabetes",
        "hipertensão",
        "cardíaca",
        "coagulação",
        "renal",
        "hepática",
        "respiratória",
        "outras",
      ],
      value: [],
    },
    cirurgias_anteriores: { type: "text", value: "" },
    gestante: { type: "checkbox", value: false },
    fumante: { type: "checkbox", value: false },
    observacoes: { type: "text", value: "" },
  };
}

const FIELD_LABELS: Record<string, string> = {
  alergias: "Alergias",
  medicamentos_uso: "Medicamentos em uso",
  doencas_preexistentes: "Doenças preexistentes",
  cirurgias_anteriores: "Cirurgias anteriores",
  gestante: "Gestante",
  fumante: "Fumante",
  observacoes: "Observações",
};

// Ordem de exibição estável.
const FIELD_ORDER = [
  "alergias",
  "doencas_preexistentes",
  "medicamentos_uso",
  "cirurgias_anteriores",
  "gestante",
  "fumante",
  "observacoes",
];

function labelFor(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildInitial(record: AnamnesisRecord | null): AnamnesisQuestionnaire {
  const base = defaultTemplate();
  if (record?.questionnaire) {
    for (const key of Object.keys(base)) {
      const existing = record.questionnaire[key];
      if (existing) base[key] = { ...base[key], ...existing };
    }
    for (const key of Object.keys(record.questionnaire)) {
      if (!base[key]) base[key] = record.questionnaire[key];
    }
  }
  return base;
}

export function AnamnesisTab({
  patientId,
  patientReadOnly = false,
}: {
  patientId: string;
  patientReadOnly?: boolean;
}) {
  const queryClient = useQueryClient();

  const latestQuery = useQuery({
    queryKey: ["anamnesis", patientId],
    queryFn: () => anamnesisService.latest(patientId),
    enabled: !!patientId,
  });

  const historyQuery = useQuery({
    queryKey: ["anamnesis", patientId, "history"],
    queryFn: () => anamnesisService.history(patientId),
    enabled: !!patientId,
  });

  const [form, setForm] = useState<AnamnesisQuestionnaire>(defaultTemplate());
  const [notes, setNotes] = useState("");

  // Reidrata o formulário quando o registro mais recente chega.
  useEffect(() => {
    if (latestQuery.isSuccess) {
      setForm(buildInitial(latestQuery.data ?? null));
      setNotes(latestQuery.data?.notes ?? "");
    }
  }, [latestQuery.isSuccess, latestQuery.data]);

  const orderedKeys = useMemo(() => {
    const known = FIELD_ORDER.filter((k) => k in form);
    const extra = Object.keys(form).filter((k) => !FIELD_ORDER.includes(k));
    return [...known, ...extra];
  }, [form]);

  const mutation = useMutation({
    mutationFn: () =>
      anamnesisService.create(patientId, {
        questionnaire: form,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Anamnese salva",
        description: "Uma nova versão foi registrada no histórico.",
      });
      queryClient.invalidateQueries({ queryKey: ["anamnesis", patientId] });
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: "Não foi possível salvar",
        description: getErrorMessage(err, "Tente novamente."),
      }),
  });

  // ── Handlers ─────────────────────────────────────────────────────────
  function updateField(key: string, patch: Partial<AnamnesisField>) {
    setForm((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function toggleOption(key: string, option: string) {
    setForm((prev) => {
      const field = prev[key];
      const current = Array.isArray(field.value) ? (field.value as string[]) : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [key]: { ...field, value: next } };
    });
  }

  if (latestQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (latestQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível carregar a anamnese. Tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  const versionCount = historyQuery.data?.length ?? 0;
  const lastUpdated = latestQuery.data?.updated_at ?? latestQuery.data?.created_at;

  return (
    <div className="space-y-4" data-testid="anamnesis-tab">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Anamnese digital</CardTitle>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                {lastUpdated ? (
                  <>
                    Atualizada em {new Date(lastUpdated).toLocaleString("pt-BR")}
                    {versionCount > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <History className="h-3 w-3" /> {versionCount}{" "}
                        {versionCount === 1 ? "versão" : "versões"}
                      </Badge>
                    )}
                  </>
                ) : (
                  "Ainda não respondida — preencha e salve a primeira versão."
                )}
              </p>
            </div>
          </div>
          {!patientReadOnly && (
            <Button
              variant="accent"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              data-testid="anamnesis-save"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Salvar anamnese
                </>
              )}
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {patientReadOnly && (
            <Alert variant="destructive">
              <AlertDescription>
                Paciente anonimizado (LGPD): a anamnese está em modo somente leitura.
              </AlertDescription>
            </Alert>
          )}

          {orderedKeys.map((key) => {
            const field = form[key];
            const disabled = patientReadOnly;

            // ── checkbox com opções (multi-seleção) ──
            if (field.type === "checkbox" && Array.isArray(field.options)) {
              const selected = Array.isArray(field.value)
                ? (field.value as string[])
                : [];
              return (
                <div key={key} className="space-y-2">
                  <Label>{labelFor(key)}</Label>
                  <div className="flex flex-wrap gap-2">
                    {field.options.map((opt) => {
                      const active = selected.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleOption(key, opt)}
                          data-testid={`anamnesis-opt-${key}-${opt}`}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-border bg-card text-muted-foreground hover:bg-secondary/60",
                            disabled && "cursor-not-allowed opacity-50",
                          )}
                        >
                          {capitalize(opt)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // ── checkbox booleano (toggle sim/não) ──
            if (field.type === "checkbox") {
              const checked = field.value === true;
              return (
                <label
                  key={key}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => updateField(key, { value: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-accent focus:ring-accent"
                    data-testid={`anamnesis-bool-${key}`}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {labelFor(key)}
                  </span>
                </label>
              );
            }

            // ── texto livre ──
            return (
              <div key={key} className="space-y-2">
                <Label htmlFor={`anamnesis-${key}`}>{labelFor(key)}</Label>
                <Textarea
                  id={`anamnesis-${key}`}
                  rows={2}
                  disabled={disabled}
                  value={typeof field.value === "string" ? field.value : ""}
                  onChange={(e) => updateField(key, { value: e.target.value })}
                  placeholder="Descreva…"
                  data-testid={`anamnesis-text-${key}`}
                />
              </div>
            );
          })}

          <div className="space-y-2">
            <Label htmlFor="anamnesis-notes">Notas do profissional</Label>
            <Textarea
              id="anamnesis-notes"
              rows={3}
              disabled={patientReadOnly}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações clínicas adicionais…"
              data-testid="anamnesis-notes"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
