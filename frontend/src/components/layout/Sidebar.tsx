import { NavLink } from "react-router-dom";
import {
  Calendar, LayoutDashboard, Receipt, ReceiptText, Settings,
  Users, type LucideIcon, Wallet, DoorOpen, ListTree, Building2, UserCog
} from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  roles?: string[];
}

const NAV_PRIMARY: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", Icon: Calendar },
  { to: "/patients", label: "Pacientes", Icon: Users },
];

const NAV_FINANCE: NavItem[] = [
  { to: "/finance/quotes", label: "Orçamentos", Icon: ReceiptText },
  { to: "/finance/cash", label: "Caixa", Icon: Wallet, roles: ["admin", "reception"] },
  { to: "/finance", label: "Financeiro", Icon: Receipt, roles: ["admin"] },
];

const NAV_SECONDARY: NavItem[] = [
  { to: "/settings/users", label: "Equipe", Icon: UserCog, roles: ["admin"] },
  { to: "/settings/rooms", label: "Salas", Icon: DoorOpen, roles: ["admin"] },
  { to: "/settings/procedures", label: "Procedimentos", Icon: ListTree, roles: ["admin"] },
  { to: "/settings/clinic", label: "Clínica", Icon: Building2, roles: ["admin"] },
  { to: "/settings/billing", label: "Assinatura", Icon: Settings, roles: ["admin"] },
];

function SidebarContent() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role || "admin";

  const filterNav = (items: NavItem[]) => items.filter(item => !item.roles || item.roles.includes(role));

  const primaryItems = filterNav(NAV_PRIMARY);
  const financeItems = filterNav(NAV_FINANCE);
  const secondaryItems = filterNav(NAV_SECONDARY);

  return (
    <div className="flex h-full w-full flex-col bg-card">
      <div className="px-5 py-6 shrink-0">
        <BrandMark size="md" withWordmark />
      </div>

      <nav className="flex-1 px-3 pb-4 overflow-y-auto">
        <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
          Clínica
        </p>
        <ul className="space-y-0.5">
          {primaryItems.map((item) => <li key={item.to}><SidebarLink item={item} /></li>)}
        </ul>

        {financeItems.length > 0 && (
          <>
            <p className="mt-6 px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
              Financeiro
            </p>
            <ul className="space-y-0.5">
              {financeItems.map((item) => <li key={item.to}><SidebarLink item={item} /></li>)}
            </ul>
          </>
        )}

        {secondaryItems.length > 0 && (
          <>
            <p className="mt-6 px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
              Configurações
            </p>
            <ul className="space-y-0.5">
              {secondaryItems.map((item) => <li key={item.to}><SidebarLink item={item} /></li>)}
            </ul>
          </>
        )}
      </nav>
    </div>
  );
}

// Desktop
export function Sidebar() {
  return (
    <aside className="sticky top-0 z-30 hidden h-screen w-60 flex-col border-r border-border md:flex shrink-0">
      <SidebarContent />
    </aside>
  );
}

// Mobile
export function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-60 p-0">
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const { Icon } = item;
  return (
    <NavLink
      to={item.to}
      onClick={() => {}}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
          isActive ? "bg-secondary text-foreground shadow-xs" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground")} />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
