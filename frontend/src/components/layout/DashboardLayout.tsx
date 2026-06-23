import { Outlet } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main
          className="flex-1 px-6 py-8 sm:px-10 animate-fade-in"
          data-testid="dashboard-main"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
