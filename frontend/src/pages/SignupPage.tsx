import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, User, Lock, ChevronRight, ChevronLeft, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { onboardingService } from "@/services/onboarding.service";
import { useAuthStore } from "@/store/auth";
import { authService } from "@/services/auth.service";
import type { PlanTier } from "@/types/api";

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
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-200/60 p-4 font-sans relative overflow-hidden">
      
      {/* Efeitos de Fundo */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-200/30 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-teal-200/30 blur-[100px] rounded-full pointer-events-none" />
      
      {/* Container Principal (Mais compacto e limitado) */}
      <div className="w-full max-w-[950px] max-h-[92vh] bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-white/50 overflow-hidden grid lg:grid-cols-[1fr_1.1fr] relative z-10">
        
        {/* ─── LEFT: SPLASH ─── */}
        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-800 to-teal-950 p-10 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-teal-500/20 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-2 mb-10 hover:opacity-80 transition-opacity w-max">
              <BrandMarkCustom className="w-8 h-8" />
              <span className="text-xl font-bold tracking-tight">Dental<span className="text-teal-400">.CRM</span></span>
            </Link>

            <h2 className="text-2xl font-bold leading-tight mb-3">
              Comece grátis em <br/>
              <span className="text-teal-300">2 minutos.</span>
            </h2>
            <p className="text-slate-300 text-sm mb-8 max-w-xs">
              Ative sua clínica e leve toda a operação para um só lugar — agenda, prontuário, odontograma e financeiro.
            </p>

            <div className="space-y-3">
              {["14 dias grátis, sem cartão", "Multi-tenant com LGPD e trava CFO", "Cancele quando quiser"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span className="text-xs font-semibold text-white">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 pt-4">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Dental.CRM · Modern Premium</p>
          </div>
        </div>

        {/* ─── RIGHT: FORM ─── */}
        <div className="flex flex-col justify-center p-6 sm:p-8 relative bg-slate-50 overflow-y-auto">
          
          <div className="mb-6 lg:hidden flex items-center gap-2 justify-center">
            <BrandMarkCustom className="w-7 h-7" />
            <span className="text-xl font-bold text-slate-900">Dental<span className="text-indigo-600">.CRM</span></span>
          </div>

          <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Stepper compacto */}
            <div className="flex items-center justify-between mb-6 relative px-4">
              <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-slate-200 -z-10 rounded-full" />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 -z-10 rounded-full transition-all duration-500" style={{ width: `calc(${((step - 1) / 2) * 100}% - 8px)` }} />
              
              {[1, 2, 3].map((num) => (
                <div key={num} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-4 border-slate-50 transition-all duration-300 shadow-sm ${step >= num ? "bg-indigo-600 text-white scale-110" : "bg-slate-200 text-slate-500"}`}>
                  {num}
                </div>
              ))}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
              {step === 1 && "Sua clínica"}
              {step === 2 && "Acesso do Administrador"}
              {step === 3 && "Escolha seu plano"}
            </h1>
            <p className="text-xs text-slate-500 mb-5 font-medium">
              Passo {step} de 3. Preencha os dados abaixo.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-xs font-semibold rounded-lg border border-rose-200 animate-in shake">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-3">
              {step === 1 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold text-[10px] tracking-wide uppercase">Razão Social</Label>
                    <div className="relative group">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" />
                      <Input required placeholder="Ex: Clínica Sorriso LTDA" className="pl-10 h-10 bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg text-sm shadow-sm" value={clinicData.legal_name} onChange={e => setClinicData({...clinicData, legal_name: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold text-[10px] tracking-wide uppercase">Nome Fantasia</Label>
                    <Input required placeholder="Ex: Sorriso Odontologia" className="h-10 bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg text-sm shadow-sm" value={clinicData.trade_name} onChange={e => setClinicData({...clinicData, trade_name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold text-[10px] tracking-wide uppercase">CNPJ</Label>
                    <Input required placeholder="00.000.000/0001-00" className="h-10 bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg text-sm shadow-sm" value={clinicData.cnpj} onChange={e => setClinicData({...clinicData, cnpj: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold text-[10px] tracking-wide uppercase">Fuso Horário</Label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-sm font-medium text-slate-700"
                      value={clinicData.timezone}
                      onChange={e => setClinicData({...clinicData, timezone: e.target.value})}
                    >
                      <option value="America/Sao_Paulo">America/Sao_Paulo (Brasília)</option>
                      <option value="America/Manaus">America/Manaus (Amazonas)</option>
                      <option value="America/Belem">America/Belem (Pará)</option>
                    </select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold text-[10px] tracking-wide uppercase">Nome Completo</Label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" />
                      <Input required placeholder="Seu nome" className="pl-10 h-10 bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg text-sm shadow-sm" value={adminData.full_name} onChange={e => setAdminData({...adminData, full_name: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold text-[10px] tracking-wide uppercase">E-mail Profissional</Label>
                    <Input required type="email" placeholder="voce@clinica.com.br" className="h-10 bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg text-sm shadow-sm" value={adminData.email} onChange={e => setAdminData({...adminData, email: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold text-[10px] tracking-wide uppercase">Senha</Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" />
                      <Input required type="password" placeholder="Min. 8 caracteres" className="pl-10 h-10 bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg text-sm shadow-sm" value={adminData.password} onChange={e => setAdminData({...adminData, password: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold text-[10px] tracking-wide uppercase">Confirmar Senha</Label>
                    <Input required type="password" placeholder="Repita a senha" className="h-10 bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg text-sm shadow-sm" value={adminData.confirmPassword} onChange={e => setAdminData({...adminData, confirmPassword: e.target.value})} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4">
                  <div 
                    onClick={() => setPlan("pro")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${plan === "pro" ? "border-indigo-600 bg-indigo-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">Plano Pro</h4>
                        <span className="bg-indigo-100 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase border border-indigo-200">Recomendado</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">Para clínicas em crescimento</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-slate-900">R$ 497</span><span className="text-xs text-slate-500 font-medium">/mês</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => setPlan("essencial")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${plan === "essencial" ? "border-indigo-600 bg-indigo-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Plano Essencial</h4>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">Para dentistas autônomos</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-slate-900">R$ 297</span><span className="text-xs text-slate-500 font-medium">/mês</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-200">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={handlePrev} className="h-10 px-4 rounded-lg border-slate-300 text-slate-700 bg-white text-sm" disabled={isLoading}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                  </Button>
                )}
                
                <Button type="submit" className="flex-1 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 transition-all text-sm font-bold" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : step === 3 ? (
                    <>Criar conta grátis <CheckCircle2 className="w-4 h-4 ml-1.5" /></>
                  ) : (
                    <>Próximo passo <ChevronRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </div>
            </form>

            <p className="mt-4 text-center text-xs text-slate-500 font-medium">
              Já tem conta?{" "}
              <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                Entrar
              </Link>
            </p>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Protegido por criptografia · Conformidade LGPD/CFO
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
