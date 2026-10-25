import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck, HeartPulse, Shield, Fingerprint } from "lucide-react";

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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-200/60 p-4 sm:p-8 font-sans relative overflow-hidden">
      
      {/* Efeitos de Fundo Suaves (Menos brilho, mais profundidade) */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-200/30 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-teal-200/30 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Container Principal */}
      <div className="w-full max-w-[1050px] bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-white/50 overflow-hidden grid lg:grid-cols-[1.1fr_1fr] relative z-10">
        
        {/* ─── LEFT: BRANDING & CONFIANÇA ─── */}
        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-800 to-teal-950 p-12 lg:p-16 text-white overflow-hidden">
          {/* Grid sutil no fundo escuro */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-teal-500/20 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-12">
              <BrandMarkCustom className="w-9 h-9" />
              <span className="text-2xl font-bold tracking-tight">Dental<span className="text-teal-400">.CRM</span></span>
            </div>

            <h2 className="text-3xl font-bold leading-tight mb-4">
              Cuidar da sua clínica <br/>
              <span className="text-teal-300">nunca foi tão simples.</span>
            </h2>
            <p className="text-slate-300 text-base mb-12 max-w-sm">
              A plataforma completa para gestão odontológica. Segurança, conformidade e praticidade para você focar no que realmente importa: seus pacientes.
            </p>

            {/* Cards de Recursos (Glassmorphism escuro) */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-sm hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 border border-teal-500/30">
                  <HeartPulse className="w-5 h-5 text-teal-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Foco no Paciente</h3>
                  <p className="text-xs text-slate-300 mt-0.5">Prontuário com trava jurídica CFO e histórico completo.</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-sm hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <Shield className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Segurança LGPD</h3>
                  <p className="text-xs text-slate-300 mt-0.5">Seus dados e dos seus pacientes 100% protegidos.</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-sm hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-full bg-slate-500/20 flex items-center justify-center shrink-0 border border-slate-500/30">
                  <Fingerprint className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Acesso Restrito</h3>
                  <p className="text-xs text-slate-300 mt-0.5">Ambiente multi-tenant isolado com criptografia avançada.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: FORMULÁRIO ─── */}
        <div className="flex flex-col justify-center p-8 sm:p-12 relative bg-slate-50">
          
          <div className="mb-10 lg:hidden flex items-center gap-2 justify-center">
            <BrandMarkCustom className="w-8 h-8" />
            <span className="text-2xl font-bold text-slate-900">Dental<span className="text-indigo-600">.CRM</span></span>
          </div>

          <div className="w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
              Acesse sua clínica.
            </h1>
            <p className="text-sm text-slate-500 mb-8 font-medium">
              Insira suas credenciais para continuar.
            </p>

            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-semibold text-xs tracking-wide uppercase">E-mail profissional</Label>
                <div className="relative group">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="voce@clinica.com.br"
                    className="pl-12 h-12 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-xl shadow-sm text-base transition-all placeholder:text-slate-400"
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
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="pl-12 h-12 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-xl shadow-sm text-base transition-all placeholder:text-slate-400"
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
                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all text-base font-semibold mt-2 group"
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

            <div className="mt-10 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              Protegido por criptografia · Conformidade LGPD/CFO
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
