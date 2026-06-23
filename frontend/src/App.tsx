import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import NotFoundPage from "@/pages/NotFoundPage";
import PatientRecordPage from "@/pages/PatientRecordPage";
import PatientsListPage from "@/pages/PatientsListPage";
import { setOnUnauthorized } from "@/lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function AuthInterceptorBinding() {
  const navigate = useNavigate();
  useEffect(() => {
    setOnUnauthorized(() => navigate("/login", { replace: true }));
    return () => setOnUnauthorized(() => {});
  }, [navigate]);
  return null;
}

function AppRoutes() {
  return (
    <>
      <AuthInterceptorBinding />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/agenda" element={<Placeholder title="Agenda" />} />
          <Route path="/patients" element={<PatientsListPage />} />
          <Route path="/patients/:id" element={<PatientRecordPage />} />
          <Route path="/finance" element={<Placeholder title="Financeiro" />} />
          <Route path="/settings" element={<Placeholder title="Configurações" />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl py-16 text-center" data-testid={`placeholder-${title.toLowerCase()}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Próximos sprints
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Esta área será habilitada na sequência do roadmap.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
