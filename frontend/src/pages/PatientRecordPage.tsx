import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInYears, parseISO } from "date-fns";
import {
  ArrowLeft, CalendarDays, IdCard, Lock, LockOpen, Mail,
  MapPin, Phone, ReceiptText, Sparkles,
  Stethoscope, User as UserIcon, AlertTriangle, CalendarPlus,
  FileText, Activity, Clock, HeartPulse, ShieldCheck
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClinicalEvolutionTab } from "@/components/clinical/ClinicalEvolutionTab";
import { OdontogramChart } from "@/components/odontogram/OdontogramChart";
import { ToothDetailSheet } from "@/components/odontogram/ToothDetailSheet";
import { groupByTooth } from "@/components/odontogram/fdi";
import { QuotesTab } from "@/components/quotes/QuotesTab";
import { initialsOf } from "@/lib/utils";
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

  const recordsQuery = useQuery({
    queryKey: ["clinical-records", patientId, { page: 1, page_size: 1 }],
    queryFn: () => clinicalRecordsService.list(patientId, { page: 1, page_size: 1 }),
    enabled: !!patientId,
    retry: false,
  });

  const lockState = useMemo(() => deriveLockState(recordsQuery.data?.items?.[0]), [recordsQuery.data]);

  const groupedByTooth = useMemo(
    () => (odontogramQuery.data ? groupByTooth(odontogramQuery.data.procedures) : {}),
    [odontogramQuery.data]
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
  
  const age = patient.birth_date 
    ? differenceInYears(new Date(), parseISO(patient.birth_date)) 
    : null;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 animate-in fade-in duration-500" data-testid="patient-record-page">
      
      <button
        type="button"
        onClick={() => navigate("/patients")}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para lista de pacientes
      </button>

      {/* ─── Cartão de Perfil do Paciente ─── */}
      <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            
            {/* Coluna 1: Avatar + Nome + Info Básica */}
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-xl font-bold text-white shadow-md">
                {initialsOf(patient.full_name)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold leading-tight text-slate-900">
                    {patient.full_name}
                  </h1>
                  {patient.is_minor && (
                    <Badge variant="warning" className="bg-amber-100 text-amber-800 text-[10px]">Menor</Badge>
                  )}
                  {isAnonymized && (
                    <Badge variant="destructive" className="text-[10px]">Anonimizado (LGPD)</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                  {patient.cpf && <span className="flex items-center gap-1"><IdCard className="h-3.5 w-3.5 text-slate-400" /> {patient.cpf}</span>}
                  <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-slate-400" /> {patient.phone_e164}</span>
                  {patient.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-slate-400" /> {patient.email}</span>}
                </div>
              </div>
            </div>

            {/* Coluna 2: Dados Clínicos (Idade, Endereço) */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 font-medium border-t xl:border-t-0 xl:border-l border-slate-100 pt-4 xl:pt-0 xl:pl-6">
               <div className="flex flex-col gap-1">
                 <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-slate-400" /> Nasc: {patient.birth_date ? `${format(parseISO(patient.birth_date), "dd/MM/yyyy")} (${age} anos)` : "—"}</span>
                 <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-slate-400" /> Cadastro: {format(parseISO(patient.created_at), "dd/MM/yyyy")}</span>
               </div>
               {patient.address_city && (
                 <span className="flex items-center gap-1 max-w-[200px]"><MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {patient.address_street}, {patient.address_number} - {patient.address_city}/{patient.address_state}</span>
               )}
            </div>

            {/* Coluna 3: Status e Ação */}
            <div className="flex flex-col gap-2 shrink-0 border-t xl:border-t-0 xl:border-l border-slate-100 pt-4 xl:pt-0 xl:pl-6">
              <CfoLockBadge lockState={lockState} />
              <Button variant="outline" className="w-full border-slate-200 bg-white shadow-sm h-9 text-xs">
                <CalendarPlus className="h-4 w-4 mr-2 text-slate-400" /> Agendar Consulta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Banner de Anonimizado ─── */}
      {isAnonymized && (
        <Alert variant="destructive" className="bg-rose-50 border-rose-200">
          <AlertDescription className="text-rose-800 font-medium text-sm">
            Este paciente foi anonimizado por solicitação LGPD em {new Date(patient.anonymized_at!).toLocaleString("pt-BR")}. Edições estão bloqueadas.
          </AlertDescription>
        </Alert>
      )}

      {/* ─── Layout Principal (Abas à esquerda, Resumo à direita) ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
        
        {/* Coluna Esquerda: Abas do Prontuário */}
        <div className="min-w-0">
          <Tabs defaultValue="odontogram" className="w-full" data-testid="patient-tabs">
            <TabsList className="bg-slate-100/50 p-1 border border-slate-200 w-full justify-start overflow-x-auto">
              <TabsTrigger value="odontogram" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-md px-4">
                <Sparkles className="h-4 w-4 mr-2" /> Odontograma
              </TabsTrigger>
              <TabsTrigger value="evolution" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-md px-4">
                <Stethoscope className="h-4 w-4 mr-2" /> Evolução Clínica
              </TabsTrigger>
              <TabsTrigger value="quotes" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-md px-4">
                <ReceiptText className="h-4 w-4 mr-2" /> Orçamentos
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="odontogram" className="m-0 focus-visible:outline-none">
                <OdontogramChart
                  snapshot={odontogramQuery.data}
                  isLoading={odontogramQuery.isLoading}
                  onSelectTooth={handleSelectTooth}
                  selectedTooth={selectedTooth}
                />
              </TabsContent>

              <TabsContent value="evolution" className="m-0 focus-visible:outline-none">
                <ClinicalEvolutionTab
                  patientId={patientId}
                  patientReadOnly={isAnonymized}
                />
              </TabsContent>

              <TabsContent value="quotes" className="m-0 focus-visible:outline-none">
                <QuotesTab patientId={patientId} patientReadOnly={isAnonymized} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Coluna Direita: Resumo Clínico */}
        <aside className="space-y-4">
          
          {/* Card de Alergias / Condições */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-500" /> Alertas Clínicos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Alergias</p>
                    <p className="text-xs text-slate-500 mt-0.5">Nenhuma alergia registrada na anamnese.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Activity className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Condições Sistêmicas</p>
                    <p className="text-xs text-slate-500 mt-0.5">Nenhuma condição registrada.</p>
                  </div>
                </div>
              </div>
              <Button variant="link" className="w-full text-xs text-indigo-600 mt-2 h-auto p-0">
                Preencher Anamnese completa &rarr;
              </Button>
            </CardContent>
          </Card>

          {/* Card de Última Atividade */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" /> Última Atividade
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100">
                {/* Atividade 1 */}
                <div className="relative flex items-start gap-4">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 ring-4 ring-white mt-0.5 z-10">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-600"></div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Orçamento criado</p>
                    <p className="text-[10px] text-slate-500">Há 2 dias</p>
                  </div>
                </div>
                {/* Atividade 2 */}
                <div className="relative flex items-start gap-4">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-100 ring-4 ring-white mt-0.5 z-10">
                    <div className="h-1.5 w-1.5 rounded-full bg-teal-600"></div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Evolução registrada</p>
                    <p className="text-[10px] text-slate-500">Há 5 dias</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dica de Segurança */}
          <div className="flex items-start gap-2 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
            <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
              Todos os acessos a este prontuário estão sendo registrados em conformidade com a LGPD.
            </p>
          </div>

        </aside>
      </div>

      {/* Slide-over (Compartilhado) */}
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

// ─── CFO Lock derivation e Badge ───
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
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
        <UserIcon className="h-4 w-4 text-slate-400" />
        <p className="text-[11px] font-medium text-slate-500">Sem evolução criada</p>
      </div>
    );
  }

  if (lockState.isLocked) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
        <Lock className="h-4 w-4 text-rose-500" />
        <p className="text-[11px] font-bold text-rose-700">Prontuário Bloqueado (CFO)</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
      <LockOpen className="h-4 w-4 text-emerald-500" />
      <p className="text-[11px] font-bold text-emerald-700">
        Editável por mais ~{lockState.hoursUntilLock ?? 0}h
      </p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <Skeleton className="h-4 w-32" />
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
        <Skeleton className="h-[600px] rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
