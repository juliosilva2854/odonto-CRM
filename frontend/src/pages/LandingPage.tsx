import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  CalendarDays, ShieldCheck, Lock, Sparkles, Activity, CheckCircle2, 
  X, Check, FileText, Video, CreditCard, Users, MessageCircle, 
  Clock, Database, TrendingUp, ShieldAlert, FolderSync, Zap, 
  ChevronDown, Server, ArrowRight
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans selection:bg-indigo-500/30 scroll-smooth">
      
      {/* ─── EFEITOS DE FUNDO (Glows) ─── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[20%] -left-40 w-[400px] h-[400px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-[60%] right-0 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* ─── NAVBAR GLASSMORPHISM ─── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark size="md" tone="light" withWordmark />
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
            <a href="#seguranca" className="hover:text-white transition-colors">Segurança</a>
            <a href="#comparativo" className="hover:text-white transition-colors">Comparativo</a>
            <a href="#precos" className="hover:text-white transition-colors">Preços</a>
            <a href="#faq" className="hover:text-white transition-colors">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Entrar
            </Link>
            <Button asChild variant="accent" className="rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] transition-all">
              <Link to="/signup">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative pt-32 pb-24 z-10">
        
        {/* ─── HERO SECTION ─── */}
        <section className="max-w-5xl mx-auto px-6 text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out fill-mode-both">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold tracking-wide uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            O padrão enterprise chegou à odontologia
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500">
            Gestão clínica com a <br className="hidden md:block"/> segurança que você precisa.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Chega de perder prazos ou ter problemas jurídicos. O único sistema com <strong className="text-white">Trava CFO 24h</strong>, agenda anti-conflito e prontuário à prova de falhas. Feito para clínicas que não aceitam amadorismo.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" variant="accent" className="w-full sm:w-auto rounded-full h-12 px-8 text-base shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Link to="/signup">
                <Zap className="mr-2 w-5 h-5 fill-current" /> Criar conta grátis
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto rounded-full h-12 px-8 text-base border-white/10 text-white hover:bg-white/5 bg-transparent">
              <a href="#recursos">Ver funcionalidades</a>
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-6 pt-4 text-xs text-slate-500">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 14 dias grátis</span>
            <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-500" /> Sem cartão</span>
            <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-500" /> Cancele quando quiser</span>
          </div>
        </section>

        {/* ─── MOCKUP DO SISTEMA (Visual) ─── */}
        <section className="max-w-5xl mx-auto px-6 mt-16 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-2 shadow-[0_0_50px_-12px_rgba(99,102,241,0.3)] backdrop-blur-sm">
            <div className="rounded-xl overflow-hidden border border-white/5 bg-slate-950 flex flex-col h-[400px]">
              {/* Fake Browser Header */}
              <div className="h-10 border-b border-white/5 bg-slate-900/50 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <div className="ml-4 h-5 w-64 bg-slate-800 rounded-md flex items-center px-2 text-[10px] text-slate-500">app.dentalcrm.com.br</div>
              </div>
              {/* Fake App Content */}
              <div className="flex flex-1">
                {/* Fake Sidebar */}
                <div className="w-48 border-r border-white/5 bg-slate-900/30 p-4 space-y-4 hidden md:block">
                  <div className="h-6 w-24 bg-slate-800 rounded" />
                  <div className="space-y-2 pt-4">
                    <div className="h-8 w-full bg-indigo-500/20 rounded border border-indigo-500/30 flex items-center px-2 gap-2"><Activity className="w-3 h-3 text-indigo-400"/> <div className="h-2 w-16 bg-indigo-400/50 rounded"/></div>
                    <div className="h-8 w-full bg-slate-800/50 rounded flex items-center px-2 gap-2"><CalendarDays className="w-3 h-3 text-slate-500"/> <div className="h-2 w-16 bg-slate-600 rounded"/></div>
                    <div className="h-8 w-full bg-slate-800/50 rounded flex items-center px-2 gap-2"><Users className="w-3 h-3 text-slate-500"/> <div className="h-2 w-16 bg-slate-600 rounded"/></div>
                  </div>
                </div>
                {/* Fake Main Area */}
                <div className="flex-1 p-6 space-y-6 bg-slate-950">
                  <div className="flex justify-between items-center">
                    <div className="h-8 w-48 bg-slate-800 rounded" />
                    <div className="h-8 w-24 bg-indigo-500/20 border border-indigo-500/30 rounded" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 bg-slate-900 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                       <div className="h-3 w-16 bg-slate-700 rounded" />
                       <div className="h-6 w-24 bg-slate-500 rounded" />
                    </div>
                    <div className="h-24 bg-slate-900 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                       <div className="h-3 w-16 bg-slate-700 rounded" />
                       <div className="h-6 w-24 bg-slate-500 rounded" />
                    </div>
                    <div className="h-24 bg-slate-900 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                       <div className="h-3 w-16 bg-slate-700 rounded" />
                       <div className="h-6 w-24 bg-slate-500 rounded" />
                    </div>
                  </div>
                  {/* Fake Odontograma */}
                  <div className="h-32 bg-slate-900 border border-white/5 rounded-xl p-4 flex items-center justify-center gap-1">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="w-8 h-10 border border-slate-600 rounded-t-lg rounded-b-sm flex flex-col justify-between p-0.5">
                         <div className="h-3 w-full bg-slate-800 rounded-t-sm" />
                         <div className="h-4 w-full bg-indigo-500/30" />
                         <div className="h-2 w-full bg-slate-800 rounded-b-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── RECURSOS COMPLETOS (BENTO GRID) ─── */}
        <section id="recursos" className="max-w-6xl mx-auto px-6 mt-32">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Um sistema completo. Sem letras miúdas.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Tudo o que a sua clínica precisa para operar com excelência, do agendamento à auditoria.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 (Large) */}
            <div className="md:col-span-2 p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] group-hover:bg-indigo-500/20 transition-all" />
              <ShieldAlert className="w-10 h-10 text-indigo-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-2">Prontuário com Trava Jurídica CFO</h3>
              <p className="text-slate-400 max-w-md">Bloqueio automático de edições após 24 horas. Se precisar alterar, o sistema gera um adendo imutável. Tenha a tranquilidade de um prontuário com validade real em processos judiciais.</p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <CalendarDays className="w-10 h-10 text-emerald-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-2">Trava Tripla Anti-Conflito</h3>
              <p className="text-slate-400">Sua recepção nunca mais errará. O sistema impede agendamentos duplicados para a mesma sala, dentista ou paciente no mesmo horário.</p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <Activity className="w-10 h-10 text-rose-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-2">Odontograma 2.5D</h3>
              <p className="text-slate-400">Visualização anatômica com histórico de cada dente. O sistema guarda cada procedimento através de Event-Sourcing.</p>
            </div>

            {/* Feature 4 (Large) */}
            <div className="md:col-span-2 p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group overflow-hidden relative">
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] group-hover:bg-emerald-500/20 transition-all" />
              <MessageCircle className="w-10 h-10 text-emerald-500 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-2">WhatsApp e Teleconsulta Nativos</h3>
              <p className="text-slate-400 max-w-md">Gere links de teleconsulta no Jitsi em 1 clique e envie mensagens de confirmação no WhatsApp automaticamente. Tudo integrado diretamente no agendamento, sem precisar de apps externos.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              { icon: FileText, label: "Anamnese Digital" },
              { icon: TrendingUp, label: "Dashboard KPIs" },
              { icon: CreditCard, label: "Orçamentos PDF" },
              { icon: FolderSync, label: "Multi-Unidades" },
              { icon: Clock, label: "Gestão de Retornos" },
              { icon: Database, label: "Isolamento Total" },
              { icon: Users, label: "Controle de Equipe" },
              { icon: Video, label: "Sala de Espera" }
            ].map((feat, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center text-center gap-3 hover:bg-white/[0.05] transition-colors">
                <feat.icon className="w-6 h-6 text-slate-400" />
                <span className="text-sm font-medium text-slate-300">{feat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SEGURANÇA E COMPLIANCE ─── */}
        <section id="seguranca" className="max-w-6xl mx-auto px-6 mt-32">
          <div className="p-8 md:p-12 rounded-3xl bg-indigo-950/30 border border-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
            <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
              <div>
                <h2 className="text-3xl font-bold text-white mb-4">Segurança nível bancário para a sua clínica.</h2>
                <p className="text-slate-300 mb-6">Em um mercado onde vazamentos de dados geram multas milionárias, o Dental CRM foi construído sobre a arquitetura mais segura do mercado.</p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-sm text-slate-200">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0"><Server className="w-4 h-4 text-emerald-400" /></div>
                    Hospedagem em nuvem AWS (São Paulo)
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-200">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0"><Lock className="w-4 h-4 text-emerald-400" /></div>
                    Isolamento Multi-Tenant (Seus dados nunca se misturam)
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-200">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0"><ShieldCheck className="w-4 h-4 text-emerald-400" /></div>
                    Conformidade total com a LGPD
                  </li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-slate-900/80 rounded-2xl border border-white/10 text-center">
                  <p className="text-3xl font-bold text-white mb-1">99.9%</p>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Uptime</p>
                </div>
                <div className="p-6 bg-slate-900/80 rounded-2xl border border-white/10 text-center">
                  <p className="text-3xl font-bold text-white mb-1">256-bit</p>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Criptografia SSL</p>
                </div>
                <div className="p-6 bg-slate-900/80 rounded-2xl border border-white/10 text-center col-span-2">
                  <p className="text-sm font-semibold text-white mb-1">Backup Automático</p>
                  <p className="text-xs text-slate-400">Seus dados replicados em 3 zonas de disponibilidade.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── COMPARATIVO ─── */}
        <section id="comparativo" className="max-w-4xl mx-auto px-6 mt-32">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Por que mudar para o Dental CRM?</h2>
            <p className="text-slate-400">Veja o que você ganha ao sair do sistema antigo.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-300">Recurso</th>
                  <th className="px-6 py-4 font-semibold text-slate-500 text-center">Sistemas Antigos</th>
                  <th className="px-6 py-4 font-bold text-indigo-400 text-center bg-indigo-500/10">Dental CRM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="px-6 py-4 text-slate-300">Prontuário bloqueado pós-24h</td>
                  <td className="px-6 py-4 text-center text-slate-500"><X className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center bg-indigo-500/5"><Check className="w-5 h-5 mx-auto text-emerald-400" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-slate-300">Agenda com Trava Tripla</td>
                  <td className="px-6 py-4 text-center text-slate-500"><X className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center bg-indigo-500/5"><Check className="w-5 h-5 mx-auto text-emerald-400" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-slate-300">Teleconsulta integrada (Grátis)</td>
                  <td className="px-6 py-4 text-center text-slate-500"><X className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center bg-indigo-500/5"><Check className="w-5 h-5 mx-auto text-emerald-400" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-slate-300">Contrato de Fidelidade</td>
                  <td className="px-6 py-4 text-center text-slate-500">12 meses</td>
                  <td className="px-6 py-4 text-center bg-indigo-500/5 font-semibold text-white">Zero</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ─── PREÇOS (COM TOGGLE MENSAL/ANUAL) ─── */}
        <section id="precos" className="max-w-6xl mx-auto px-6 mt-32">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Planos simples. Sem fidelidade.</h2>
            <p className="text-slate-400">Escolha o plano que acompanha o tamanho da sua clínica. 14 dias grátis.</p>
          </div>

          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center bg-slate-900 border border-white/10 rounded-full p-1">
              <button 
                onClick={() => setIsAnnual(false)} 
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${!isAnnual ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Mensal
              </button>
              <button 
                onClick={() => setIsAnnual(true)} 
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${isAnnual ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Anual <span className="text-[10px] bg-indigo-400 text-indigo-950 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Plano Essencial */}
            <div className="p-8 rounded-3xl border border-white/10 bg-slate-900/50 flex flex-col">
              <h3 className="text-xl font-bold text-white">Essencial</h3>
              <p className="text-sm text-slate-400 mt-2 mb-6">Para dentistas autônomos.</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">R$</span>
                <span className="text-4xl font-bold text-white">{isAnnual ? "237" : "297"}</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>1 Usuário</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Pacientes e LGPD</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Prontuário com Trava CFO</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Odontograma Básico</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Agenda Simples</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-500"><X className="w-5 h-5 shrink-0" /> <span>Sem Orçamentos e Financeiro</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-500"><X className="w-5 h-5 shrink-0" /> <span>Sem WhatsApp e Teleconsulta</span></li>
              </ul>
              <Button asChild variant="outline" className="w-full rounded-full border-white/20 text-white hover:bg-white/5 bg-transparent h-11">
                <Link to="/signup">Começar trial grátis</Link>
              </Button>
            </div>

            {/* Plano Pro (Destaque) */}
            <div className="p-8 rounded-3xl border border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-slate-900/50 flex flex-col relative shadow-[0_0_40px_rgba(99,102,241,0.15)] lg:-translate-y-4">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
              <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-4 w-max">Mais escolhido</div>
              <h3 className="text-xl font-bold text-white">Pro</h3>
              <p className="text-sm text-slate-400 mt-2 mb-6">Para clínicas em crescimento.</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">R$</span>
                <span className="text-4xl font-bold text-white">{isAnnual ? "397" : "497"}</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-white"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span><strong className="text-white">Até 5 Usuários</strong></span></li>
                <li className="flex items-start gap-2 text-sm text-white"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Agenda com Trava Tripla</span></li>
                <li className="flex items-start gap-2 text-sm text-white"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Odontograma Completo</span></li>
                <li className="flex items-start gap-2 text-sm text-white"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span><strong className="text-white">Orçamentos com PDF</strong></span></li>
                <li className="flex items-start gap-2 text-sm text-white"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span><strong className="text-white">WhatsApp Integrado</strong></span></li>
                <li className="flex items-start gap-2 text-sm text-white"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Teleconsulta em Vídeo</span></li>
                <li className="flex items-start gap-2 text-sm text-white"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Dashboard de KPIs</span></li>
              </ul>
              <Button asChild variant="accent" className="w-full rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)] h-11">
                <Link to="/signup">Assinar o Pro</Link>
              </Button>
            </div>

            {/* Plano Clínica */}
            <div className="p-8 rounded-3xl border border-white/10 bg-slate-900/50 flex flex-col">
              <h3 className="text-xl font-bold text-white">Clínica</h3>
              <p className="text-sm text-slate-400 mt-2 mb-6">Para grandes operações.</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">R$</span>
                <span className="text-4xl font-bold text-white">{isAnnual ? "637" : "797"}</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span><strong className="text-white">Usuários Ilimitados</strong></span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Multi-unidades</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span><strong className="text-white">Financeiro e Caixa</strong></span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Relatórios BI</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Retornos Automáticos</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Suporte Prioritário</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Customização de Preços</span></li>
              </ul>
              <Button asChild variant="outline" className="w-full rounded-full border-white/20 text-white hover:bg-white/5 bg-transparent h-11">
                <Link to="/signup">Falar com vendas</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ─── FAQ (ACCORDION) ─── */}
        <section id="faq" className="max-w-3xl mx-auto px-6 mt-32 mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Perguntas Frequentes</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Preciso instalar algo no computador?", a: "Não. O Dental CRM é 100% online (SaaS). Você e sua equipe acessam de qualquer navegador, seja no computador, tablet ou celular." },
              { q: "Como funciona o período de teste?", a: "São 14 dias totalmente gratuitos, sem precisar cadastrar cartão de crédito. Ao final do período, você decide se quer continuar com um dos planos." },
              { q: "O sistema é adequado à LGPD e ao CFO?", a: "Sim. Temos anonimização de pacientes, consentimento versionado e a exclusiva trava de 24h do CFO, que garante a validade jurídica do prontuário." },
              { q: "Tem fidelidade ou multa de cancelamento?", a: "Não. Nós acreditamos que você deve ficar porque o sistema é excelente, não porque assinou um contrato. Cancele quando quiser, em 1 clique." }
            ].map((item, i) => (
              <details key={i} className="group border border-white/10 bg-slate-900/30 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/[0.02] transition-colors">
                  <h3 className="text-base font-semibold text-white">{item.q}</h3>
                  <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 text-sm text-slate-400 border-t border-white/5 pt-4">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ─── CTA FINAL ─── */}
        <section className="max-w-4xl mx-auto px-6 mt-32">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-indigo-500/30 blur-[60px] rounded-full pointer-events-none" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative z-10">Eleve o nível da sua clínica hoje.</h2>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto relative z-10">Junte-se às clínicas que já utilizam a plataforma mais moderna e segura do mercado odontológico.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <Button asChild size="lg" variant="accent" className="w-full sm:w-auto rounded-full h-12 px-10 text-base shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                <Link to="/signup">Começar meu teste grátis <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

      </main>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/5 py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <BrandMark size="sm" tone="light" withWordmark />
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Dental CRM. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
