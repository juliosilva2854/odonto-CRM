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
      
      {/* ─── LEFT: VISUAL SPLASH ─── */}
      <aside className="relative hidden overflow-hidden bg-slate-50 lg:flex lg:flex-col lg:justify-between border-r border-slate-200">
        {/* Efeitos de Fundo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] opacity-60" />
        <div className="absolute -left-32 top-1/3 h-[500px] w-[500px] rounded-full bg-indigo-200/50 blur-[100px] pointer-events-none animate-pulse-glow" />
        <div className="absolute -right-24 bottom-0 h-[400px] w-[400px] rounded-full bg-teal-200/50 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2 px-12 pt-12">
          <BrandMarkCustom className="w-9 h-9" />
          <span className="text-2xl font-bold tracking-tight text-slate-900">Dental<span className="text-indigo-600">.CRM</span></span>
        </div>

        {/* Texto e Mockup Visual */}
        <div className="relative z-10 px-12 pb-16">
          <blockquote className="max-w-lg mb-8">
            <p className="text-4xl font-bold leading-[1.15] tracking-tight text-slate-900">
              Operar uma clínica de alto padrão exige software <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500">objetivo, rápido e sem fricção.</span>
            </p>
          </blockquote>

          {/* Mockup Flutuante (Mini) */}
          <div className="relative w-full max-w-md animate-float">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-teal-400 rounded-2xl blur opacity-20"></div>
            <div className="relative rounded-xl border border-white/50 bg-white/80 backdrop-blur-sm p-3 shadow-xl">
              <div className="rounded-lg overflow-hidden border border-slate-100 bg-white flex flex-col h-[200px]">
                <div className="h-6 border-b border-slate-100 bg-slate-50 flex items-center px-3 gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="flex flex-1 p-3 gap-3">
                  <div className="w-16 border-r border-slate-100 space-y-2 hidden sm:block">
                    <div className="h-2 w-full bg-indigo-100 rounded" />
                    <div className="h-2 w-full bg-slate-100 rounded" />
                    <div className="h-2 w-full bg-slate-100 rounded" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="h-3 w-16 bg-slate-200 rounded" />
                      <div className="h-3 w-8 bg-indigo-500 rounded" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-10 bg-slate-50 border border-slate-100 rounded" />
                      <div className="h-10 bg-slate-50 border border-slate-100 rounded" />
                    </div>
                    <div className="h-14 bg-slate-50 border border-slate-100 rounded flex items-center justify-center gap-1">
                       {[...Array(5)].map((_, i) => (
                         <div key={i} className="w-3 h-5 border border-slate-200 rounded-sm bg-white" />
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-6 border-t border-slate-200/60 px-12 py-6 bg-white/40 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-teal-500" /> CFO Compliant
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-teal-500" /> LGPD Ready
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-teal-500" /> 99.9% Uptime
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

          {/* Badge de Segurança no Form */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-500 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-teal-500" />
              Ambiente Seguro · Criptografia 256-bit
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 text-center">
            Acesse sua clínica.
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium text-center mb-8">
            Entre com suas credenciais profissionais.
          </p>

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-semibold text-xs tracking-wide uppercase">E-mail profissional</Label>
              <div className="relative group">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="voce@clinica.com.br"
                  className="pl-12 h-14 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl shadow-sm text-base transition-all"
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
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="pl-12 h-14 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl shadow-sm text-base transition-all"
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
              className="w-full h-14 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.5)] hover:shadow-[0_12px_24px_-8px_rgba(79,70,229,0.6)] hover:-translate-y-0.5 transition-all text-base font-bold mt-4 group"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar no painel
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-10 text-center text-sm text-slate-500 font-medium">
            Ainda não tem conta?{" "}
            <Link to="/signup" className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
