import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  ArrowUpRight, CalendarDays, DollarSign, Users, 
  Clock, FileText, Activity, Plus, TrendingUp, MoreHorizontal
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

interface DashboardData {
  greeting_name: string;
  appointments_today_count: number;
  appointments_today_list: { id: string; patient_name: string; starts_at: string; status: string }[];
  patients_total: number;
  patients_new_this_month: number;
  quotes_month_total: number;
  quotes_month_amount: string;
  pending_quotes_count: number;
  procedures_top_5: { procedure_name: string; count: number }[];
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const res = await api.get<DashboardData>("/api/dashboard/overview");
      return res.data;
    },
  });

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const getFirstName = () => {
    const parts = (user?.full_name || data.greeting_name || "Doutor(a)").split(" ").filter(Boolean);
    if (parts.length > 1 && (parts[0].toLowerCase() === "dr." || parts[0].toLowerCase() === "dr" || parts[0].toLowerCase() === "dra." || parts[0].toLowerCase() === "dra")) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0];
  };

  const displayName = getFirstName();

  // Dados mockados APENAS para visualização do gráfico de área (até a API retornar histórico)
  const chartData = [35, 45, 30, 60, 50, 80, 65];
  const months = ["Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov"];

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ─── HEADER ─── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {greeting}, {displayName}.
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Aqui está o resumo da sua clínica hoje.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
            <Link to="/patients">
              <Users className="mr-2 h-4 w-4 text-slate-400" /> Novo Paciente
            </Link>
          </Button>
          <Button asChild variant="accent" className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 text-white">
            <Link to="/agenda">
              <CalendarDays className="mr-2 h-4 w-4" /> Agendar
            </Link>
          </Button>
        </div>
      </header>

      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 text-white border-0 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-300">Faturamento (Mês)</p>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <h3 className="text-3xl font-bold tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(data.quotes_month_amount))}
            </h3>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-400" /> Baseado em {data.quotes_month_total} orçamentos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-500">Consultas Hoje</p>
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                <CalendarDays className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{data.appointments_today_count}</h3>
            <p className="text-xs text-slate-500 mt-2 font-medium">Agendamentos confirmados</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-500">Pacientes Ativos</p>
              <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                <Users className="h-4 w-4 text-teal-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{data.patients_total}</h3>
            <p className="text-xs text-teal-600 mt-2 font-medium flex items-center gap-1">
              +{data.patients_new_this_month} novos este mês
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-500">Aprovações Pendentes</p>
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                <FileText className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{data.pending_quotes_count}</h3>
            <p className="text-xs text-slate-500 mt-2 font-medium">Aguardando paciente</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── GRÁFICOS E AGENDA ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de Faturamento (Ocupa 2 colunas) */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Desempenho da Clínica</h3>
              <p className="text-xs text-slate-500">Faturamento e volume de consultas nos últimos meses.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Faturamento
              </span>
            </div>
          </div>
          <CardContent className="p-6 flex-1 flex flex-col justify-end">
            {/* Gráfico de Barras SVG simulado (Pronto para receber dados reais) */}
            <div className="h-48 w-full flex items-end justify-between gap-2 sm:gap-4 mt-4 relative">
              {/* Linhas de grade de fundo */}
              <div className="absolute inset-0 flex flex-col justify-between border-b border-slate-100 pb-6">
                <div className="border-t border-slate-100 w-full h-0"></div>
                <div className="border-t border-slate-100 w-full h-0"></div>
                <div className="border-t border-slate-100 w-full h-0"></div>
                <div className="border-t border-slate-100 w-full h-0"></div>
              </div>

              {chartData.map((value, i) => (
                <div key={i} className="flex flex-col items-center flex-1 group relative z-10">
                  <div 
                    className="w-full max-w-[40px] bg-indigo-100 rounded-t-sm group-hover:bg-indigo-600 transition-all duration-300 relative"
                    style={{ height: `${value}%` }}
                  >
                    {/* Tooltip no hover */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded pointer-events-none transition-opacity">
                      R$ {(value * 100).toFixed(0)}
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 mt-2">{months[i]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Agenda de Hoje (Ocupa 1 coluna) */}
        <Card className="lg:col-span-1 border-slate-200 shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Agenda de Hoje</h3>
            <Link to="/agenda" className="text-xs font-semibold text-indigo-600 hover:underline">Ver tudo</Link>
          </div>
          <div className="p-2 flex-1">
            {data.appointments_today_list.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-4">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <Clock className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Tudo tranquilo</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Nenhuma consulta para hoje.</p>
                <Button asChild size="sm" variant="outline" className="h-8 text-xs border-slate-200 text-slate-600">
                  <Link to="/agenda"><Plus className="w-3.5 h-3.5 mr-1" /> Novo Agendamento</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-1">
                {data.appointments_today_list.map((apt) => (
                  <li key={apt.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-indigo-50 text-indigo-700 shrink-0 border border-indigo-100">
                      <span className="text-xs font-bold">{format(new Date(apt.starts_at), "HH:mm")}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{apt.patient_name}</p>
                      <p className="text-xs text-slate-500 capitalize">{apt.status.replace('_', ' ')}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

      </div>

      {/* ─── PROCEDIMENTOS E ATIVIDADES ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Procedimentos */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Top Procedimentos (Mês)</h3>
            <p className="text-xs text-slate-500">O que mais está gerando receita na clínica.</p>
          </div>
          <CardContent className="p-6">
            {data.procedures_top_5.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-8 w-8 text-slate-200 mb-2" />
                <p className="text-sm font-medium text-slate-500">Sem dados suficientes.</p>
                <p className="text-xs text-slate-400 mb-4">Crie orçamentos para gerar o gráfico.</p>
                <Button asChild size="sm" variant="outline" className="h-8 text-xs border-slate-200 text-slate-600">
                  <Link to="/finance/quotes"><Plus className="w-3.5 h-3.5 mr-1" /> Criar Orçamento</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {data.procedures_top_5.map((proc, index) => {
                  const maxCount = data.procedures_top_5[0].count;
                  const percent = Math.max(10, (proc.count / maxCount) * 100);
                  
                  return (
                    <div key={proc.procedure_name} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-slate-700">{proc.procedure_name}</span>
                        <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{proc.count}</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000 ease-out",
                            index === 0 ? "bg-indigo-600" : index === 1 ? "bg-indigo-400" : "bg-indigo-300"
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas Atividades (Feed visual) */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Atividades Recentes</h3>
              <p className="text-xs text-slate-500">Acompanhe o que está acontecendo.</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {[
                { icon: Users, title: "Novo paciente cadastrado", desc: "Maria Silva", time: "Há 10 min", color: "text-teal-600", bg: "bg-teal-50" },
                { icon: FileText, title: "Orçamento aprovado", desc: "Lucas Oliveira - R$ 1.200,00", time: "Há 1 hora", color: "text-indigo-600", bg: "bg-indigo-50" },
                { icon: CalendarDays, title: "Consulta cancelada", desc: "Ana Souza - 14:00", time: "Há 2 horas", color: "text-rose-600", bg: "bg-rose-50" },
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", activity.bg)}>
                    <activity.icon className={cn("h-5 w-5", activity.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{activity.title}</p>
                    <p className="text-xs text-slate-500 truncate">{activity.desc}</p>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 shrink-0">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <Skeleton className="col-span-2 h-80 rounded-xl" />
        <Skeleton className="col-span-1 h-80 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
