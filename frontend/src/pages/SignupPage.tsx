import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, User, Lock, ChevronRight, ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { onboardingService } from "@/services/onboarding.service";
import { useAuthStore } from "@/store/auth";
import { authService } from "@/services/auth.service";
import type { PlanTier } from "@/types/api";

// Ícone customizado
const BrandMarkCustom = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2C8.5 2 6 4.5 6 8.5C6 12 7.5 16.5 9 20C10 22 11 22 11.5 22C12 22 12.5 21 12.5 20C12.5 18 12 15 12 15C12 15 11.5 18 11.5 20C11.5 21 12 22 12.5 22C13 22 14 22 15 20C16.5 16.5 18 12 18 8.5C18 4.5 15.5 2 12 2Z" fill="url(#paint0_linear_signup)" />
    <path d="M12 5V11M9 7L12 9L15 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="paint0_linear_signup" x1="6" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4F46E5" />
        <stop offset="1" stopColor="#14B8A6" />
      </linearGradient>
    </defs>
  </svg>
);

export default function SignupPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setIdentity = useAuthStore((s) => s.setIdentity);
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [clinicData, setClinicData] = useState({ legal_name: "", trade_name: "", cnpj: "", timezone: "America/Sao_Paulo" });
  const [adminData, setAdminData] = useState({ full_name: "", email: "", password: "", confirmPassword: "" });
  const [plan, setPlan] = useState<PlanTier>("pro");

  const handleNext = () => setStep((s) => Math.min(s + 1, 3));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      handleNext();
      return;
    }

    // Final submit
    if (adminData.password !== adminData.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await onboardingService.signup({
        clinic_legal_name: clinicData.legal_name,
        clinic_trade_name: clinicData.trade_name,
        clinic_cnpj: clinicData.cnpj,
        clinic_timezone: clinicData.timezone,
        admin_full_name: adminData.full_name,
        admin_email: adminData.email,
        admin_password: adminData.password,
        plan: plan
      });

      setTokens(res.access_token, res.refresh_token);
      const me = await authService.me();
      setIdentity(me.user, me.clinic);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Erro ao criar conta. Verifique os dados.");
      setStep(1); // Volta pro começo se houver erro
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1fr_1.2fr] bg-white font-sans">
      
      {/* ─── LEFT: SPLASH ─── */}
      <aside className="relative hidden overflow-hidden bg-slate-900 lg:flex lg:flex-col lg:justify-between text-white border-r border-slate-800">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
        <div className="absolute -left-32 top-1/3 h-[500px] w-[500px] rounded-full bg-indigo-600/30 blur-[120px] pointer-events-none" />
        <div className="absolute -right-24 bottom-0 h-[400px] w-[400px] rounded-full bg-teal-500/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2 px-12 pt-12">
          <BrandMarkCustom className="w-9 h-9" />
          <span className="text-2xl font-bold tracking-tight">Dental<span className="text-indigo-400">.CRM</span></span>
        </div>

        <div className="relative z-10 px-12 pb-16">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white mb-6">
            Comece grátis em <span className="text-indigo-400">2 minutos.</span>
          </h1>
          <p className="text-slate-400 mb-8 max-w-md">Ative sua clínica e leve toda a operação para um só lugar — agenda, prontuário, odontograma e financeiro.</p>
          
          <ul className="space-y-4">
            {["14 dias grátis, sem cartão", "Multi-tenant com LGPD e trava CFO", "Cancele quando quiser"].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-300">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 border-t border-slate-800 px-12 py-6">
          <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">Dental.CRM · Modern Premium</p>
        </div>
      </aside>

      {/* ─── RIGHT: FORM ─── */}
      <section className="flex items-center justify-center bg-slate-50 px-6 py-10 sm:px-10 relative overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-50 pointer-events-none" />
        
        <div className="w-full max-w-lg relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          <div className="mb-10 lg:hidden flex items-center gap-2">
            <BrandMarkCustom className="w-8 h-8" />
            <span className="text-xl font-bold text-slate-900">Dental<span className="text-indigo-600">.CRM</span></span>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 -z-10 rounded-full transition-all duration-300" style={{ width: `${((step - 1) / 2) * 100}%` }} />
            
            {[1, 2, 3].map((num) => (
              <div key={num} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-4 border-slate-50 transition-colors ${step >= num ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                {num}
              </div>
            ))}
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              {step === 1 && "Sua clínica"}
              {step === 2 && "Dados do Administrador"}
              {step === 3 && "Escolha seu plano"}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Passo {step} de 3
            </p>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-lg border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              {/* STEP 1: CLINIC */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <Label>Razão Social</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input required placeholder="Ex: Clínica Sorriso LTDA" className="pl-10 h-11" value={clinicData.legal_name} onChange={e => setClinicData({...clinicData, legal_name: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Fantasia</Label>
                    <Input required placeholder="Ex: Sorriso Odontologia" className="h-11" value={clinicData.trade_name} onChange={e => setClinicData({...clinicData, trade_name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input required placeholder="00.000.000/0001-00" className="h-11" value={clinicData.cnpj} onChange={e => setClinicData({...clinicData, cnpj: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fuso Horário</Label>
                    <select 
                      className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={clinicData.timezone}
                      onChange={e => setClinicData({...clinicData, timezone: e.target.value})}
                    >
                      <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                      <option value="America/Manaus">America/Manaus</option>
                      <option value="America/Belem">America/Belem</option>
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 2: ADMIN */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input required placeholder="Seu nome" className="pl-10 h-11" value={adminData.full_name} onChange={e => setAdminData({...adminData, full_name: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail Profissional</Label>
                    <Input required type="email" placeholder="voce@clinica.com.br" className="h-11" value={adminData.email} onChange={e => setAdminData({...adminData, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input required type="password" placeholder="Min. 8 caracteres" className="pl-10 h-11" value={adminData.password} onChange={e => setAdminData({...adminData, password: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar Senha</Label>
                    <Input required type="password" placeholder="Repita a senha" className="h-11" value={adminData.confirmPassword} onChange={e => setAdminData({...adminData, confirmPassword: e.target.value})} />
                  </div>
                </div>
              )}

              {/* STEP 3: PLAN */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div 
                    onClick={() => setPlan("pro")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${plan === "pro" ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <div>
                      <h4 className="font-bold text-slate-900">Plano Pro</h4>
                      <p className="text-xs text-slate-500">Para clínicas em crescimento</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-slate-900">R$ 497</span><span className="text-xs text-slate-500">/mês</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => setPlan("essencial")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${plan === "essencial" ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <div>
                      <h4 className="font-bold text-slate-900">Plano Essencial</h4>
                      <p className="text-xs text-slate-500">Para dentistas autônomos</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-slate-900">R$ 297</span><span className="text-xs text-slate-500">/mês</span>
                    </div>
                  </div>
                </div>
              )}

              {/* BUTTONS */}
              <div className="flex items-center gap-3 pt-6 mt-6 border-t border-slate-100">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={handlePrev} className="h-11 px-4" disabled={isLoading}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                  </Button>
                )}
                
                <Button type="submit" variant="accent" className="flex-1 h-11 rounded-xl shadow-lg shadow-indigo-500/20" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : step === 3 ? (
                    <>Criar conta grátis <CheckCircle2 className="w-4 h-4 ml-2" /></>
                  ) : (
                    <>Próximo <ChevronRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Já tem conta?{" "}
              <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
