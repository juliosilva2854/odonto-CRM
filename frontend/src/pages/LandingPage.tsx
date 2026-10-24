import { Link } from "react-router-dom";
import { 
  CalendarDays, ShieldCheck, Lock, Sparkles, 
  ChevronRight, ArrowRight, Activity, Users, FileText, CheckCircle2 
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* ─── EFEITOS DE FUNDO (Glows) ─── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-40 -left-40 w-[400px] h-[400px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* ─── NAVBAR GLASSMORPHISM ─── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark size="md" tone="light" withWordmark />
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
            <a href="#precos" className="hover:text-white transition-colors">Preços</a>
            <a href="#depoimentos" className="hover:text-white transition-colors">Clientes</a>
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
            O futuro da gestão odontológica
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500">
            Gestão clínica com <br className="hidden md:block"/> a segurança que você precisa.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Chega de perder prazos ou ter problemas jurídicos. O único sistema com <strong className="text-white">Trava CFO 24h</strong> e agenda com trava anti-conflito. Feito para clínicas que não aceitam amadorismo.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" variant="accent" className="w-full sm:w-auto rounded-full h-12 px-8 text-base shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Link to="/signup">
                Criar conta grátis <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto rounded-full h-12 px-8 text-base border-white/10 text-white hover:bg-white/5 bg-transparent">
              <a href="#recursos">Ver funcionalidades</a>
            </Button>
          </div>
          <p className="text-xs text-slate-500 pt-2 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 14 dias grátis, sem cartão de crédito.
          </p>
        </section>

        {/* ─── PROVA SOCIAL (Logos) ─── */}
        <section className="max-w-5xl mx-auto px-6 mt-24 text-center">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6">
            Desenvolvido para atender os mais altos padrões
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Substitua por logos de parceiros/clientes reais no futuro */}
            <span className="text-xl font-bold font-serif">Odonto Excellence</span>
            <span className="text-xl font-bold tracking-tighter">Clinicorp</span>
            <span className="text-xl font-bold">CFO Digital</span>
            <span className="text-xl font-bold font-mono">LGPD Brasil</span>
          </div>
        </section>

        {/* ─── BENTO GRID (Recursos) ─── */}
        <section id="recursos" className="max-w-6xl mx-auto px-6 mt-32">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Tudo o que sua clínica precisa.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Do agendamento ao prontuário, construído com a tecnologia mais moderna do mercado.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1 (Grande) */}
            <div className="md:col-span-2 p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] group-hover:bg-indigo-500/20 transition-all" />
              <ShieldCheck className="w-10 h-10 text-indigo-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-2">Trava Jurídica CFO</h3>
              <p className="text-slate-400 max-w-md">Prontuários bloqueados automaticamente após 24h. Se o paciente precisar de alteração posterior, o sistema gera um adendo imutável. Validade jurídica garantida em processos.</p>
            </div>

            {/* Card 2 */}
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
              <CalendarDays className="w-10 h-10 text-emerald-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-2">Trava Tripla</h3>
              <p className="text-slate-400">Sua agenda é à prova de erros. O sistema impede conflitos de horário para o mesmo dentista, sala ou paciente.</p>
            </div>

            {/* Card 3 */}
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
              <Activity className="w-10 h-10 text-rose-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-2">Odontograma Inteligente</h3>
              <p className="text-slate-400">Visualização 2.5D com histórico completo de cada dente. Você sabe exatamente quando e por quem cada procedimento foi realizado.</p>
            </div>

            {/* Card 4 (Grande) */}
            <div className="md:col-span-2 p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group overflow-hidden relative">
               <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] group-hover:bg-emerald-500/20 transition-all" />
              <Lock className="w-10 h-10 text-blue-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-2">Conformidade LGPD Nativa</h3>
              <p className="text-slate-400 max-w-md">Anonimização de dados a um clique, consentimento versionado e log de auditoria de acessos. Durma tranquilo sabendo que seus dados e de seus pacientes estão seguros.</p>
            </div>

          </div>
        </section>

        {/* ─── PREÇOS ─── */}
        <section id="precos" className="max-w-5xl mx-auto px-6 mt-32">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Planos simples. Sem fidelidade.</h2>
            <p className="text-slate-400">Escolha o plano que acompanha o tamanho da sua clínica.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Plano Essencial */}
            <div className="p-8 rounded-3xl border border-white/10 bg-slate-900/50 flex flex-col">
              <h3 className="text-lg font-semibold text-white">Essencial</h3>
              <p className="text-sm text-slate-400 mt-2 mb-6">Para dentistas autônomos.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">R$ 297</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 1 Usuário</li>
                <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Pacientes e Prontuário</li>
                <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Agenda Básica</li>
              </ul>
              <Button asChild variant="outline" className="w-full rounded-full border-white/20 text-white hover:bg-white/5 bg-transparent">
                <Link to="/signup">Começar trial</Link>
              </Button>
            </div>

            {/* Plano Pro (Destaque) */}
            <div className="p-8 rounded-3xl border border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-slate-900/50 flex flex-col relative shadow-[0_0_40px_rgba(99,102,241,0.15)] md:-translate-y-4">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
              <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-4 w-max">Mais escolhido</div>
              <h3 className="text-lg font-semibold text-white">Pro</h3>
              <p className="text-sm text-slate-400 mt-2 mb-6">Para clínicas em crescimento.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">R$ 497</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-white"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Até 5 Usuários</li>
                <li className="flex items-center gap-2 text-sm text-white"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Orçamentos e Comissões</li>
                <li className="flex items-center gap-2 text-sm text-white"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> WhatsApp integrado</li>
                <li className="flex items-center gap-2 text-sm text-white"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Teleconsulta</li>
              </ul>
              <Button asChild variant="accent" className="w-full rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                <Link to="/signup">Assinar o Pro</Link>
              </Button>
            </div>

            {/* Plano Clínica */}
            <div className="p-8 rounded-3xl border border-white/10 bg-slate-900/50 flex flex-col">
              <h3 className="text-lg font-semibold text-white">Clínica</h3>
              <p className="text-sm text-slate-400 mt-2 mb-6">Para grandes operações.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">R$ 797</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Usuários ilimitados</li>
                <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Multi-unidades</li>
                <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Financeiro Completo</li>
              </ul>
              <Button asChild variant="outline" className="w-full rounded-full border-white/20 text-white hover:bg-white/5 bg-transparent">
                <Link to="/signup">Falar com vendas</Link>
              </Button>
            </div>

          </div>
        </section>

      </main>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/5 mt-20 py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <BrandMark size="sm" tone="light" withWordmark />
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Dental CRM. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <a href="#" className="hover:text-white">Termos de Uso</a>
            <a href="#" className="hover:text-white">Privacidade</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
