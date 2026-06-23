import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  IdCard,
  Lock,
  LockOpen,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OdontogramChart } from "@/components/odontogram/OdontogramChart";
import { ToothDetailSheet } from "@/components/odontogram/ToothDetailSheet";
import { groupByTooth } from "@/components/odontogram/fdi";
import { cn, initialsOf } from "@/lib/utils";
import { clinicalRecordsService } from "@/services/clinical-records.service";
import { odontogramService } from "@/services/odontogram.service";
import { patientsService } from "@/services/patients.service";

export default function PatientRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const patientId = id ?? "";

  const patientQuery = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => patientsService.get(patientId),
    enabled: !!patientId,
  });

  const odontogramQuery = useQuery({
    queryKey: ["odontogram", patientId],
    queryFn: () => odontogramService.snapshot(patientId),
    enabled: !!patientId,
  });

  // First page of clinical records — drives the lock badge.
  const recordsQuery = useQuery({
    queryKey: ["clinical-records", patientId, { page: 1, page_size: 1 }],
    queryFn: () => clinicalRecordsService.list(patientId, { page: 1, page_size: 1 }),
    enabled: !!patientId,
    retry: false,
  });

  const lockState = useMemo(() => deriveLockState(recordsQuery.data?.items?.[0]), [recordsQuery.data]);

  const groupedByTooth = useMemo(
    () => (odontogramQuery.data ? groupByTooth(odontogramQuery.data.procedures) : {}),
    [odontogramQuery.data],
  );

  const proceduresForSelected =
    selectedTooth && groupedByTooth[selectedTooth] ? groupedByTooth[selectedTooth] : [];

  function handleSelectTooth(fdi: string) {
    setSelectedTooth(fdi);
    setSheetOpen(true);
  }

  if (patientQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (patientQuery.isError || !patientQuery.data) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <Alert variant="destructive">
          <AlertDescription>
            Não foi possível carregar o paciente. Verifique o link ou tente novamente.
          </AlertDescription>
        </Alert>
        <Button variant="ghost" onClick={() => navigate("/patients")} className="mt-4">
          <ArrowLeft className="h-4 w-4" /> Voltar para pacientes
        </Button>
      </div>
    );
  }

  const patient = patientQuery.data;
  const isAnonymized = !!patient.anonymized_at;

  return (
    <div className="mx-auto max-w-6xl space-y-6" data-testid="patient-record-page">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate("/patients")}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        data-testid="back-to-patients"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Pacientes
      </button>

      {/* Header card */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-indigo-500 text-lg font-semibold text-white shadow-xs">
              {initialsOf(patient.full_name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold leading-tight text-foreground">
                  {patient.full_name}
                </h1>
                {patient.social_name && (
                  <Badge variant="outline" className="text-xs">
                    Nome social: {patient.social_name}
                  </Badge>
                )}
                {patient.is_minor && (
                  <Badge variant="warning">
                    <Sparkles className="h-3 w-3" /> Menor de idade
                  </Badge>
                )}
                {isAnonymized && (
                  <Badge variant="destructive">Anonimizado (LGPD)</Badge>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {patient.cpf && (
                  <span className="inline-flex items-center gap-1">
                    <IdCard className="h-3.5 w-3.5" /> CPF {patient.cpf}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {patient.phone_e164}
                </span>
                {patient.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {patient.email}
                  </span>
                )}
                {patient.birth_date && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />{" "}
                    {new Date(patient.birth_date).toLocaleDateString("pt-BR")}
                  </span>
                )}
                {patient.address_city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {patient.address_city}
                    {patient.address_state ? `/${patient.address_state}` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          <CfoLockBadge lockState={lockState} />
        </CardContent>
      </Card>

      {/* Anonymized banner */}
      {isAnonymized && (
        <Alert variant="destructive">
          <AlertDescription>
            Este paciente foi anonimizado por solicitação LGPD em{" "}
            {new Date(patient.anonymized_at!).toLocaleString("pt-BR")}. Edições estão bloqueadas.
          </AlertDescription>
        </Alert>
      )}

      {/* Odontogram */}
      <OdontogramChart
        snapshot={odontogramQuery.data}
        isLoading={odontogramQuery.isLoading}
        onSelectTooth={handleSelectTooth}
        selectedTooth={selectedTooth}
      />

      {/* Slide-over */}
      <ToothDetailSheet
        patientId={patientId}
        toothFdi={selectedTooth}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        proceduresForTooth={proceduresForSelected}
        disabled={isAnonymized || lockState.isLocked}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// CFO Lock derivation
// ─────────────────────────────────────────────────────────────────────

interface LockState {
  hasRecord: boolean;
  isLocked: boolean;
  locksAt: Date | null;
  hoursUntilLock: number | null;
}

function deriveLockState(record: { is_locked?: boolean; locks_at?: string | null } | undefined): LockState {
  if (!record) {
    return { hasRecord: false, isLocked: false, locksAt: null, hoursUntilLock: null };
  }
  const locksAt = record.locks_at ? new Date(record.locks_at) : null;
  const now = Date.now();
  const hoursUntilLock = locksAt
    ? Math.max(0, Math.round((locksAt.getTime() - now) / (60 * 60 * 1000)))
    : null;
  return {
    hasRecord: true,
    isLocked: !!record.is_locked,
    locksAt,
    hoursUntilLock,
  };
}

function CfoLockBadge({ lockState }: { lockState: LockState }) {
  if (!lockState.hasRecord) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-3">
        <UserIcon className="h-5 w-5 text-muted-foreground" />
        <div className="text-xs">
          <p className="font-medium text-foreground">Sem prontuário criado</p>
          <p className="text-muted-foreground">Crie a primeira evolução clínica para ativar o lock CFO.</p>
        </div>
      </div>
    );
  }

  if (lockState.isLocked) {
    return (
      <div
        data-testid="cfo-lock-badge"
        className={cn(
          "flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3",
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <Lock className="h-4 w-4" />
        </div>
        <div className="text-xs">
          <p className="font-semibold text-destructive">Prontuário bloqueado</p>
          <p className="text-destructive/80">
            Janela CFO de 24h expirou. Use adendos para registrar mudanças.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="cfo-lock-badge"
      className={cn(
        "flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-3",
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
        <LockOpen className="h-4 w-4" />
      </div>
      <div className="text-xs">
        <p className="font-semibold text-success">Prontuário aberto</p>
        <p className="text-success/80">
          <ShieldCheck className="inline h-3 w-3 -mt-0.5" />{" "}
          Edição liberada por mais ~{lockState.hoursUntilLock ?? 0}h (lock CFO).
        </p>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Skeleton className="h-6 w-32" />
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-14 w-56 rounded-xl" />
        </CardContent>
      </Card>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}
