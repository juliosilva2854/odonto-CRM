import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { MobileSidebar, Sidebar } from "@/components/layout/Sidebar";

export function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop: fixed column (hidden < md) */}
      <Sidebar />
      {/* Mobile: slide-over drawer */}
      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main
          className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-10 md:py-8 animate-fade-in"
          data-testid="dashboard-main"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
