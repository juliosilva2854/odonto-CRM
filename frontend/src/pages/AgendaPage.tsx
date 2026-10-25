import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DateSelectArg, EventClickArg } from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { format, isSameDay, parseISO } from "date-fns";
import { 
  CalendarDays, RefreshCw, Clock, CheckCircle2, 
  AlertCircle, Users, ChevronRight, Plus, SlidersHorizontal 
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
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

  // Estados dos Filtros (Começa mostrando todos)
  const [visibleStatuses, setVisibleStatuses] = useState<Set<string>>(
    new Set(Object.keys(APPOINTMENT_STATUS_VISUAL))
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["agenda", "appointments", viewRange?.start.toISOString(), viewRange?.end.toISOString()],
    queryFn: () => agendaService.listAppointments({
      start: viewRange!.start.toISOString(),
      end: viewRange!.end.toISOString(),
    }),
    enabled: !!viewRange,
    refetchOnWindowFocus: false,
  });

  // Filtra os agendamentos com base nos status selecionados
  const filteredAppointments = useMemo(() => {
    if (!data) return [];
    return data.filter(apt => visibleStatuses.has(apt.status));
  }, [data, visibleStatuses]);

  const today = new Date();
  const todayAppointments = filteredAppointments.filter(apt => isSameDay(parseISO(apt.starts_at), today));
  const waitingRoom = filteredAppointments.filter(apt => apt.status === "waiting_room");
  const confirmedToday = todayAppointments.filter(apt => apt.status === "confirmed" || apt.status === "in_progress").length;
  
  const upcomingAppointments = [...todayAppointments]
    .filter(apt => parseISO(apt.starts_at) >= today && apt.status !== "cancelled" && apt.status !== "no_show")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 5);

  const events = useMemo(() =>
    filteredAppointments.map((a) => {
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
    [filteredAppointments]
  );

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

  function toggleStatus(status: string) {
    const next = new Set(visibleStatuses);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    setVisibleStatuses(next);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[1600px] mx-auto animate-in fade-in duration-500" data-testid="agenda-page">
      
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between py-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agenda</h1>
          <p className="text-sm text-slate-500 font-medium">Gestão de fluxo e atendimentos.</p>
        </div>
        <div className="flex items-center gap-3">
          
          {/* Botão de Filtros */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="bg-white">
                <SlidersHorizontal className="h-4 w-4 mr-2 text-slate-500" /> Filtros
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Status Visíveis</p>
              <ul className="space-y-2">
                {Object.entries(APPOINTMENT_STATUS_VISUAL).map(([key, v]) => (
                  <li key={key}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                        checked={visibleStatuses.has(key)}
                        onChange={() => toggleStatus(key)}
                      />
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: v.bg, border: `1px solid ${v.border}` }} />
                      {v.label}
                    </label>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="bg-white">
            <RefreshCw className={cn("h-4 w-4 mr-2 text-slate-400", isFetching && "animate-spin")} /> Atualizar
          </Button>
          <Button size="sm" onClick={() => { setDefaultStart(null); setDefaultEnd(null); setSheetOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20">
            <Plus className="h-4 w-4 mr-2" /> Novo Agendamento
          </Button>
        </div>
      </header>

      {/* ─── Layout Principal ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 flex-1 min-h-0 pb-4">
        
        {/* ─── COLUNA ESQUERDA: CALENDÁRIO ─── */}
        <Card className="agenda-card overflow-hidden border-slate-200 shadow-sm flex flex-col h-full">
          <CardContent className="p-0 flex-1 relative min-h-0">
            {isError ? (
              <Alert variant="destructive" className="m-6">
                <AlertDescription>Não foi possível carregar a agenda.</AlertDescription>
              </Alert>
            ) : (
              <>
                {isLoading && (
                  <div className="absolute inset-0 z-10 flex items-start justify-center pt-20 bg-white/50 backdrop-blur-sm">
                    <Skeleton className="h-72 w-full mx-6" />
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
                  height="100%"
                  expandRows
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
              </>
            )}
          </CardContent>
        </Card>

        {/* ─── COLUNA DIREITA: PAINEL DE CONTEXTO ─── */}
        <div className="flex flex-col gap-4 h-full min-h-0">
          
          {/* Resumo do Dia */}
          <Card className="bg-slate-900 text-white border-0 shadow-lg relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-2xl rounded-full" />
            <CardContent className="p-5 relative z-10">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-3xl font-bold">{todayAppointments.length}</p>
                  <p className="text-xs text-slate-400 font-medium">Consultas Hoje</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {confirmedToday} confirmadas
                  </span>
                  <span className="text-sm font-bold text-amber-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {waitingRoom.length} na espera
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sala de Espera */}
          <Card className="border-slate-200 shadow-sm flex flex-col min-h-0 shrink-0">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl shrink-0">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Na Sala de Espera
              </h3>
            </div>
            <CardContent className="p-2 overflow-y-auto max-h-[200px] custom-scrollbar">
              {waitingRoom.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-6 h-6 text-slate-200 mx-auto mb-1" />
                  <p className="text-[11px] text-slate-500 font-medium">Ninguém aguardando.</p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {waitingRoom.map(apt => (
                    <li key={apt.id} className="flex items-center gap-3 p-2 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors" onClick={() => { setSelectedAppointment(apt); setDialogOpen(true); }}>
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Users className="w-3 h-3 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{apt.patient_name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{format(parseISO(apt.starts_at), "HH:mm")} · {apt.room_name}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Próximos Atendimentos */}
          <Card className="border-slate-200 shadow-sm flex flex-col flex-1 min-h-0">
            <div className="p-4 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500" /> Próximos
              </h3>
            </div>
            <CardContent className="p-2 overflow-y-auto custom-scrollbar">
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-6 h-6 text-slate-200 mx-auto mb-1" />
                  <p className="text-[11px] text-slate-500 font-medium">Sem consultas restantes.</p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {upcomingAppointments.map(apt => {
                    const visual = APPOINTMENT_STATUS_VISUAL[apt.status];
                    return (
                      <li key={apt.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors" onClick={() => { setSelectedAppointment(apt); setDialogOpen(true); }}>
                        <div className="flex flex-col items-center justify-center w-9 h-9 rounded-md bg-slate-100 text-slate-700 shrink-0 border border-slate-200">
                          <span className="text-[10px] font-bold">{format(parseISO(apt.starts_at), "HH:mm")}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{apt.patient_name}</p>
                          <p className="text-[10px] text-slate-500 font-medium truncate">{visual.label}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      <NewAppointmentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        knownAppointments={filteredAppointments}
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
      </div>
    </div>
  );
}
