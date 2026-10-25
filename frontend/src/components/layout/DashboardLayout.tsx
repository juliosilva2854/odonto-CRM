import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { Sidebar, MobileSidebar } from "@/components/layout/Sidebar";

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Menu Desktop */}
      <Sidebar />

      {/* Menu Mobile */}
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main
          className="flex-1 px-4 py-6 sm:px-8 sm:py-8 animate-fade-in"
          data-testid="dashboard-main"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
