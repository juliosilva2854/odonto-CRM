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
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
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
      { to: "/finance/cash", label: "Caixa", Icon: Wallet },
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

/** Desktop sidebar — fixed column, visible from `md` up. */
export function Sidebar() {
  return (
    <aside
      data-testid="app-sidebar"
      className={cn(
        "sticky top-0 z-30 hidden h-screen w-60 shrink-0 flex-col md:flex",
        "border-r border-border bg-card",
        "print:hidden",
      )}
    >
      <SidebarContent />
    </aside>
  );
}

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Mobile sidebar — same navigation inside a left slide-over Sheet. */
export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-72 max-w-[85vw] flex-col p-0 sm:max-w-[85vw] md:hidden"
        data-testid="mobile-sidebar"
      >
        <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
        <SheetDescription className="sr-only">
          Navegue entre as áreas do sistema
        </SheetDescription>
        <SidebarContent onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
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
                  <SidebarLink item={item} onNavigate={onNavigate} />
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
    </>
  );
}

function SidebarLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const { Icon } = item;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
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
