import { NavLink } from "react-router-dom";
import {
  Calendar,
  LayoutDashboard,
  Receipt,
  ReceiptText,
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
}

const NAV_PRIMARY: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", Icon: Calendar },
  { to: "/patients", label: "Pacientes", Icon: Users },
];

const NAV_FINANCE: NavItem[] = [
  { to: "/finance/quotes", label: "Orçamentos", Icon: ReceiptText },
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
        "sticky top-0 z-30 flex h-screen w-60 flex-col",
        "border-r border-border bg-card",
      )}
    >
      {/* Brand */}
      <div className="px-5 py-5">
        <BrandMark size="md" withWordmark />
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 pb-4">
        <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          Clínica
        </p>
        <ul className="space-y-0.5">
          {NAV_PRIMARY.map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>

        <p className="mt-6 px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          Financeiro
        </p>
        <ul className="space-y-0.5">
          {NAV_FINANCE.map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>

        <p className="mt-6 px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          Sistema
        </p>
        <ul className="space-y-0.5">
          {NAV_SECONDARY.map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer caption */}
      <div className="border-t border-border px-5 py-3 text-[11px] font-medium text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          v0.5.2 · Modern Premium
        </div>
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
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
          isActive
            ? "bg-secondary text-foreground shadow-xs"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground",
            )}
          />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
