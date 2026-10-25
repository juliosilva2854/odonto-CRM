import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { Sidebar, MobileSidebar } from "@/components/layout/Sidebar";

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Menu Desktop */}
      <Sidebar />

      {/* Menu Mobile */}
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />

      {/* Área principal da direita (Header + Conteúdo) */}
      <div className="flex flex-1 flex-col min-w-0 h-full">
        <Header onMenuClick={() => setMobileOpen(true)} />
        
        <main
          className="flex-1 flex flex-col min-h-0 px-4 py-4 sm:px-8 sm:py-6 overflow-hidden animate-fade-in"
          data-testid="dashboard-main"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
