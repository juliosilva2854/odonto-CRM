import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  CalendarDays, ShieldCheck, Lock, Sparkles, Activity, CheckCircle2, 
  X, Check, FileText, CreditCard, Users, MessageCircle, 
  Clock, Database, TrendingUp, ShieldAlert, Zap, 
  ChevronDown, Server, ArrowRight, HeartHandshake, 
  Stethoscope, MonitorPlay
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Hook simples para animar elementos ao rolar a página
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100", "translate-y-0");
          entry.target.classList.remove("opacity-0", "translate-y-12");
        }
      });
    }, { threshold: 0.1 });

    const elements = document.querySelectorAll(".reveal-on-scroll");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}

// NOVO ÍCONE DA MARCA (Dente + Escudo minimalista)
const BrandMarkCustom = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2C8.5 2 6 4.5 6 8.5C6 12 7.5 16.5 9 20C10 22 11 22 11.5 22C12 22 12.5 21 12.5 20C12.5 18 12 15 12 15C12 15 11.5 18 11.5 20C11.5 21 12 22 12.5 22C13 22 14 22 15 20C16.5 16.5 18 12 18 8.5C18 4.5 15.5 2 12 2Z" fill="url(#paint0_linear)" />
    <path d="M12 5V11M9 7L12 9L15 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="paint0_linear" x1="6" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4F46E5" />
        <stop offset="1" stopColor="#14B8A6" />
      </linearGradient>
    </defs>
  </svg>
);

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  useScrollReveal();

  return (
    <div className="relative min-h-screen bg-white text-slate-900 overflow-hidden font-sans selection:bg-indigo-500/20 scroll-smooth">
      
      {/* ─── CSS CUSTOMIZADO PARA EFEITOS ─── */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        @keyframes float-delayed {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.15); }
          50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.3); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 5s ease-in-out infinite; }
        .animate-marquee { animation: marquee 30s linear infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .bg-grid-pattern {
          background-size: 40px 40px;
          background-image: linear-gradient(to right, rgba(226, 232, 240, 0.5) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(226, 232, 240, 0.5) 1px, transparent 1px);
        }
      `}} />

      {/* ─── FUNDO COM GRID E LUZES FLUTUANTES ─── */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)' }} />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-200/40 blur-[120px] rounded-full pointer-events-none animate-float" />
      <div className="absolute top-[20%] -left-40 w-[400px] h-[400px] bg-teal-200/40 blur-[100px] rounded-full pointer-events-none animate-float-delayed" />
      <div className="absolute top-[60%] right-[-10%] w-[500px] h-[500px] bg-blue-100/50 blur-[120px] rounded-full pointer-events-none animate-float" />

      {/* ─── NAVBAR ─── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-slate-200/50 bg-white/70 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMarkCustom className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight text-slate-900">Dental<span className="text-indigo-600">.CRM</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#recursos" className="hover:text-indigo-600 transition-colors">Recursos</a>
            <a href="#seguranca" className="hover:text-indigo-600 transition-colors">Segurança</a>
            <a href="#comparativo" className="hover:text-indigo-600 transition-colors">Comparativo</a>
            <a href="#precos" className="hover:text-indigo-600 transition-colors">Preços</a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
              Entrar
            </Link>
            <Button asChild variant="accent" className="rounded-full shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all">
              <Link to="/signup">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative pt-32 pb-24 z-10">
        
        {/* ─── HERO SECTION ─── */}
        <section className="max-w-5xl mx-auto px-6 text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out fill-mode-both">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 text-xs font-semibold tracking-wide uppercase mb-4 shadow-sm hover:scale-105 transition-transform cursor-default">
            <Sparkles className="w-3.5 h-3.5" />
            O padrão enterprise chegou à odontologia
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
            Gestão clínica com a <br className="hidden md:block"/> segurança que você precisa.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
            Chega de perder prazos ou ter problemas jurídicos. O único sistema com <strong className="text-slate-900">Trava CFO 24h</strong>, agenda anti-conflito e prontuário à prova de falhas. Feito para clínicas que não aceitam amadorismo.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
            <Button asChild size="lg" variant="accent" className="w-full sm:w-auto rounded-full h-12 px-8 text-base shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all">
              <Link to="/signup">
                <Zap className="mr-2 w-5 h-5 fill-current" /> Criar conta grátis
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto rounded-full h-12 px-8 text-base border-slate-300 text-slate-700 hover:bg-slate-50 hover:-translate-y-1 transition-all bg-white">
              <a href="#recursos">Ver funcionalidades</a>
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-6 pt-4 text-xs font-medium text-slate-500 animate-in fade-in duration-1000 delay-500">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-500" /> 14 dias grátis</span>
            <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-teal-500" /> Sem cartão</span>
            <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-teal-500" /> Cancele quando quiser</span>
          </div>
        </section>

        {/* ─── TEXTO ROLANDO (MARQUEE) ─── */}
        <div className="mt-16 py-4 border-y border-slate-100 bg-slate-50/50 overflow-hidden flex relative">
          <div className="flex whitespace-nowrap animate-marquee">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-8 px-4 text-sm font-semibold text-slate-400 uppercase tracking-widest">
                <span>Conformidade CFO</span> <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                <span>Segurança LGPD</span> <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                <span>Agenda Anti-Conflito</span> <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                <span>Teleconsulta Jitsi</span> <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                <span>Prontuário Eletrônico</span> <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                <span>Odontograma 2.5D</span> <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
              </div>
            ))}
          </div>
        </div>

        {/* ─── MOCKUP DO SISTEMA (Visual Realista) ─── */}
        <section className="max-w-5xl mx-auto px-6 mt-16 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both">
          <div className="relative group perspective-1000">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-teal-400 to-blue-500 rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse-glow"></div>
            
            <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-indigo-500/10 animate-float">
              <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex flex-col h-[400px]">
                {/* Barra do Navegador */}
                <div className="h-10 border-b border-slate-200 bg-white flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <div className="ml-4 h-5 w-64 bg-slate-100 rounded-md flex items-center px-2 text-[10px] text-slate-400 font-mono">app.dentalcrm.com.br/dashboard</div>
                </div>
                {/* Conteúdo Falso */}
                <div className="flex flex-1">
                  {/* Sidebar */}
                  <div className="w-48 border-r border-slate-200 bg-white p-4 space-y-4 hidden md:block">
                    <div className="flex items-center gap-2 mb-6">
                      <BrandMarkCustom className="w-5 h-5" />
                      <div className="h-4 w-16 bg-slate-200 rounded" />
                    </div>
                    <div className="space-y-1">
                      <div className="h-9 w-full bg-indigo-50 rounded-lg border border-indigo-100 flex items-center px-3 gap-3"><Activity className="w-4 h-4 text-indigo-600"/> <div className="h-2 w-16 bg-indigo-300 rounded"/></div>
                      <div className="h-9 w-full hover:bg-slate-50 rounded-lg flex items-center px-3 gap-3"><CalendarDays className="w-4 h-4 text-slate-400"/> <div className="h-2 w-16 bg-slate-200 rounded"/></div>
                      <div className="h-9 w-full hover:bg-slate-50 rounded-lg flex items-center px-3 gap-3"><Users className="w-4 h-4 text-slate-400"/> <div className="h-2 w-16 bg-slate-200 rounded"/></div>
                      <div className="h-9 w-full hover:bg-slate-50 rounded-lg flex items-center px-3 gap-3"><FileText className="w-4 h-4 text-slate-400"/> <div className="h-2 w-16 bg-slate-200 rounded"/></div>
                    </div>
                  </div>
                  {/* Área Principal */}
                  <div className="flex-1 p-6 space-y-6 bg-slate-50/50">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="h-6 w-32 bg-slate-800 rounded" />
                        <div className="h-3 w-48 bg-slate-300 rounded" />
                      </div>
                      <div className="h-9 w-32 bg-indigo-600 rounded-lg shadow-md shadow-indigo-500/20" />
                    </div>
                    
                    {/* Cards de KPI */}
                    <div className="grid grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col justify-between hover:-translate-y-1 transition-transform">
                          <div className="flex justify-between items-center">
                            <div className="h-3 w-16 bg-slate-200 rounded" />
                            <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center"><Activity className="w-3 h-3 text-indigo-500"/></div>
                          </div>
                          <div className="h-6 w-20 bg-slate-800 rounded" />
                        </div>
                      ))}
                    </div>

                    {/* Odontograma Falso */}
                    <div className="h-36 bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col">
                       <div className="flex justify-between items-center mb-4">
                         <div className="h-4 w-24 bg-slate-800 rounded" />
                         <div className="h-3 w-32 bg-slate-300 rounded" />
                       </div>
                       <div className="flex-1 flex items-center justify-center gap-1.5">
                          {[...Array(8)].map((_, i) => (
                            <div key={i} className="w-8 h-12 border border-slate-300 rounded-t-lg rounded-b-sm flex flex-col justify-between p-0.5 hover:scale-110 transition-transform cursor-pointer overflow-hidden bg-white">
                              <div className="h-3 w-full bg-slate-100 rounded-t-sm" />
                              <div className={`h-5 w-full ${i === 3 || i === 4 ? 'bg-indigo-400' : 'bg-slate-200'}`} />
                              <div className="h-2 w-full bg-slate-100 rounded-b-sm" />
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── RECURSOS COMPLETOS (BENTO GRID) ─── */}
        <section id="recursos" className="max-w-6xl mx-auto px-6 mt-32">
          <div className="text-center mb-16 space-y-4 reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 ease-out">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Um sistema completo. Sem letras miúdas.</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Tudo o que a sua clínica precisa para operar com excelência, do agendamento à auditoria.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 (Large) */}
            <div className="reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 delay-100 ease-out md:col-span-2 p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 blur-[80px] group-hover:bg-indigo-100 transition-all duration-500" />
              <ShieldAlert className="w-10 h-10 text-indigo-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Prontuário com Trava Jurídica CFO</h3>
              <p className="text-slate-600 max-w-md">Bloqueio automático de edições após 24 horas. Se precisar alterar, o sistema gera um adendo imutável. Tenha a tranquilidade de um prontuário com validade real em processos judiciais.</p>
            </div>

            {/* Feature 2 */}
            <div className="reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 delay-200 ease-out p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <CalendarDays className="w-10 h-10 text-teal-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Trava Tripla Anti-Conflito</h3>
              <p className="text-slate-600">Sua recepção nunca mais errará. O sistema impede agendamentos duplicados para a mesma sala, dentista ou paciente no mesmo horário.</p>
            </div>

            {/* Feature 3 */}
            <div className="reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 delay-100 ease-out p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <Stethoscope className="w-10 h-10 text-rose-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Odontograma 2.5D</h3>
              <p className="text-slate-600">Visualização anatômica com histórico de cada dente. O sistema guarda cada procedimento através de Event-Sourcing.</p>
            </div>

            {/* Feature 4 (Large) */}
            <div className="reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 delay-200 ease-out md:col-span-2 p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative">
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-teal-50 blur-[80px] group-hover:bg-teal-100 transition-all duration-500" />
              <MessageCircle className="w-10 h-10 text-emerald-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">WhatsApp e Teleconsulta Nativos</h3>
              <p className="text-slate-600 max-w-md">Gere links de teleconsulta no Jitsi em 1 clique e envie mensagens de confirmação no WhatsApp automaticamente. Tudo integrado diretamente no agendamento, sem precisar de apps externos.</p>
            </div>
          </div>

          {/* Ícones sem "Multi-unidades" e "Financeiro" */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              { icon: FileText, label: "Anamnese Digital" },
              { icon: TrendingUp, label: "Dashboard KPIs" },
              { icon: CreditCard, label: "Orçamentos PDF" },
              { icon: ShieldCheck, label: "LGPD Completa" },
              { icon: Clock, label: "Gestão de Retornos" },
              { icon: Database, label: "Isolamento Total" },
              { icon: Users, label: "Controle de Equipe" },
              { icon: MonitorPlay, label: "Sala de Espera" }
            ].map((feat, i) => (
              <div key={i} className="reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 ease-out p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-3 hover:shadow-md hover:-translate-y-1 transition-all cursor-default group" style={{ transitionDelay: `${i * 50}ms` }}>
                <feat.icon className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-slate-700">{feat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SEGURANÇA E COMPLIANCE ─── */}
        <section id="seguranca" className="max-w-6xl mx-auto px-6 mt-32">
          <div className="reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 ease-out p-8 md:p-12 rounded-3xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 relative overflow-hidden group hover:shadow-xl transition-all">
            <div className="absolute inset-0 bg-grid-pattern opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Segurança e tranquilidade para a sua clínica.</h2>
                <p className="text-slate-600 mb-6">Em um mercado onde vazamentos de dados geram multas milionárias, o Dental CRM foi construído com infraestrutura robusta e arquitetura preparada para proteger o seu negócio.</p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0"><Server className="w-4 h-4 text-indigo-500" /></div>
                    Hospedagem de alta performance na Hostinger
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0"><Lock className="w-4 h-4 text-indigo-500" /></div>
                    Isolamento Multi-Tenant (Seus dados nunca se misturam)
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0"><ShieldCheck className="w-4 h-4 text-indigo-500" /></div>
                    Conformidade total com a LGPD
                  </li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm text-center hover:-translate-y-1 transition-transform">
                  <p className="text-3xl font-bold text-slate-900 mb-1">99.9%</p>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Disponibilidade</p>
                </div>
                <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm text-center hover:-translate-y-1 transition-transform">
                  <p className="text-3xl font-bold text-slate-900 mb-1">256-bit</p>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Criptografia SSL</p>
                </div>
                <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm text-center col-span-2 flex flex-col items-center justify-center gap-2 hover:-translate-y-1 transition-transform">
                  <HeartHandshake className="w-6 h-6 text-teal-500" />
                  <p className="text-sm font-semibold text-slate-900">Suporte humanizado</p>
                  <p className="text-xs text-slate-500">Atendimento direto com especialistas.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── COMPARATIVO (Mais recursos) ─── */}
        <section id="comparativo" className="max-w-4xl mx-auto px-6 mt-32">
          <div className="text-center mb-12 space-y-4 reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Por que mudar para o Dental CRM?</h2>
            <p className="text-slate-600">Veja o que você ganha ao sair do sistema antigo.</p>
          </div>

          <div className="reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 delay-100 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-700">Recurso</th>
                  <th className="px-6 py-4 font-semibold text-slate-500 text-center">Sistemas Antigos</th>
                  <th className="px-6 py-4 font-bold text-indigo-600 text-center bg-indigo-50/50">Dental CRM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { feature: "Prontuário bloqueado pós-24h (CFO)", old: false },
                  { feature: "Agenda com Trava Tripla de Conflito", old: false },
                  { feature: "Teleconsulta integrada (Jitsi Grátis)", old: false },
                  { feature: "Odontograma Event-Sourced", old: false },
                  { feature: "Isolamento de Dados (Multi-Tenant real)", old: "Compartilhado" },
                  { feature: "Contrato de Fidelidade", old: "12 meses" }
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-700 font-medium">{row.feature}</td>
                    <td className="px-6 py-4 text-center text-slate-400">
                      {row.old === false ? <X className="w-5 h-5 mx-auto" /> : <span className="text-slate-500 font-medium">{row.old}</span>}
                    </td>
                    <td className="px-6 py-4 text-center bg-indigo-50/30">
                      {row.old === false ? <Check className="w-5 h-5 mx-auto text-teal-500" /> : <span className="font-bold text-indigo-600">Zero</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ─── PREÇOS (2 Planos + Custom) ─── */}
        <section id="precos" className="max-w-6xl mx-auto px-6 mt-32">
          <div className="text-center mb-12 space-y-4 reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Planos simples. Sem fidelidade.</h2>
            <p className="text-slate-600">Escolha o plano que acompanha o tamanho da sua clínica. 14 dias grátis.</p>
          </div>

          <div className="flex justify-center mb-12 reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 delay-100">
            <div className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-full p-1 shadow-inner">
              <button 
                onClick={() => setIsAnnual(false)} 
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${!isAnnual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Mensal
              </button>
              <button 
                onClick={() => setIsAnnual(true)} 
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${isAnnual ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Anual <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Plano Essencial */}
            <div className="reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 p-8 rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all">
              <h3 className="text-xl font-bold text-slate-900">Essencial</h3>
              <p className="text-sm text-slate-500 mt-2 mb-6">Para dentistas autônomos.</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">R$</span>
                <span className="text-4xl font-bold text-slate-900">{isAnnual ? "237" : "297"}</span>
                <span className="text-slate-500">/mês</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-slate-700"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span>1 Usuário</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span>Pacientes e LGPD</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span>Prontuário com Trava CFO</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span>Odontograma Básico</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span>Agenda Simples</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-400"><X className="w-5 h-5 shrink-0" /> <span>Sem Orçamentos e Financeiro</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-400"><X className="w-5 h-5 shrink-0" /> <span>Sem WhatsApp e Teleconsulta</span></li>
              </ul>
              <Button asChild variant="outline" className="w-full rounded-full border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 h-11 transition-colors">
                <Link to="/signup">Começar trial grátis</Link>
              </Button>
            </div>

            {/* Plano Pro (Destaque) */}
            <div className="reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 delay-100 p-8 rounded-3xl border-2 border-indigo-500 bg-white flex flex-col relative shadow-2xl shadow-indigo-500/20 lg:-translate-y-4 hover:shadow-indigo-500/40 transition-all group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-teal-400 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse-glow"></div>
              <div className="relative">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold mb-4 w-max border border-indigo-100">Mais escolhido</div>
                <h3 className="text-xl font-bold text-slate-900">Pro</h3>
                <p className="text-sm text-slate-500 mt-2 mb-6">Para clínicas em crescimento.</p>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">R$</span>
                  <span className="text-4xl font-bold text-slate-900">{isAnnual ? "397" : "497"}</span>
                  <span className="text-slate-500">/mês</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-start gap-2 text-sm text-slate-800"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span><strong className="text-slate-900">Até 5 Usuários</strong></span></li>
                  <li className="flex items-start gap-2 text-sm text-slate-800"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span>Agenda com Trava Tripla</span></li>
                  <li className="flex items-start gap-2 text-sm text-slate-800"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span>Odontograma Completo</span></li>
                  <li className="flex items-start gap-2 text-sm text-slate-800"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span><strong className="text-slate-900">Orçamentos com PDF</strong></span></li>
                  <li className="flex items-start gap-2 text-sm text-slate-800"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span><strong className="text-slate-900">WhatsApp Integrado</strong></span></li>
                  <li className="flex items-start gap-2 text-sm text-slate-800"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span>Teleconsulta em Vídeo</span></li>
                  <li className="flex items-start gap-2 text-sm text-slate-800"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span>Dashboard de KPIs</span></li>
                </ul>
                <Button asChild variant="accent" className="w-full rounded-full shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 transition-transform h-11">
                  <Link to="/signup">Assinar o Pro</Link>
                </Button>
              </div>
            </div>

            {/* Plano Clínica (Sob Medida) */}
            <div className="reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 delay-200 p-8 rounded-3xl border border-slate-200 bg-slate-50 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 blur-[40px] rounded-full pointer-events-none" />
              <h3 className="text-xl font-bold text-slate-900">Clínica (Sob Medida)</h3>
              <p className="text-sm text-slate-500 mt-2 mb-6">Para operações maiores ou personalizadas.</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">Fale Conosco</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-slate-700"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span><strong className="text-slate-900">Usuários Customizados</strong></span></li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span>Treinamento Dedicado</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span>Integrações Personalizadas</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span>Onboarding com Especialista</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-700"><Check className="w-5 h-5 text-teal-500 shrink-0" /> <span>SLA de Suporte Prioritário</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-400"><X className="w-5 h-5 shrink-0" /> <span>Módulos avançados em breve</span></li>
              </ul>
              <Button asChild variant="outline" className="w-full rounded-full border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 h-11 transition-colors bg-white">
                <a href="https://wa.me/5511989442854" target="_blank" rel="noreferrer">Falar com vendas</a>
              </Button>
            </div>
          </div>
        </section>

        {/* ─── FAQ (Com 6 perguntas) ─── */}
        <section id="faq" className="max-w-3xl mx-auto px-6 mt-32 mb-24">
          <div className="text-center mb-12 reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Perguntas Frequentes</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Preciso instalar algo no computador?", a: "Não. O Dental CRM é 100% online (SaaS). Você e sua equipe acessam de qualquer navegador, seja no computador, tablet ou celular." },
              { q: "Como funciona o período de teste?", a: "São 14 dias totalmente gratuitos, sem precisar cadastrar cartão de crédito. Ao final do período, você decide se quer continuar com um dos planos." },
              { q: "O sistema é adequado à LGPD e ao CFO?", a: "Sim. Temos anonimização de pacientes, consentimento versionado e a exclusiva trava de 24h do CFO, que garante a validade jurídica do prontuário." },
              { q: "Tem fidelidade ou multa de cancelamento?", a: "Não. Nós acreditamos que você deve ficar porque o sistema é excelente, não porque assinou um contrato. Cancele quando quiser, em 1 clique." },
              { q: "Vocês emitem Nota Fiscal (NFS-e)?", a: "A emissão nativa está em desenvolvimento. No momento, o sistema gera todos os relatórios necessários para a sua contabilidade emitir a nota, e clientes do plano Clínica contam com auxílio dedicado." },
              { q: "Como funciona o backup dos meus dados?", a: "Seus dados ficam armazenados na Hostinger (infraestrutura enterprise com backup automático) e utilizamos o Neon PostgreSQL (Serverless) com replicação e alta disponibilidade." }
            ].map((item, i) => (
              <details key={i} className="reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700 group border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all [&_summary::-webkit-details-marker]:hidden" style={{ transitionDelay: `${i * 50}ms` }}>
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors">
                  <h3 className="text-base font-semibold text-slate-800">{item.q}</h3>
                  <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-300" />
                </summary>
                <div className="px-6 pb-6 text-sm text-slate-600 border-t border-slate-100 pt-4 bg-slate-50/50">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ─── CTA FINAL (Integrado ao fundo) ─── */}
        <section className="relative w-full pt-24 pb-12 mt-16 bg-gradient-to-br from-indigo-600 to-indigo-800 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10 mix-blend-overlay" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-white/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10 reveal-on-scroll opacity-0 translate-y-12 transition-all duration-700">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Eleve o nível da sua clínica hoje.</h2>
            <p className="text-indigo-100 text-lg mb-10 max-w-2xl mx-auto">Junte-se às clínicas que já utilizam a plataforma mais moderna, segura e acolhedora do mercado odontológico.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto rounded-full h-14 px-10 text-base shadow-2xl hover:-translate-y-1 transition-all font-bold text-indigo-900">
                <Link to="/signup">Começar meu teste grátis <ArrowRight className="ml-2 w-5 h-5" /></Link>
              </Button>
            </div>
          </div>
        </section>

      </main>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-200 py-8 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <BrandMarkCustom className="w-6 h-6" />
            <span className="text-lg font-bold tracking-tight text-slate-900">Dental<span className="text-indigo-600">.CRM</span></span>
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Dental CRM. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-500 font-medium">
            <a href="#" className="hover:text-indigo-600 transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Política de Privacidade</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
