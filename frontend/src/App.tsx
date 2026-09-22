import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Toaster } from "@/components/ui/toaster";
import DashboardPage from "@/pages/DashboardPage";
import FinanceQuotesPage from "@/pages/FinanceQuotesPage";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import NotFoundPage from "@/pages/NotFoundPage";
import PatientRecordPage from "@/pages/PatientRecordPage";
import PatientsListPage from "@/pages/PatientsListPage";
import { setOnUnauthorized } from "@/lib/api";

// FullCalendar is ~86 KB gzip; only load when the user actually opens the agenda.
const AgendaPage = lazy(() => import("@/pages/AgendaPage"));

function PageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

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
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/agenda"
            element={
              <Suspense fallback={<PageFallback />}>
                <AgendaPage />
              </Suspense>
            }
          />
          <Route
            path="/calendar"
            element={
              <Suspense fallback={<PageFallback />}>
                <AgendaPage />
              </Suspense>
            }
          />
          <Route path="/patients" element={<PatientsListPage />} />
          <Route path="/patients/:id" element={<PatientRecordPage />} />
          <Route path="/finance/quotes" element={<FinanceQuotesPage />} />
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
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
