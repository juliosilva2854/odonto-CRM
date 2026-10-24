import { Link } from "react-router-dom";
import { 
  CalendarDays, ShieldCheck, Lock, Sparkles, ArrowRight, Activity, 
  CheckCircle2, X, Check, FileText, Video, CreditCard, Users, 
  MessageCircle, Clock, Database, Star, TrendingUp, 
  ShieldAlert, FolderSync, Zap
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* ─── EFEITOS DE FUNDO (Glows) ─── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-40 -left-40 w-[400px] h-[400px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-[40%] right-0 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* ─── NAVBAR GLASSMORPHISM ─── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark size="md" tone="light" withWordmark />
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
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
            A evolução da gestão odontológica
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500">
            Gestão clínica com <br className="hidden md:block"/> a segurança que você precisa.
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
          <p className="text-xs text-slate-500 pt-2 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 14 dias grátis, sem cartão de crédito. Cancele quando quiser.
          </p>
        </section>

        {/* ─── PROVA SOCIAL ─── */}
        <section className="max-w-5xl mx-auto px-6 mt-24 text-center">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6">
            Desenvolvido para atender os mais altos padrões
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            <span className="text-xl font-bold font-serif flex items-center gap-2"><ShieldCheck className="w-5 h-5"/> CFO Compliant</span>
            <span className="text-xl font-bold tracking-tighter flex items-center gap-2"><Lock className="w-5 h-5"/> LGPD Ready</span>
            <span className="text-xl font-bold flex items-center gap-2"><Database className="w-5 h-5"/> Cloud AWS</span>
            <span className="text-xl font-bold font-mono flex items-center gap-2"><Activity className="w-5 h-5"/> 99.9% Uptime</span>
          </div>
        </section>

        {/* ─── RECURSOS COMPLETOS ─── */}
        <section id="recursos" className="max-w-6xl mx-auto px-6 mt-32">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Um sistema completo. Sem letras miúdas.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Tudo o que a sua clínica precisa para operar com excelência, do agendamento à auditoria.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <ShieldAlert className="w-8 h-8 text-indigo-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Trava CFO 24h</h3>
              <p className="text-sm text-slate-400">Prontuários bloqueados em 24h. Alterações geram adendos imutáveis.</p>
            </div>
            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <CalendarDays className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Trava Tripla</h3>
              <p className="text-sm text-slate-400">Impede conflitos de horário para o mesmo dentista, sala ou paciente.</p>
            </div>
            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <Activity className="w-8 h-8 text-rose-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Odontograma 2.5D</h3>
              <p className="text-sm text-slate-400">Visualização interativa com histórico completo de cada dente.</p>
            </div>
            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <FileText className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Anamnese Digital</h3>
              <p className="text-sm text-slate-400">Formulário clínico versionado e assinado pelo paciente.</p>
            </div>
            {/* Card 5 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <Video className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Teleconsulta</h3>
              <p className="text-sm text-slate-400">Sala de vídeo gerada em 1 clique direto do agendamento.</p>
            </div>
            {/* Card 6 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <MessageCircle className="w-8 h-8 text-emerald-500 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">WhatsApp Nativo</h3>
              <p className="text-sm text-slate-400">Confirmações e lembretes gerados automaticamente.</p>
            </div>
            {/* Card 7 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <TrendingUp className="w-8 h-8 text-amber-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Dashboard KPIs</h3>
              <p className="text-sm text-slate-400">Faturamento, top procedimentos e agenda do dia.</p>
            </div>
            {/* Card 8 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <CreditCard className="w-8 h-8 text-indigo-300 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Orçamentos PDF</h3>
              <p className="text-sm text-slate-400">Aprovação item-a-item com a identidade da sua clínica.</p>
            </div>
            {/* Card 9 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <FolderSync className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Multi-Unidades</h3>
              <p className="text-sm text-slate-400">Gerencie várias filiais com isolamento total de dados.</p>
            </div>
            {/* Card 10 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <Clock className="w-8 h-8 text-orange-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Gestão de Retornos</h3>
              <p className="text-sm text-slate-400">Avisos automáticos de quando o paciente deve voltar.</p>
            </div>
            {/* Card 11 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <Database className="w-8 h-8 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Isolamento Total</h3>
              <p className="text-sm text-slate-400">Arquitetura Multi-Tenant. Seus dados nunca se misturam.</p>
            </div>
            {/* Card 12 */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <Users className="w-8 h-8 text-pink-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Controle de Equipe</h3>
              <p className="text-sm text-slate-400">Permissões específicas para admin, dentista e recepção.</p>
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

        {/* ─── COMO FUNCIONA ─── */}
        <section id="como-funciona" className="max-w-6xl mx-auto px-6 mt-32">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Pronto para usar em minutos.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Sem instalação, sem servidor, sem treinamento longo. Comece a usar hoje.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20">
                <span className="text-2xl font-bold text-indigo-400">1</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Crie sua conta</h3>
              <p className="text-sm text-slate-400">Cadastre sua clínica em 2 minutos. Sem cartão de crédito.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20">
                <span className="text-2xl font-bold text-indigo-400">2</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Convide sua equipe</h3>
              <p className="text-sm text-slate-400">Adicione dentistas e recepcionistas. Cada um vê o que precisa.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20">
                <span className="text-2xl font-bold text-indigo-400">3</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Comece a atender</h3>
              <p className="text-sm text-slate-400">Acesse do computador ou celular. O sistema está pronto.</p>
            </div>
          </div>
        </section>

        {/* ─── DEPOIMENTOS ─── */}
        <section className="max-w-6xl mx-auto px-6 mt-32">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">O que os dentistas dizem.</h2>
            <p className="text-slate-400">A escolha de clínicas que não abrem mão da segurança.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex gap-1 mb-4 text-amber-400">
                <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-slate-300 text-sm italic mb-4">"A trava de 24h do CFO me deu uma paz de espírito que eu não tinha com o sistema antigo. Se precisar, tenho tudo documentado de forma segura."</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300">DR</div>
                <div>
                  <p className="text-sm font-semibold text-white">Dr. Ricardo</p>
                  <p className="text-xs text-slate-500">Clínica Sorriso Perfeito</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex gap-1 mb-4 text-amber-400">
                <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-slate-300 text-sm italic mb-4">"A trava tripla da agenda eliminou os erros da recepção. Antes tínhamos dois pacientes no mesmo horário uma vez por semana, agora é zero."</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-300">DM</div>
                <div>
                  <p className="text-sm font-semibold text-white">Dra. Mariana</p>
                  <p className="text-xs text-slate-500">Odonto Excellence</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex gap-1 mb-4 text-amber-400">
                <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-slate-300 text-sm italic mb-4">"Finalmente um sistema que não trava e é bonito de usar. A recepção adorou o WhatsApp integrado e os dentistas o odontograma interativo."</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300">GL</div>
                <div>
                  <p className="text-sm font-semibold text-white">Dr. Guilherme</p>
                  <p className="text-xs text-slate-500">Clínica OdontoVida</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PREÇOS ─── */}
        <section id="precos" className="max-w-6xl mx-auto px-6 mt-32">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Planos simples. Sem fidelidade.</h2>
            <p className="text-slate-400">Escolha o plano que acompanha o tamanho da sua clínica. 14 dias grátis.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Plano Essencial */}
            <div className="p-8 rounded-3xl border border-white/10 bg-slate-900/50 flex flex-col">
              <h3 className="text-xl font-bold text-white">Essencial</h3>
              <p className="text-sm text-slate-400 mt-2 mb-6">Para dentistas autônomos.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">R$ 297</span>
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
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">R$ 497</span>
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
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">R$ 797</span>
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

        {/* ─── CTA FINAL ─── */}
        <section className="max-w-4xl mx-auto px-6 mt-32">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-indigo-500/30 blur-[60px] rounded-full pointer-events-none" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative z-10">Eleve o nível da sua clínica hoje.</h2>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto relative z-10">Junte-se às clínicas que já utilizam a plataforma mais moderna e segura do mercado odontológico.</p>
            <Button asChild size="lg" variant="accent" className="rounded-full h-12 px-10 text-base shadow-[0_0_20px_rgba(99,102,241,0.4)] relative z-10">
              <Link to="/signup">Começar meu teste grátis</Link>
            </Button>
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
