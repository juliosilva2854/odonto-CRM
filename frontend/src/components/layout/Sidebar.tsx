import { NavLink } from "react-router-dom";
import {
  Calendar,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  /** Optional flag/feature gate label shown as a hint. */
  hint?: string;
}

const NAV_PRIMARY: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", Icon: Calendar },
  { to: "/patients", label: "Pacientes", Icon: Users },
  { to: "/finance", label: "Financeiro", Icon: Receipt },
];

const NAV_SECONDARY: NavItem[] = [
  { to: "/settings", label: "Configurações", Icon: Settings },
];

export function Sidebar() {
  return (
    <aside
      data-testid="app-sidebar"
      className={cn(
        "flex h-screen w-64 flex-col border-r border-primary/20 bg-primary text-primary-foreground",
        "sticky top-0 z-30",
      )}
    >
      {/* Brand */}
      <div className="px-6 py-7">
        <BrandMark size="md" withWordmark tone="light" />
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-4 pb-6">
        <p className="px-3 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-primary-foreground/50">
          Clínica
        </p>
        <ul className="space-y-1">
          {NAV_PRIMARY.map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>

        <p className="mt-8 px-3 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-primary-foreground/50">
          Sistema
        </p>
        <ul className="space-y-1">
          {NAV_SECONDARY.map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer caption */}
      <div className="border-t border-primary-foreground/10 px-6 py-4 text-[11px] font-medium uppercase tracking-wider text-primary-foreground/40">
        v0.5 · Boutique
      </div>
    </aside>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const { Icon } = item;
  return (
    <NavLink
      to={item.to}
      data-testid={`sidebar-link-${item.label.toLowerCase()}`}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary-foreground/10 text-primary-foreground"
            : "text-primary-foreground/70 hover:bg-primary-foreground/5 hover:text-primary-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
          )}
          <Icon className="h-4 w-4 shrink-0" />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
