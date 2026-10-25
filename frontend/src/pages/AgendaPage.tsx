import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DateSelectArg, EventClickArg } from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CalendarDays, CalendarPlus, RefreshCw, Clock, 
  CheckCircle2, AlertCircle, Users, ChevronRight 
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NewAppointmentSheet } from "@/components/agenda/NewAppointmentSheet";
import { AppointmentDetailDialog } from "@/components/agenda/AppointmentDetailDialog";
import { APPOINTMENT_STATUS_VISUAL } from "@/components/agenda/appointment-status";
import { cn } from "@/lib/utils";
import { agendaService } from "@/services/agenda.service";
import type { AppointmentBoardItem } from "@/types/api";

import "./agenda-fullcalendar.css";

export default function AgendaPage() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentBoardItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [defaultStart, setDefaultStart] = useState<Date | null>(null);
  const [defaultEnd, setDefaultEnd] = useState<Date | null>(null);
  const [viewRange, setViewRange] = useState<{ start: Date; end: Date } | null>(null);

  // ─── Busca de Dados ───
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["agenda", "appointments", viewRange?.start.toISOString(), viewRange?.end.toISOString()],
    queryFn: () => agendaService.listAppointments({
      start: viewRange!.start.toISOString(),
      end: viewRange!.end.toISOString(),
    }),
    enabled: !!viewRange,
    refetchOnWindowFocus: false,
  });

  const appointments: AppointmentBoardItem[] = data ?? [];

  // ─── Cálculos do Painel Lateral ───
  const today = new Date();
  const todayAppointments = appointments.filter(apt => isSameDay(parseISO(apt.starts_at), today));
  const waitingRoom = appointments.filter(apt => apt.status === "waiting_room");
  const confirmedToday = todayAppointments.filter(apt => apt.status === "confirmed" || apt.status === "in_progress").length;
  
  // Próximas consultas (ordenadas por horário)
  const upcomingAppointments = [...todayAppointments]
    .filter(apt => parseISO(apt.starts_at) >= today && apt.status !== "cancelled" && apt.status !== "no_show")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 4);

  // ─── Eventos do FullCalendar ───
  const events = useMemo(() =>
    appointments.map((a) => {
      const visual = APPOINTMENT_STATUS_VISUAL[a.status];
      return {
        id: a.id,
        title: a.patient_name,
        start: a.starts_at,
        end: a.ends_at,
        backgroundColor: visual.bg,
        borderColor: visual.border,
        textColor: visual.text,
        extendedProps: { appointment: a },
      };
    }),
    [appointments]
  );

  // ─── Ações ───
  function handleSelect(arg: DateSelectArg) {
    setDefaultStart(arg.start);
    setDefaultEnd(arg.end);
    setSheetOpen(true);
    arg.view.calendar.unselect();
  }

  function handleEventClick(arg: EventClickArg) {
    const apt = arg.event.extendedProps.appointment as AppointmentBoardItem;
    setSelectedAppointment(apt);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 animate-in fade-in duration-500" data-testid="agenda-page">
      
      {/* ─── Header ─── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Operação</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Agenda Inteligente</h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Visão geral do dia, fila de espera e agendamentos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="bg-white">
            <RefreshCw className={cn("h-4 w-4 mr-2 text-slate-400", isFetching && "animate-spin")} /> Atualizar
          </Button>
          <Button size="sm" onClick={() => { setDefaultStart(null); setDefaultEnd(null); setSheetOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20">
            <CalendarPlus className="h-4 w-4 mr-2" /> Novo Agendamento
          </Button>
        </div>
      </header>

      {/* ─── Layout Principal ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        
        {/* ─── COLUNA ESQUERDA: CALENDÁRIO ─── */}
        <div className="space-y-4">
          {isError ? (
            <Alert variant="destructive">
              <AlertDescription>Não foi possível carregar a agenda. Tente atualizar.</AlertDescription>
            </Alert>
          ) : (
            <Card className="agenda-card overflow-hidden border-slate-200 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="relative">
                  {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-start justify-center pt-20 bg-white/50 backdrop-blur-sm">
                      <Skeleton className="h-72 w-full" />
                    </div>
                  )}
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    headerToolbar={{
                      left: "prev,next today",
                      center: "title",
                      right: "timeGridDay,timeGridWeek,dayGridMonth",
                    }}
                    buttonText={{ today: "Hoje", month: "Mês", week: "Semana", day: "Dia" }}
                    locale={ptBrLocale}
                    firstDay={1}
                    slotMinTime="07:00:00"
                    slotMaxTime="20:00:00"
                    slotDuration="00:30:00"
                    slotLabelInterval="01:00:00"
                    allDaySlot={false}
                    nowIndicator
                    weekends
                    expandRows
                    height="auto"
                    contentHeight={650}
                    stickyHeaderDates
                    selectable
                    selectMirror
                    select={handleSelect}
                    events={events}
                    eventClick={handleEventClick}
                    eventContent={renderEventContent}
                    datesSet={(arg) => {
                      setViewRange({ start: arg.start, end: arg.end });
                    }}
                    slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                    dayHeaderFormat={{ weekday: "short", day: "2-digit", omitCommas: true }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── COLUNA DIREITA: PAINEL DE CONTEXTO ─── */}
        <aside className="space-y-5">
          
          {/* Resumo do Dia */}
          <Card className="bg-slate-900 text-white border-0 shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-2xl rounded-full" />
            <CardContent className="p-6 relative z-10">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-400" /> Resumo de Hoje
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">{todayAppointments.length}</p>
                  <p className="text-xs text-slate-400">Consultas agendadas</p>
                </div>
                
                <div className="flex items-center gap-4 pt-4 border-t border-slate-700/50">
                  <div className="flex-1">
                    <p className="text-lg font-bold text-emerald-400">{confirmedToday}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Confirmadas</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-amber-400">{waitingRoom.length}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Na Espera</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sala de Espera */}
          <Card className="border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Sala de Espera
              </h3>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {waitingRoom.length}
              </span>
            </div>
            <CardContent className="p-2">
              {waitingRoom.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">Ninguém aguardando.</p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {waitingRoom.map(apt => (
                    <li key={apt.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors" onClick={() => { setSelectedAppointment(apt); setDialogOpen(true); }}>
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{apt.patient_name}</p>
                        <p className="text-[10px] text-slate-500">{format(parseISO(apt.starts_at), "HH:mm")} · {apt.professional_name}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Próximos Atendimentos */}
          <Card className="border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Próximos Atendimentos
              </h3>
            </div>
            <CardContent className="p-2">
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">Sem consultas restantes hoje.</p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {upcomingAppointments.map(apt => {
                    const visual = APPOINTMENT_STATUS_VISUAL[apt.status];
                    return (
                      <li key={apt.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors" onClick={() => { setSelectedAppointment(apt); setDialogOpen(true); }}>
                        <div className="flex flex-col items-center justify-center w-10 h-10 rounded-md bg-slate-100 text-slate-700 shrink-0">
                          <span className="text-[10px] font-bold">{format(parseISO(apt.starts_at), "HH:mm")}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{apt.patient_name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{visual.label}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

        </aside>
      </div>

      {/* Modais */}
      <NewAppointmentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        knownAppointments={appointments}
      />
      
      {selectedAppointment && (
        <AppointmentDetailDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          appointment={selectedAppointment}
        />
      )}
    </div>
  );
}

// ─── Renderização Customizada do Evento ───
function renderEventContent(arg: any) {
  const appointment = arg.event.extendedProps.appointment as AppointmentBoardItem;
  const v = APPOINTMENT_STATUS_VISUAL[appointment.status];
  return (
    <div className="agenda-event" data-testid={`agenda-event-${appointment.id}`}>
      <div className="agenda-event-time">
        <span className="agenda-event-dot" style={{ backgroundColor: v.border }} />
        {arg.timeText}
      </div>
      <div className="agenda-event-name" title={appointment.patient_name}>
        {appointment.patient_name}
      </div>
      <div className="agenda-event-meta">
        {appointment.room_name}
        {appointment.procedure_hint && (
          <>
            <span className="mx-1">·</span>
            {appointment.procedure_hint}
          </>
        )}
      </div>
    </div>
  );
}
