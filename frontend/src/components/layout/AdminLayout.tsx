import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Building2, LayoutDashboard, LogOut, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLogout } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/auth";

const NAV = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, end: true },
  { to: "/admin/clinics", label: "Clínicas", icon: Building2, end: false },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  function onLogout() {
    logout.mutate(undefined, {
      onSettled: () => navigate("/login", { replace: true }),
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-foreground text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 text-accent">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-tight">
                  Dental.CRM
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                  Plataforma
                </div>
              </div>
            </div>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:bg-white/5 hover:text-white",
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-white/60 sm:inline">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-white/70 hover:bg-white/10 hover:text-white"
              data-testid="admin-logout"
            >
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main
        className="mx-auto max-w-6xl px-6 py-8 animate-fade-in"
        data-testid="admin-main"
      >
        <Outlet />
      </main>
    </div>
  );
}
