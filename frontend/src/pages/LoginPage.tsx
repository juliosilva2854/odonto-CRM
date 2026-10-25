import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const BrandMarkCustom = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2C8.5 2 6 4.5 6 8.5C6 12 7.5 16.5 9 20C10 22 11 22 11.5 22C12 22 12.5 21 12.5 20C12.5 18 12 15 12 15C12 15 11.5 18 11.5 20C11.5 21 12 22 12.5 22C13 22 14 22 15 20C16.5 16.5 18 12 18 8.5C18 4.5 15.5 2 12 2Z" fill="url(#paint0_linear_login)" />
    <path d="M12 5V11M9 7L12 9L15 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="paint0_linear_login" x1="6" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4F46E5" />
        <stop offset="1" stopColor="#14B8A6" />
      </linearGradient>
    </defs>
  </svg>
);

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
      /* error surfaced via the alert */
    }
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.1fr_1fr] bg-white font-sans overflow-hidden">
      
      {/* ─── LEFT: VISUAL SPLASH (Claro e Acolhedor) ─── */}
      <aside className="relative hidden overflow-hidden bg-slate-50 lg:flex lg:flex-col lg:justify-between border-r border-slate-200">
        {/* Efeitos de Fundo alinhados com a Landing Page */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] opacity-60" />
        <div className="absolute -left-32 top-1/3 h-[500px] w-[500px] rounded-full bg-indigo-200/50 blur-[100px] pointer-events-none animate-pulse-glow" />
        <div className="absolute -right-24 bottom-0 h-[400px] w-[400px] rounded-full bg-teal-200/50 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2 px-12 pt-12">
          <BrandMarkCustom className="w-9 h-9" />
          <span className="text-2xl font-bold tracking-tight text-slate-900">Dental<span className="text-indigo-600">.CRM</span></span>
        </div>

        <figure className="relative z-10 px-12 pb-16">
          <blockquote className="max-w-lg">
            <p className="text-4xl font-bold leading-[1.15] tracking-tight text-slate-900">
              Operar uma clínica de alto padrão exige software <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500">objetivo, rápido e sem fricção.</span>
            </p>
          </blockquote>
          <figcaption className="mt-8 flex items-center gap-3 text-sm font-semibold text-slate-500">
            <span className="h-px w-10 bg-indigo-500" />
            Dental.CRM · Enterprise Grade
          </figcaption>
        </figure>

        <div className="relative z-10 grid grid-cols-3 gap-6 border-t border-slate-200 px-12 py-8 text-xs font-bold tracking-wider text-slate-500 uppercase">
          <div>
            <div className="text-xl font-bold text-slate-900 mb-1">ISO 3950</div>
            Padrão FDI
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 mb-1">24h</div>
            Trava CFO
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 mb-1">LGPD</div>
            Multi-Tenant
          </div>
        </div>
      </aside>

      {/* ─── RIGHT: FORMULÁRIO ─── */}
      <section className="flex items-center justify-center bg-white px-6 py-10 sm:px-10 relative">
        <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="mb-10 lg:hidden flex items-center gap-2 justify-center">
            <BrandMarkCustom className="w-8 h-8" />
            <span className="text-2xl font-bold text-slate-900">Dental<span className="text-indigo-600">.CRM</span></span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Acesse sua clínica.
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Entre com suas credenciais profissionais.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-semibold text-xs tracking-wide uppercase">E-mail</Label>
              <div className="relative group">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="voce@clinica.com.br"
                  className="pl-11 h-12 bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl shadow-sm text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 font-semibold text-xs tracking-wide uppercase">Senha</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="pl-11 h-12 bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl shadow-sm text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-600 rounded-xl animate-in shake">
                <AlertDescription className="text-sm font-medium">
                  {getErrorMessage(error, "Falha ao autenticar. Verifique suas credenciais.")}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all text-base font-semibold mt-4"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar no painel
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Ainda não tem conta?{" "}
            <Link to="/signup" className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
              Criar conta grátis
            </Link>
          </p>

          <div className="mt-12 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
            <ShieldCheck className="h-4 w-4" />
            Protegido por criptografia · LGPD/CFO
          </div>
        </div>
      </section>
    </div>
  );
}
