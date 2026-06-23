import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck } from "lucide-react";

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
    <div className="grid min-h-screen w-full lg:grid-cols-[1.1fr_1fr]">
      {/* ─── Left: visual splash ─────────────────────────────── */}
      <aside
        data-testid="login-visual-panel"
        className="relative hidden overflow-hidden bg-foreground text-white lg:flex lg:flex-col lg:justify-between"
      >
        <div className="absolute inset-0 bg-dotgrid opacity-30" aria-hidden />
        <div
          className="pointer-events-none absolute -left-32 top-1/3 h-[420px] w-[420px] rounded-full bg-accent/40 blur-[120px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-[360px] w-[360px] rounded-full bg-indigo-500/30 blur-[120px]"
          aria-hidden
        />

        <div className="relative z-10 flex items-center gap-3 px-12 pt-12">
          <BrandMark size="md" withWordmark tone="light" />
        </div>

        <figure className="relative z-10 px-12 pb-16">
          <blockquote className="max-w-lg">
            <p className="text-3xl font-semibold leading-snug tracking-tight text-white/95">
              Operar uma clínica de alto padrão exige software{" "}
              <span className="text-accent">objetivo</span>,{" "}
              <span className="text-accent">rápido</span> e{" "}
              <span className="text-accent">sem fricção</span>.
            </p>
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3 text-sm text-white/55">
            <span className="h-px w-10 bg-accent/60" />
            Dental.CRM · Modern Premium
          </figcaption>
        </figure>

        <div className="relative z-10 grid grid-cols-3 gap-6 border-t border-white/10 px-12 py-7 text-[11px] uppercase tracking-[0.18em] text-white/55">
          <Stat label="Padrão FDI" value="ISO 3950" />
          <Stat label="Trava CFO" value="24h" />
          <Stat label="Multi-tenant" value="LGPD" />
        </div>
      </aside>

      {/* ─── Right: form ────────────────────────────────────── */}
      <section className="flex items-center justify-center bg-background px-6 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandMark size="md" withWordmark />
          </div>

          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Acesse sua clínica.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre com suas credenciais profissionais.
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
              variant="accent"
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

          <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
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
      <div className="text-xl font-semibold text-white/95 tracking-tight normal-case">
        {value}
      </div>
      <div className="mt-1">{label}</div>
    </div>
  );
}
