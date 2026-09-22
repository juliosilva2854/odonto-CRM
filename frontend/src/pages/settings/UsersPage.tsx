import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Loader2,
  MoreHorizontal,
  ShieldCheck,
  UserMinus,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { usersService } from "@/services/users.service";
import { useAuthStore } from "@/store/auth";
import type { CurrentUser, UserRole } from "@/types/api";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "dentist", label: "Dentista" },
  { value: "reception", label: "Recepção" },
];

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  dentist: "Dentista",
  reception: "Recepção",
  assistant: "Auxiliar",
};

function RoleBadge({ role }: { role: UserRole }) {
  const variant =
    role === "admin"
      ? "accent"
      : role === "dentist"
        ? "success"
        : role === "reception"
          ? "default"
          : "outline";
  return <Badge variant={variant}>{ROLE_LABEL[role]}</Badge>;
}

function handleMutationError(err: unknown) {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  if (status === 409) {
    toast({
      variant: "destructive",
      title: "Ação bloqueada",
      description: "A clínica precisa ter ao menos um administrador ativo.",
    });
    return;
  }
  if (status === 422) {
    toast({
      variant: "destructive",
      title: "Ação não permitida",
      description: "Você não pode desativar a si mesmo.",
    });
    return;
  }
  toast({
    variant: "destructive",
    title: "Não foi possível concluir",
    description: getErrorMessage(err, "Tente novamente."),
  });
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<CurrentUser | null>(null);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => usersService.list(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["users"] });

  const deactivate = useMutation({
    mutationFn: (id: string) => usersService.deactivate(id),
    onSuccess: () => {
      toast({ variant: "success", title: "Usuário desativado" });
      invalidate();
    },
    onError: handleMutationError,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="users-page">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Configurações
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Equipe da Clínica
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Convide e gerencie os acessos da sua equipe.
          </p>
        </div>
        <Button
          variant="accent"
          onClick={() => setInviteOpen(true)}
          data-testid="invite-user-button"
        >
          <UserPlus className="h-4 w-4" /> Convidar usuário
        </Button>
      </header>

      <Card className="overflow-hidden">
        {usersQuery.isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !usersQuery.data || usersQuery.data.items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum usuário cadastrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.data.items.map((u) => (
                <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                  <TableCell className="font-medium text-foreground">
                    {u.full_name}
                    {currentUser?.id === u.id && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (você)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={u.role} />
                  </TableCell>
                  <TableCell>
                    {u.is_active ? (
                      <Badge variant="success">Ativo</Badge>
                    ) : (
                      <Badge variant="default">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          data-testid={`user-actions-${u.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setRoleTarget(u)}>
                          <ShieldCheck className="h-4 w-4" /> Alterar papel
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={!u.is_active}
                          onSelect={() => deactivate.mutate(u.id)}
                        >
                          <UserMinus className="h-4 w-4" /> Desativar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <InviteSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSaved={invalidate}
      />
      <RoleDialog
        user={roleTarget}
        onOpenChange={(v) => !v && setRoleTarget(null)}
        onSaved={invalidate}
      />
    </div>
  );
}

function InviteSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("dentist");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setFullName("");
      setRole("dentist");
      setError(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      usersService.invite({ email: email.trim(), full_name: fullName.trim(), role }),
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Convite enviado",
        description: "O usuário foi adicionado à equipe.",
      });
      onSaved();
      onOpenChange(false);
    },
    onError: (err) =>
      setError(getErrorMessage(err, "Não foi possível convidar o usuário.")),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("E-mail inválido.");
    if (fullName.trim().length < 1) return setError("Informe o nome.");
    mutation.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <UsersRound className="h-5 w-5" />
            </div>
            <SheetTitle>Convidar usuário</SheetTitle>
          </div>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto px-6 py-5"
          data-testid="invite-form"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="i-name">Nome completo</Label>
              <Input
                id="i-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. João Lima"
                data-testid="invite-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="i-email">E-mail</Label>
              <Input
                id="i-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="joao@clinica.com.br"
                data-testid="invite-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="i-role">Papel</Label>
              <SelectNative
                id="i-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                data-testid="invite-role"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </SelectNative>
            </div>

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
                "[data-testid='invite-form']",
              ) as HTMLFormElement | null;
              form?.requestSubmit();
            }}
            data-testid="invite-submit"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
              </>
            ) : (
              "Enviar convite"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function RoleDialog({
  user,
  onOpenChange,
  onSaved,
}: {
  user: CurrentUser | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<UserRole>("dentist");

  useEffect(() => {
    if (user) setRole(user.role);
  }, [user]);

  const mutation = useMutation({
    mutationFn: () => usersService.updateRole(user!.id, role),
    onSuccess: () => {
      toast({ variant: "success", title: "Papel atualizado" });
      onSaved();
      onOpenChange(false);
    },
    onError: handleMutationError,
  });

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar papel</DialogTitle>
          <DialogDescription>
            {user ? `Defina o novo papel de ${user.full_name}.` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-2">
          <Label htmlFor="rd-role">Papel</Label>
          <div className="mt-2">
            <SelectNative
              id="rd-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              data-testid="role-dialog-select"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            data-testid="role-dialog-submit"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
