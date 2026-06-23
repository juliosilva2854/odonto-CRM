import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { Lock, Mail, Loader2, ArrowRight } from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

interface LocationState {
  from?: { pathname: string };
}

export default function LoginPage() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  const navigate = useNavigate();
  const location = useLocation();
  const { mutateAsync, isPending, error } = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // If already authed, send to the intended destination (or dashboard).
  if (isAuthed) {
    const target = (location.state as LocationState)?.from?.pathname ?? "/dashboard";
    return <Navigate to={target} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await mutateAsync({ email: email.trim(), password });
      const target = (location.state as LocationState)?.from?.pathname ?? "/dashboard";
      navigate(target, { replace: true });
    } catch {
      /* error surfaced via the alert below */
    }
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.05fr_1fr]">
      {/* ─── Left: editorial visual ──────────────────────────── */}
      <aside
        data-testid="login-visual-panel"
        className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between"
      >
        <div className="absolute inset-0 bg-grain opacity-50" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary-foreground/5" aria-hidden />

        <div className="relative z-10 flex items-center gap-3 px-12 pt-12">
          <BrandMark size="md" withWordmark tone="light" />
        </div>

        <figure className="relative z-10 px-12 pb-16">
          <blockquote className="max-w-lg">
            <p className="font-serif text-3xl leading-snug text-primary-foreground/95">
              “A excelência clínica merece um software que respeite o
              <span className="text-accent"> tempo, o sigilo</span> e a
              <span className="text-accent italic"> estética </span>
              do seu consultório.”
            </p>
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3 text-sm text-primary-foreground/60">
            <span className="h-px w-10 bg-accent/60" />
            Dental CRM · Boutique Edition
          </figcaption>
        </figure>

        <div className="relative z-10 grid grid-cols-3 gap-8 border-t border-primary-foreground/10 px-12 py-8 text-xs uppercase tracking-[0.18em] text-primary-foreground/55">
          <Stat label="Padrão FDI" value="ISO 3950" />
          <Stat label="Trava CFO" value="24h" />
          <Stat label="Multi-tenant" value="LGPD" />
        </div>
      </aside>

      {/* ─── Right: form ─────────────────────────────────────── */}
      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandMark size="md" withWordmark />
          </div>

          <h1 className="text-3xl font-semibold leading-tight">
            Bem-vindo de volta.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acesse o painel da sua clínica para continuar.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-5"
            data-testid="login-form"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="email">E-mail profissional</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="voce@clinica.com.br"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  data-testid="login-forgot-link"
                >
                  Esqueceu?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="login-password-input"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" data-testid="login-error">
                <AlertDescription>
                  {getErrorMessage(error, "Falha ao autenticar")}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              className="w-full"
              data-testid="login-submit-button"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando…
                </>
              ) : (
                <>
                  Entrar no painel
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Protegido por criptografia · Conformidade LGPD/CFO
          </p>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-serif text-2xl text-primary-foreground/90">{value}</div>
      <div className="mt-1">{label}</div>
    </div>
  );
}
