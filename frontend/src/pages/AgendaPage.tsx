import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DateSelectArg, EventClickArg } from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, CalendarPlus, RefreshCw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NewAppointmentSheet } from "@/components/agenda/NewAppointmentSheet";
import { APPOINTMENT_STATUS_VISUAL } from "@/components/agenda/appointment-status";
import { cn } from "@/lib/utils";
import { agendaService } from "@/services/agenda.service";
import type { AppointmentBoardItem } from "@/types/api";

import "./agenda-fullcalendar.css";

export default function AgendaPage() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [defaultStart, setDefaultStart] = useState<Date | null>(null);
  const [defaultEnd, setDefaultEnd] = useState<Date | null>(null);
  const [currentTitle, setCurrentTitle] = useState<string>("");
  const [viewRange, setViewRange] = useState<{ start: Date; end: Date } | null>(null);

  // ── Fetch appointments for the current viewport ───────────────────────────
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: [
      "agenda",
      "appointments",
      viewRange?.start.toISOString(),
      viewRange?.end.toISOString(),
    ],
    queryFn: () =>
      agendaService.listAppointments({
        start: viewRange!.start.toISOString(),
        end: viewRange!.end.toISOString(),
      }),
    enabled: !!viewRange,
    refetchOnWindowFocus: false,
  });

  const appointments: AppointmentBoardItem[] = data ?? [];

  // ── Convert to FullCalendar events ────────────────────────────────────────
  const events = useMemo(
    () =>
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
    [appointments],
  );

  // ── Interactions ──────────────────────────────────────────────────────────
  function handleSelect(arg: DateSelectArg) {
    setDefaultStart(arg.start);
    setDefaultEnd(arg.end);
    setSheetOpen(true);
    arg.view.calendar.unselect();
  }

  function handleEventClick(_arg: EventClickArg) {
    // Future S6.1: open a detail drawer with status transitions / check-in.
    // For now keep noop \u2014 user requested a "basic" interaction layer.
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5" data-testid="agenda-page">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Operação
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Agenda
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Trava tripla anti-conflito (dentista · sala · paciente). Clique em
            um horário vazio para abrir o slide-over de novo agendamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="agenda-refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Atualizar
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={() => {
              setDefaultStart(null);
              setDefaultEnd(null);
              setSheetOpen(true);
            }}
            data-testid="agenda-new-button"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Novo agendamento
          </Button>
        </div>
      </header>

      {/* Legend + view info */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarDays className="h-4 w-4 text-accent" />
            {currentTitle || "Carregando…"}
          </div>
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {(["scheduled", "confirmed", "waiting_room", "in_progress", "completed", "cancelled"] as const).map((s) => {
              const v = APPOINTMENT_STATUS_VISUAL[s];
              return (
                <li key={s} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm ring-1 ring-inset"
                    style={{ backgroundColor: v.bg, color: v.border }}
                  />
                  {v.label}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Calendar */}
      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Não foi possível carregar a agenda. Tente atualizar a página.
          </AlertDescription>
        </Alert>
      ) : (
        <Card className="agenda-card overflow-hidden">
          <CardContent className="p-3 sm:p-5">
            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-start justify-center pt-20">
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
                buttonText={{
                  today: "Hoje",
                  month: "Mês",
                  week: "Semana",
                  day: "Dia",
                }}
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
                contentHeight={620}
                stickyHeaderDates
                selectable
                selectMirror
                select={handleSelect}
                events={events}
                eventClick={handleEventClick}
                eventContent={renderEventContent}
                datesSet={(arg) => {
                  setCurrentTitle(arg.view.title);
                  setViewRange({ start: arg.start, end: arg.end });
                }}
                slotLabelFormat={{
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }}
                dayHeaderFormat={{
                  weekday: "short",
                  day: "2-digit",
                  omitCommas: true,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* New appointment sheet */}
      <NewAppointmentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        knownAppointments={appointments}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Custom event renderer (Modern Premium card)
// ──────────────────────────────────────────────────────────────────────────────
function renderEventContent(arg: {
  event: { extendedProps: { appointment: AppointmentBoardItem } };
  timeText: string;
}) {
  const appointment = arg.event.extendedProps.appointment;
  const v = APPOINTMENT_STATUS_VISUAL[appointment.status];
  return (
    <div
      className="agenda-event"
      data-testid={`agenda-event-${appointment.id}`}
      style={{ "--event-border": v.border } as React.CSSProperties}
    >
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
      <span className="agenda-event-status" style={{ color: v.text }}>
        {v.label}
      </span>
      <ScreenReaderOnly>
        {appointment.patient_name} ·{" "}
        {format(new Date(appointment.starts_at), "d MMM HH:mm", { locale: ptBR })}{" "}
        — {format(new Date(appointment.ends_at), "HH:mm")} · {v.label}
      </ScreenReaderOnly>
    </div>
  );
}

function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
