import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Send, CheckCircle2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";

const BrandMarkCustom = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2C8.5 2 6 4.5 6 8.5C6 12 7.5 16.5 9 20C10 22 11 22 11.5 22C12 22 12.5 21 12.5 20C12.5 18 12 15 12 15C12 15 11.5 18 11.5 20C11.5 21 12 22 12.5 22C13 22 14 22 15 20C16.5 16.5 18 12 18 8.5C18 4.5 15.5 2 12 2Z" fill="url(#paint0_linear_forgot)" />
    <path d="M12 5V11M9 7L12 9L15 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="paint0_linear_forgot" x1="6" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4F46E5" />
        <stop offset="1" stopColor="#14B8A6" />
      </linearGradient>
    </defs>
  </svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await authService.forgotPassword(email);
      setIsSuccess(true);
    } catch {
      setIsSuccess(true); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-200/60 p-4 sm:p-8 font-sans relative overflow-hidden">
      
      {/* Efeitos de Fundo */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-200/30 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-teal-200/30 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Container Principal */}
      <div className="w-full max-w-[1000px] bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-white/50 overflow-hidden grid lg:grid-cols-[1fr_1.1fr] relative z-10">
        
        {/* ─── LEFT: SPLASH ─── */}
        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-800 to-teal-950 p-12 lg:p-16 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-teal-500/20 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-2 mb-12 hover:opacity-80 transition-opacity w-max">
              <BrandMarkCustom className="w-9 h-9" />
              <span className="text-2xl font-bold tracking-tight">Dental<span className="text-teal-400">.CRM</span></span>
            </Link>

            <h2 className="text-3xl font-bold leading-tight mb-4">
              Segurança em <br/>
              <span className="text-teal-300">primeiro lugar.</span>
            </h2>
            <p className="text-slate-300 text-base mb-12 max-w-sm">
              Não se preocupe. Nós cuidamos para que você recupere seu acesso de forma rápida, segura e sem burocracia.
            </p>
          </div>

          <div className="relative z-10 pt-6">
            <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Dental.CRM · Enterprise Grade</p>
          </div>
        </div>

        {/* ─── RIGHT: FORM ─── */}
        <div className="flex flex-col justify-center p-8 sm:p-12 relative bg-slate-50 overflow-y-auto">
          
          <div className="mb-10 lg:hidden flex items-center gap-2 justify-center">
            <BrandMarkCustom className="w-8 h-8" />
            <span className="text-2xl font-bold text-slate-900">Dental<span className="text-indigo-600">.CRM</span></span>
          </div>

          <div className="w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {!isSuccess ? (
              <>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                  Recuperar senha
                </h1>
                <p className="text-sm text-slate-500 mb-8 font-medium">
                  Informe seu e-mail e enviaremos um link para redefinir sua senha.
                </p>

                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 font-semibold text-xs tracking-wide uppercase">E-mail profissional</Label>
                    <div className="relative group">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="voce@clinica.com.br"
                        className="pl-12 h-12 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-xl shadow-sm text-base transition-all placeholder:text-slate-400"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all text-base font-semibold mt-4 group"
                  >
                    <Send className="mr-2 h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    {isSubmitting ? "Enviando..." : "Enviar link de recuperação"}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center py-6 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-teal-100">
                  <CheckCircle2 className="w-10 h-10 text-teal-500" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
                  Verifique seu e-mail
                </h1>
                <p className="text-sm text-slate-500 mb-8 font-medium">
                  Se o e-mail <strong className="text-slate-900">{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
                </p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <Link to="/login" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao login
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              Protegido por criptografia · Conformidade LGPD/CFO
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
