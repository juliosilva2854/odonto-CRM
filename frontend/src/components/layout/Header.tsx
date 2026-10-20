import { LogOut, Menu, Search } from "lucide-react";

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

interface HeaderProps {
  /** Opens the mobile navigation drawer (button only rendered < md). */
  onOpenMobileNav?: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const clinic = useAuthStore((s) => s.clinic);
  const { mutate: logout, isPending } = useLogout();

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border glass px-4 sm:px-6 md:gap-6 md:px-8 print:hidden"
    >
      {/* Mobile menu (hamburger) */}
      <Button
        variant="ghost"
        size="icon"
        className="-ml-1 shrink-0 md:hidden"
        onClick={onOpenMobileNav}
        aria-label="Abrir menu"
        data-testid="header-mobile-menu-button"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Clinic context */}
      <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-[11px] font-semibold uppercase tracking-wider text-background">
          {clinic ? initialsOf(clinic.trade_name) : "—"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">
            {clinic?.trade_name ?? "—"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            Plano <span className="font-medium text-foreground/80">{clinic?.plan ?? "—"}</span>
            <span className="hidden sm:inline"> · CNPJ {clinic?.cnpj ?? "—"}</span>
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative ml-auto hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-testid="header-search"
          placeholder="Buscar paciente, orçamento ou consulta…"
          className="pl-9 bg-secondary/60 border-transparent focus-visible:bg-card focus-visible:border-input"
        />
      </div>

      {/* User chip */}
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <div className="hidden text-right md:block">
          <p className="text-sm font-medium leading-tight text-foreground">
            {user?.full_name ?? "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {ROLE_LABEL[user?.role ?? ""] ?? user?.role}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-indigo-500 text-[12px] font-semibold text-white shadow-xs">
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
