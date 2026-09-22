import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DoorOpen, Loader2, Pencil, Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/api";
import { agendaService } from "@/services/agenda.service";
import type { Room, RoomCreatePayload } from "@/types/api";

export default function RoomsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);

  const roomsQuery = useQuery({
    queryKey: ["agenda", "rooms", "all"],
    queryFn: () => agendaService.listRooms(true),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["agenda", "rooms"] });

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(room: Room) {
    setEditing(room);
    setOpen(true);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="rooms-page">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Configurações
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Salas e Consultórios
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie as cadeiras e salas disponíveis para agendamento.
          </p>
        </div>
        <Button variant="accent" onClick={openNew} data-testid="new-room-button">
          <Plus className="h-4 w-4" /> Nova sala
        </Button>
      </header>

      <Card className="overflow-hidden">
        {roomsQuery.isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !roomsQuery.data || roomsQuery.data.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma sala cadastrada ainda.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roomsQuery.data.map((room) => (
                <TableRow key={room.id} data-testid={`room-row-${room.id}`}>
                  <TableCell className="font-medium text-foreground">
                    {room.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {room.description || "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ backgroundColor: room.color_hex }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {room.color_hex}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    {room.is_active ? (
                      <Badge variant="success">Ativa</Badge>
                    ) : (
                      <Badge variant="default">Inativa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(room)}
                      data-testid={`edit-room-${room.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <RoomSheet
        open={open}
        onOpenChange={setOpen}
        room={editing}
        onSaved={invalidate}
      />
    </div>
  );
}

function RoomSheet({
  open,
  onOpenChange,
  room,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  room: Room | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(room?.name ?? "");
      setDescription(room?.description ?? "");
      setColor(room?.color_hex ?? "#6366F1");
      setIsActive(room?.is_active ?? true);
      setError(null);
    }
  }, [open, room]);

  const mutation = useMutation({
    mutationFn: (payload: RoomCreatePayload) =>
      room
        ? agendaService.updateRoom(room.id, payload)
        : agendaService.createRoom(payload),
    onSuccess: () => {
      toast({
        variant: "success",
        title: room ? "Sala atualizada" : "Sala criada",
      });
      onSaved();
      onOpenChange(false);
    },
    onError: (err) =>
      setError(getErrorMessage(err, "Não foi possível salvar a sala.")),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 1) {
      setError("Informe o nome da sala.");
      return;
    }
    mutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      color_hex: color.toUpperCase(),
      is_active: isActive,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <DoorOpen className="h-5 w-5" />
            </div>
            <SheetTitle>{room ? "Editar sala" : "Nova sala"}</SheetTitle>
          </div>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto px-6 py-5"
          data-testid="room-form"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="r-name">Nome</Label>
              <Input
                id="r-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Consultório 1"
                data-testid="room-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-desc">Descrição</Label>
              <Textarea
                id="r-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Sala com raio-x acoplado"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-color">Cor</Label>
              <div className="flex items-center gap-3">
                <input
                  id="r-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-card"
                  data-testid="room-color"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="max-w-[140px]"
                />
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-input text-accent focus:ring-ring"
                data-testid="room-active"
              />
              Sala ativa
            </label>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </form>

        <SheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={mutation.isPending}
            onClick={() => {
              const form = document.querySelector(
                "[data-testid='room-form']",
              ) as HTMLFormElement | null;
              form?.requestSubmit();
            }}
            data-testid="room-submit"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
