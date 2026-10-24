import { Link } from "react-router-dom";
import { 
  CalendarDays, ShieldCheck, Lock, Sparkles, ArrowRight, Activity, 
  CheckCircle2, X, Check, FileText, Video, CreditCard, Users, 
  BarChart4, MessageCircle, Clock, Database
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
            A evolução da gestão odontológica
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500">
            Gestão clínica com <br className="hidden md:block"/> a segurança que você precisa.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Chega de perder prazos ou ter problemas jurídicos. O único sistema com <strong className="text-white">Trava CFO 24h</strong>, agenda anti-conflito e prontuário à prova de falhas.
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

        {/* ─── RECURSOS COMPLETOS ─── */}
        <section id="recursos" className="max-w-6xl mx-auto px-6 mt-32">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Um sistema completo. Sem letras miúdas.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Tudo o que a sua clínica precisa para operar com excelência, do agendamento à auditoria.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <ShieldCheck className="w-8 h-8 text-indigo-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Trava Jurídica CFO</h3>
              <p className="text-sm text-slate-400">Prontuários bloqueados automaticamente após 24h. Alterações posteriores geram adendos imutáveis para validade em juízo.</p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <CalendarDays className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Trava Tripla na Agenda</h3>
              <p className="text-sm text-slate-400">O sistema impede conflitos de horário para o mesmo dentista, sala ou paciente. Sua recepção nunca mais errará.</p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <Activity className="w-8 h-8 text-rose-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Odontograma Interativo</h3>
              <p className="text-sm text-slate-400">Visualização 2.5D com histórico completo de cada dente (Event-Sourced). Rastreie cada procedimento de forma cirúrgica.</p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <FileText className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Anamnese Digital</h3>
              <p className="text-sm text-slate-400">Formulário clínico versionado e integrado ao prontuário. Segurança total antes de qualquer procedimento.</p>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <Video className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Teleconsulta Integrada</h3>
              <p className="text-sm text-slate-400">Geração de link de vídeo (Jitsi) em 1 clique, direto do agendamento. Atenda pacientes remotamente sem custo extra.</p>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <MessageCircle className="w-8 h-8 text-emerald-500 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">WhatsApp Nativo</h3>
              <p className="text-sm text-slate-400">Mensagens de confirmação, lembrete e check-in geradas automaticamente. Envie também o link da teleconsulta.</p>
            </div>

            {/* Card 7 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <BarChart4 className="w-8 h-8 text-amber-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Dashboard de KPIs</h3>
              <p className="text-sm text-slate-400">Acompanhe consultas do dia, faturamento do mês, top procedimentos e orçamentos pendentes em uma visão gerencial.</p>
            </div>

            {/* Card 8 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <CreditCard className="w-8 h-8 text-indigo-300 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Orçamentos com PDF</h3>
              <p className="text-sm text-slate-400">Aprovação item-a-item pelo paciente. Emissão de PDF com a identidade visual da sua clínica e link de pagamento.</p>
            </div>

            {/* Card 9 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <Lock className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Conformidade LGPD</h3>
              <p className="text-sm text-slate-400">Anonimização de pacientes a um clique, consentimentos versionados e log de auditoria de acessos. Em paz com a lei.</p>
            </div>

            {/* Card 10 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <Clock className="w-8 h-8 text-orange-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Gestão de Retornos</h3>
              <p className="text-sm text-slate-400">Sistema avisa quando o paciente precisa retornar. Recupere a receita que estava esquecida na gaveta.</p>
            </div>

            {/* Card 11 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <Database className="w-8 h-8 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Multi-Tenant Isolado</h3>
              <p className="text-sm text-slate-400">Seus dados nunca se misturam com outras clínicas. Arquitetura de nível corporativo para isolamento total de banco.</p>
            </div>

            {/* Card 12 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <Users className="w-8 h-8 text-pink-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Controle de Equipe</h3>
              <p className="text-sm text-slate-400">Gerencie acessos para recepção, dentistas e administradores, cada um com as permissões certas.</p>
            </div>
          </div>
        </section>

        {/* ─── PREÇOS (DETALHADOS) ─── */}
        <section id="precos" className="max-w-6xl mx-auto px-6 mt-32">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Planos simples. Sem fidelidade.</h2>
            <p className="text-slate-400">Comece com 14 dias grátis. Cancele quando quiser.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Plano Essencial */}
            <div className="p-8 rounded-3xl border border-white/10 bg-slate-900/50 flex flex-col">
              <h3 className="text-xl font-bold text-white">Essencial</h3>
              <p className="text-sm text-slate-400 mt-2 mb-6">Para dentistas autônomos que buscam organização e segurança.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">R$ 297</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>1 Usuário</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Cadastro de Pacientes e LGPD</span></li>
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
              <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-4 w-max">Mais escolhido pelas clínicas</div>
              <h3 className="text-xl font-bold text-white">Pro</h3>
              <p className="text-sm text-slate-400 mt-2 mb-6">A escolha ideal para clínicas modernas e em crescimento.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">R$ 497</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-white"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span><strong className="text-white">Até 5 Usuários</strong></span></li>
                <li className="flex items-start gap-2 text-sm text-white"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Agenda Multi-recurso (Trava Tripla)</span></li>
                <li className="flex items-start gap-2 text-sm text-white"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Odontograma Completo Interativo</span></li>
                <li className="flex items-start gap-2 text-sm text-white"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span><strong className="text-white">Orçamentos com PDF</strong></span></li>
                <li className="flex items-start gap-2 text-sm text-white"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span><strong className="text-white">WhatsApp Integrado</strong></span></li>
                <li className="flex items-start gap-2 text-sm text-white"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Teleconsulta em Vídeo</span></li>
                <li className="flex items-start gap-2 text-sm text-white"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Comissões Automáticas</span></li>
              </ul>
              <Button asChild variant="accent" className="w-full rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)] h-11">
                <Link to="/signup">Assinar o Pro</Link>
              </Button>
            </div>

            {/* Plano Clínica */}
            <div className="p-8 rounded-3xl border border-white/10 bg-slate-900/50 flex flex-col">
              <h3 className="text-xl font-bold text-white">Clínica</h3>
              <p className="text-sm text-slate-400 mt-2 mb-6">Para grandes operações e redes com múltiplas unidades.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">R$ 797</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span><strong className="text-white">Usuários Ilimitados</strong></span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Multi-unidades (CNPJs diferentes)</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span><strong className="text-white">Controle Financeiro e Caixa</strong></span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Relatórios de BI Avançados</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Anamnese e Retornos</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Suporte Prioritário</span></li>
                <li className="flex items-start gap-2 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> <span>Customização de Preços (Cupons)</span></li>
              </ul>
              <Button asChild variant="outline" className="w-full rounded-full border-white/20 text-white hover:bg-white/5 bg-transparent h-11">
                <Link to="/signup">Falar com vendas</Link>
              </Button>
            </div>

          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section id="faq" className="max-w-3xl mx-auto px-6 mt-32 mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Perguntas Frequentes</h2>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Preciso instalar algo no computador?</h3>
              <p className="text-slate-400 text-sm">Não. O Dental CRM é 100% online (SaaS). Você e sua equipe acessam de qualquer navegador, seja no computador, tablet ou celular.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Como funciona o período de teste?</h3>
              <p className="text-slate-400 text-sm">São 14 dias totalmente gratuitos, sem precisar cadastrar cartão de crédito. Ao final do período, você decide se quer continuar com um dos planos.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">O sistema é adequado à LGPD e ao CFO?</h3>
              <p className="text-slate-400 text-sm">Sim. Temos anonimização de pacientes, consentimento versionado e a exclusiva trava de 24h do CFO, que garante a validade jurídica do prontuário.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Tem fidelidade ou multa de cancelamento?</h3>
              <p className="text-slate-400 text-sm">Não. Nós acreditamos que você deve ficar porque o sistema é excelente, não porque assinou um contrato. Cancele quando quiser, em 1 clique.</p>
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
