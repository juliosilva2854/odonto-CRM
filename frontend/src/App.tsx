import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
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
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFoundPage from "@/pages/NotFoundPage";
import PatientRecordPage from "@/pages/PatientRecordPage";
import PatientsListPage from "@/pages/PatientsListPage";
import BillingPage from "@/pages/settings/BillingPage";
import UsersPage from "@/pages/settings/UsersPage";
import RoomsPage from "@/pages/settings/RoomsPage";
import ProceduresPage from "@/pages/settings/ProceduresPage";
import ClinicPage from "@/pages/settings/ClinicPage";
import { setOnSubscriptionInactive, setOnUnauthorized } from "@/lib/api";

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
    setOnSubscriptionInactive(() =>
      navigate("/settings/billing?reason=blocked", { replace: false }),
    );
    return () => {
      setOnUnauthorized(() => {});
      setOnSubscriptionInactive(() => {});
    };
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
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

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
          <Route path="/settings" element={<Navigate to="/settings/billing" replace />} />
          <Route path="/settings/billing" element={<BillingPage />} />
          <Route path="/settings/users" element={<UsersPage />} />
          <Route path="/settings/rooms" element={<RoomsPage />} />
          <Route path="/settings/procedures" element={<ProceduresPage />} />
          <Route path="/settings/clinic" element={<ClinicPage />} />
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
