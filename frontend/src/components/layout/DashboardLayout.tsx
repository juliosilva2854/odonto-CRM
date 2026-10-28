import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export default function DashboardLayout() {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      
      {/* Menu Lateral Fixo */}
      <Sidebar />

      {/* Área da Direita (Header + Conteúdo) */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        
        {/* Cabeçalho Fixo */}
        <Header />

        {/* Área rolável */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 relative">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}
