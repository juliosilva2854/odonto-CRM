import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import { CalendarPlus, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { PatientPicker } from "@/components/agenda/PatientPicker";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { agendaService } from "@/services/agenda.service";
import type {
  AppointmentBoardItem,
  AppointmentCreatePayload,
} from "@/types/api";

interface NewAppointmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStart?: Date | null;
  defaultEnd?: Date | null;
  /** Existing appointments (for the current viewport) used to populate the
   *  dentist dropdown when no dedicated endpoint exists. */
  knownAppointments: AppointmentBoardItem[];
}

export function NewAppointmentSheet({
  open,
  onOpenChange,
  defaultStart,
  defaultEnd,
  knownAppointments,
}: NewAppointmentSheetProps) {
  const queryClient = useQueryClient();

  // ── Form state ────────────────────────────────────────────────
  const [patientId, setPatientId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [startsAt, setStartsAt] = useState<string>("");
  const [endsAt, setEndsAt] = useState<string>("");
  const [procedureHint, setProcedureHint] = useState("");
  const [notes, setNotes] = useState("");

  // ── Sync defaults when slot changes ───────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (defaultStart) setStartsAt(toLocalInput(defaultStart));
    if (defaultEnd) setEndsAt(toLocalInput(defaultEnd));
  }, [open, defaultStart, defaultEnd]);

  // Reset on close
  useEffect(() => {
    if (open) return;
    setPatientId(null);
    setProfessionalId("");
    setRoomId("");
    setProcedureHint("");
    setNotes("");
  }, [open]);

  // ── Rooms ──────────────────────────────────────────────────────
  const roomsQuery = useQuery({
    queryKey: ["agenda", "rooms"],
    queryFn: () => agendaService.listRooms(false),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // ── Professionals (derived from existing appointments) ────────────────────
  const professionals = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of knownAppointments) {
      if (!map.has(a.professional_id)) {
        map.set(a.professional_id, a.professional_name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [knownAppointments]);

  // ── Submit ──────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (payload: AppointmentCreatePayload) =>
      agendaService.createAppointment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda", "appointments"] });
      toast({
        variant: "success",
        title: "Agendamento criado",
        description: "O paciente foi adicionado à agenda.",
      });
      onOpenChange(false);
    },
    onError: (err) => {
      // 🔒 Trava Tripla: 409 Conflict → friendly toast in red
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 409) {
        toast({
          variant: "destructive",
          title: "Horário indisponível",
          description:
            "Conflito detectado: o dentista, a sala ou o paciente já possui agendamento neste horário.",
          duration: 6000,
        });
        return;
      }
      toast({
        variant: "destructive",
        title: "Não foi possível criar",
        description: getErrorMessage(err, "Verifique os dados e tente novamente."),
      });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!patientId || !professionalId || !roomId || !startsAt || !endsAt) return;

    mutation.mutate({
      patient_id: patientId,
      professional_id: professionalId,
      room_id: roomId,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      procedure_hint: procedureHint.trim() || null,
      notes: notes.trim() || null,
    });
  }

  const canSubmit =
    !!patientId &&
    !!professionalId &&
    !!roomId &&
    !!startsAt &&
    !!endsAt &&
    new Date(endsAt) > new Date(startsAt) &&
    !mutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col p-0 sm:max-w-lg"
        data-testid="new-appointment-sheet"
      >
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle>Novo agendamento</SheetTitle>
              <SheetDescription>
                Trava tripla anti-conflito: dentista · sala · paciente.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto px-6 py-5"
          data-testid="new-appointment-form"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appt-patient">Paciente</Label>
              <PatientPicker
                value={patientId}
                onChange={(id) => setPatientId(id)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="appt-prof">Dentista</Label>
                <SelectNative
                  id="appt-prof"
                  value={professionalId}
                  onChange={(v) => setProfessionalId(v)}
                  disabled={professionals.length === 0}
                  data-testid="appt-professional-select"
                >
                  <option value="">
                    {professionals.length === 0
                      ? "— cadastre primeiro—"
                      : "Selecione…"}
                  </option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </SelectNative>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appt-room">Cadeira / Sala</Label>
                <SelectNative
                  id="appt-room"
                  value={roomId}
                  onChange={(v) => setRoomId(v)}
                  disabled={roomsQuery.isLoading || (roomsQuery.data?.length ?? 0) === 0}
                  data-testid="appt-room-select"
                >
                  <option value="">
                    {roomsQuery.isLoading
                      ? "Carregando…"
                      : (roomsQuery.data?.length ?? 0) === 0
                        ? "Sem salas"
                        : "Selecione…"}
                  </option>
                  {(roomsQuery.data ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
            </div>

            {professionals.length === 0 && (
              <Alert variant="default" className="border-amber-200 bg-amber-50 text-amber-800">
                <AlertDescription className="text-xs">
                  Nenhum dentista listado ainda. Peça ao admin para cadastrar profissionais ou crie um agendamento via API uma única vez para popular esta lista.
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="appt-start">Início</Label>
                <Input
                  id="appt-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  data-testid="appt-starts-at"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appt-end">Fim</Label>
                <Input
                  id="appt-end"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  data-testid="appt-ends-at"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appt-hint">Procedimento (referência)</Label>
              <Input
                id="appt-hint"
                value={procedureHint}
                onChange={(e) => setProcedureHint(e.target.value)}
                placeholder="Ex: Avaliação ortodôntica"
                maxLength={180}
                data-testid="appt-procedure-hint"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appt-notes">Observações internas</Label>
              <Textarea
                id="appt-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Visível apenas para a equipe…"
                data-testid="appt-notes"
              />
            </div>
          </div>
        </form>

        <SheetFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={!canSubmit}
            onClick={(e) => {
              const form = (e.currentTarget.closest("[role='dialog']") as HTMLElement | null)?.querySelector(
                "[data-testid='new-appointment-form']",
              ) as HTMLFormElement | null;
              form?.requestSubmit();
            }}
            data-testid="appt-submit"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Agendando…
              </>
            ) : (
              <>
                <CalendarPlus className="h-4 w-4" /> Criar agendamento
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ────────────────────────────────────────────────────────────────────
// Native styled <select> (kept simple — no Radix select for now)
// ────────────────────────────────────────────────────────────────────

function SelectNative({
  className,
  onChange,
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  onChange: (v: string) => void;
}) {
  return (
    <select
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className,
      )}
      {...props}
    />
  );
}

function toLocalInput(d: Date): string {
  // <input type="datetime-local"> wants YYYY-MM-DDTHH:mm in local time.
  return format(d, "yyyy-MM-dd'T'HH:mm");
}
