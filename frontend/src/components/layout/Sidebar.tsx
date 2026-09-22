import { NavLink } from "react-router-dom";
import {
  Building2,
  Calendar,
  CreditCard,
  DoorOpen,
  LayoutDashboard,
  ListTree,
  Receipt,
  ReceiptText,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  end?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "Clínica",
    items: [
      { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
      { to: "/agenda", label: "Agenda", Icon: Calendar },
      { to: "/patients", label: "Pacientes", Icon: Users },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { to: "/finance/quotes", label: "Orçamentos", Icon: ReceiptText },
      { to: "/finance", label: "Financeiro", Icon: Receipt },
    ],
  },
  {
    title: "Configurações",
    items: [
      { to: "/settings/billing", label: "Assinatura", Icon: CreditCard },
      { to: "/settings/users", label: "Equipe", Icon: UsersRound },
      { to: "/settings/rooms", label: "Salas", Icon: DoorOpen },
      { to: "/settings/procedures", label: "Procedimentos", Icon: ListTree },
      { to: "/settings/clinic", label: "Clínica", Icon: Building2 },
    ],
  },
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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {SECTIONS.map((section, i) => (
          <div key={section.title}>
            <p
              className={cn(
                "px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70",
                i === 0 ? "pt-3" : "mt-6 pt-1",
              )}
            >
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <SidebarLink item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer caption */}
      <div className="border-t border-border px-5 py-3 text-[11px] font-medium text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          v0.6.0 · Modern Premium
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
      end={item.end}
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
              isActive
                ? "text-accent"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
