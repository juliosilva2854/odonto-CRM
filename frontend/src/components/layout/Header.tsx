import { LogOut, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogout } from "@/hooks/useAuth";
import { initialsOf } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador(a)",
  dentist: "Dentista",
  reception: "Recepção",
  assistant: "Assistente",
};

export function Header() {
  const user = useAuthStore((s) => s.user);
  const clinic = useAuthStore((s) => s.clinic);
  const { mutate: logout, isPending } = useLogout();

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-20 flex h-16 items-center gap-6 border-b border-border bg-background/85 px-8 backdrop-blur"
    >
      {/* Clinic context — tenant identification */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-[11px] font-semibold uppercase tracking-wider text-primary">
          {clinic ? initialsOf(clinic.trade_name) : "—"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            {clinic?.trade_name ?? "—"}
          </p>
          <p className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">
            Plano {clinic?.plan ?? "—"} · CNPJ {clinic?.cnpj ?? "—"}
          </p>
        </div>
      </div>

      {/* Search — visual scaffolding for next sprints */}
      <div className="relative ml-auto hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-testid="header-search"
          placeholder="Buscar paciente, orçamento ou consulta…"
          className="pl-9"
          disabled
        />
      </div>

      {/* User chip */}
      <div className="flex items-center gap-3">
        <div className="hidden text-right md:block">
          <p className="text-sm font-medium leading-tight">
            {user?.full_name ?? "—"}
          </p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {ROLE_LABEL[user?.role ?? ""] ?? user?.role}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-[12px] font-semibold text-foreground ring-1 ring-accent/30">
          {user ? initialsOf(user.full_name) : "?"}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => logout()}
          disabled={isPending}
          aria-label="Sair"
          data-testid="header-logout-button"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
