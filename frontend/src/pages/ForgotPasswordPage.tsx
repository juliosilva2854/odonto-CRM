import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Send, CheckCircle2 } from "lucide-react";

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
    <div className="grid min-h-screen w-full lg:grid-cols-[1fr_1.1fr] bg-slate-950 font-sans overflow-hidden">
      
      {/* ─── LEFT: SPLASH ─── */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between text-white border-r border-slate-800/50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
        <div className="absolute -left-32 top-1/3 h-[500px] w-[500px] rounded-full bg-indigo-600/30 blur-[120px] pointer-events-none" />
        <div className="absolute -right-24 bottom-0 h-[400px] w-[400px] rounded-full bg-teal-500/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2 px-12 pt-12">
          <Link to="/" className="flex items-center gap-2 group">
            <BrandMarkCustom className="w-9 h-9 group-hover:scale-105 transition-transform" />
            <span className="text-2xl font-bold tracking-tight">Dental<span className="text-indigo-400">.CRM</span></span>
          </Link>
        </div>

        <div className="relative z-10 px-12 pb-16">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white mb-6">
            Segurança em primeiro lugar.
          </h1>
          <p className="text-slate-400 mb-8 max-w-md text-lg">Não se preocupe. Nós cuidamos para que você recupere seu acesso de forma rápida e segura.</p>
        </div>

        <div className="relative z-10 border-t border-slate-800/50 px-12 py-6 bg-slate-950/30 backdrop-blur-sm">
          <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">Dental.CRM · Enterprise Grade</p>
        </div>
      </aside>

      {/* ─── RIGHT: FORM ─── */}
      <section className="flex items-center justify-center bg-slate-50 px-6 py-10 sm:px-10 relative">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-200/30 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          <div className="mb-8 lg:hidden flex items-center gap-2 justify-center">
            <BrandMarkCustom className="w-8 h-8" />
            <span className="text-2xl font-bold text-slate-900">Dental<span className="text-indigo-600">.CRM</span></span>
          </div>

          <div className="bg-white/80 backdrop-blur-2xl border border-white/50 rounded-3xl p-8 sm:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-500" />
            
            {!isSuccess ? (
              <>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                  Recuperar senha
                </h1>
                <p className="text-sm text-slate-500 mb-8">
                  Informe seu e-mail e enviaremos um link para redefinir sua senha.
                </p>

                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">E-mail</Label>
                    <div className="relative group">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="voce@clinica.com.br"
                        className="pl-11 h-12 bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all rounded-xl text-base shadow-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 hover:-translate-y-0.5 transition-all text-base font-semibold mt-4"
                  >
                    <Send className="mr-2 h-5 w-5" />
                    {isSubmitting ? "Enviando..." : "Enviar link de recuperação"}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center py-6 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-teal-500" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
                  Verifique seu e-mail
                </h1>
                <p className="text-sm text-slate-500 mb-8">
                  Se o e-mail <strong className="text-slate-900">{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
                </p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <Link to="/login" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
