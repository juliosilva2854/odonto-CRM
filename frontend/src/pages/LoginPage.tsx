import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

// Ícone customizado
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
      /* error surfaced via the alert below */
    }
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1fr_1.1fr] bg-white font-sans">
      
      {/* ─── LEFT: VISUAL SPLASH (Enterprise) ─── */}
      <aside className="relative hidden overflow-hidden bg-slate-900 lg:flex lg:flex-col lg:justify-between text-white border-r border-slate-800">
        {/* Efeitos de Fundo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
        <div className="absolute -left-32 top-1/3 h-[500px] w-[500px] rounded-full bg-indigo-600/30 blur-[120px] pointer-events-none" />
        <div className="absolute -right-24 bottom-0 h-[400px] w-[400px] rounded-full bg-teal-500/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2 px-12 pt-12">
          <BrandMarkCustom className="w-9 h-9" />
          <span className="text-2xl font-bold tracking-tight">Dental<span className="text-indigo-400">.CRM</span></span>
        </div>

        <figure className="relative z-10 px-12 pb-16">
          <blockquote className="max-w-lg">
            <p className="text-4xl font-bold leading-[1.15] tracking-tight text-white">
              Operar uma clínica de alto padrão exige software <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-300">objetivo, rápido e sem fricção.</span>
            </p>
          </blockquote>
          <figcaption className="mt-8 flex items-center gap-3 text-sm font-medium text-slate-400">
            <span className="h-px w-10 bg-indigo-500" />
            Dental.CRM · Enterprise Grade
          </figcaption>
        </figure>

        <div className="relative z-10 grid grid-cols-3 gap-6 border-t border-slate-800 px-12 py-8 text-xs font-semibold tracking-wider text-slate-400 uppercase">
          <div>
            <div className="text-xl font-bold text-white mb-1">ISO 3950</div>
            Padrão FDI
          </div>
          <div>
            <div className="text-xl font-bold text-white mb-1">24h</div>
            Trava CFO
          </div>
          <div>
            <div className="text-xl font-bold text-white mb-1">LGPD</div>
            Multi-Tenant
          </div>
        </div>
      </aside>

      {/* ─── RIGHT: FORMULÁRIO ─── */}
      <section className="flex items-center justify-center bg-slate-50 px-6 py-10 sm:px-10 relative">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-50 pointer-events-none lg:hidden" />
        
        <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="mb-10 lg:hidden flex items-center gap-2">
            <BrandMarkCustom className="w-8 h-8" />
            <span className="text-xl font-bold text-slate-900">Dental<span className="text-indigo-600">.CRM</span></span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Acesse sua clínica.
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Entre com suas credenciais profissionais.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">E-mail profissional</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="voce@clinica.com.br"
                  className="pl-10 h-11 bg-white border-slate-300 focus-visible:ring-indigo-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700">Senha</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="pl-10 h-11 bg-white border-slate-300 focus-visible:ring-indigo-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-600">
                <AlertDescription>
                  {getErrorMessage(error, "Falha ao autenticar. Verifique suas credenciais.")}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              size="lg"
              variant="accent"
              disabled={isPending}
              className="w-full h-11 rounded-xl shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar no painel
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Não tem conta?{" "}
            <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
              Criar conta grátis
            </Link>
          </p>

          <div className="mt-10 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
            <ShieldCheck className="h-4 w-4" />
            Protegido por criptografia · Conformidade LGPD/CFO
          </div>
        </div>
      </section>
    </div>
  );
}
