import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck, CheckCircle2, Activity, CalendarDays } from "lucide-react";

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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-teal-50 p-6 sm:p-12 font-sans relative overflow-hidden">
      
      {/* Efeitos de Fundo Globais */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-200/40 blur-[120px] rounded-full pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-200/40 blur-[100px] rounded-full pointer-events-none mix-blend-multiply" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />

      {/* Container Principal (Glassmorphism + Sombra) */}
      <div className="w-full max-w-6xl bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.1)] overflow-hidden grid lg:grid-cols-2 relative z-10">
        
        {/* ─── LEFT: VISUAL SHOWCASE ─── */}
        <div className="relative hidden lg:flex flex-col justify-between bg-slate-900 p-12 overflow-hidden text-white">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />
          <div className="absolute -top-40 -left-40 w-[400px] h-[400px] bg-indigo-600/50 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-teal-500/30 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3">
            <BrandMarkCustom className="w-10 h-10" />
            <span className="text-2xl font-bold tracking-tight">Dental<span className="text-indigo-400">.CRM</span></span>
          </div>

          <div className="relative z-10 mt-12">
            <h2 className="text-4xl font-bold leading-tight mb-6">
              A gestão da sua clínica em <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-300">outro nível.</span>
            </h2>
            <p className="text-slate-400 text-lg mb-10 max-w-md">
              Agenda, prontuário, odontograma e financeiro em uma única plataforma desenhada para a alta performance.
            </p>

            {/* Mockup 3D do Sistema */}
            <div className="relative w-full max-w-md animate-float">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-teal-400 rounded-2xl blur opacity-30"></div>
              <div className="relative rounded-xl border border-slate-700/50 bg-slate-800/80 backdrop-blur-md p-3 shadow-2xl">
                <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900 flex flex-col h-[220px]">
                  {/* Barra do navegador falsa */}
                  <div className="h-8 border-b border-slate-700 bg-slate-800 flex items-center px-4 gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  {/* Interface falsa */}
                  <div className="flex flex-1">
                    <div className="w-16 border-r border-slate-700 bg-slate-800/50 p-2 space-y-3 hidden sm:block">
                      <div className="h-6 w-full bg-indigo-500/20 rounded flex items-center justify-center"><Activity className="w-3 h-3 text-indigo-400"/></div>
                      <div className="h-6 w-full bg-slate-700/50 rounded" />
                      <div className="h-6 w-full bg-slate-700/50 rounded" />
                    </div>
                    <div className="flex-1 p-4 space-y-4">
                      <div className="flex justify-between">
                        <div className="h-4 w-24 bg-slate-700 rounded" />
                        <div className="h-6 w-16 bg-indigo-500 rounded" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="h-12 bg-slate-800 border border-slate-700 rounded p-2 flex flex-col justify-between"><div className="h-1.5 w-8 bg-slate-600 rounded"/><div className="h-3 w-12 bg-slate-400 rounded"/></div>
                        <div className="h-12 bg-slate-800 border border-slate-700 rounded p-2 flex flex-col justify-between"><div className="h-1.5 w-8 bg-slate-600 rounded"/><div className="h-3 w-12 bg-slate-400 rounded"/></div>
                        <div className="h-12 bg-slate-800 border border-slate-700 rounded p-2 flex flex-col justify-between"><div className="h-1.5 w-8 bg-slate-600 rounded"/><div className="h-3 w-12 bg-slate-400 rounded"/></div>
                      </div>
                      <div className="h-16 bg-slate-800 border border-slate-700 rounded flex items-center justify-center gap-1">
                        <CalendarDays className="w-4 h-4 text-slate-500 mr-2"/>
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="w-3 h-6 border border-slate-600 rounded-sm bg-slate-700/50" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-6 text-xs font-semibold text-slate-400 mt-12 pt-6 border-t border-slate-700/50">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400" /> CFO Compliant</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400" /> LGPD Ready</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400" /> 99.9% Uptime</div>
          </div>
        </div>

        {/* ─── RIGHT: FORMULÁRIO ─── */}
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16 relative">
          
          <div className="mb-10 lg:hidden flex items-center gap-2 justify-center">
            <BrandMarkCustom className="w-8 h-8" />
            <span className="text-2xl font-bold text-slate-900">Dental<span className="text-indigo-600">.CRM</span></span>
          </div>

          <div className="w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Selo de Segurança */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-teal-500" />
                Ambiente Criptografado 256-bit
              </div>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 text-center mb-2">
              Acesse sua clínica.
            </h1>
            <p className="text-sm text-slate-500 font-medium text-center mb-8">
              Insira suas credenciais para continuar.
            </p>

            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-bold text-[11px] tracking-wider uppercase ml-1">E-mail profissional</Label>
                <div className="relative group">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="voce@clinica.com.br"
                    className="pl-12 h-14 bg-slate-50/50 border-slate-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-xl shadow-sm text-base transition-all placeholder:text-slate-400 font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-slate-700 font-bold text-[11px] tracking-wider uppercase">Senha</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="pl-12 h-14 bg-slate-50/50 border-slate-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-xl shadow-sm text-base transition-all placeholder:text-slate-400 font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-600 rounded-xl animate-in shake">
                  <AlertDescription className="text-sm font-semibold">
                    {getErrorMessage(error, "Falha ao autenticar. Verifique suas credenciais.")}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.6)] hover:shadow-[0_12px_28px_-8px_rgba(79,70,229,0.7)] hover:-translate-y-0.5 transition-all text-base font-bold mt-4 group"
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

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500 font-medium">
                Ainda não tem conta?{" "}
                <Link to="/signup" className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                  Criar conta grátis
                </Link>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
