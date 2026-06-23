import { Link } from "react-router-dom";
import { ArrowUpRight, Calendar, Receipt, Sparkles, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const clinic = useAuthStore((s) => s.clinic);

  const firstName = user?.full_name?.split(" ")[0] ?? "doutor(a)";

  return (
    <div className="mx-auto max-w-6xl space-y-10" data-testid="dashboard-page">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          {clinic?.trade_name ?? "Clínica"}
        </p>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">
          Olá, {firstName}.
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          O módulo clínico (pacientes · odontograma · prontuário) já está ativo na S5.2.
          Clique em <Link to="/patients" className="font-medium text-accent hover:underline">Pacientes</Link>{" "}
          para começar.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <ModuleCard
          to="/agenda"
          Icon={Calendar}
          title="Agenda"
          description="Multi-recurso, anti-conflito e check-in em tempo real."
          status="S6"
          enabled={false}
        />
        <ModuleCard
          to="/patients"
          Icon={Users}
          title="Pacientes"
          description="Cadastro LGPD-safe, prontuário com lock CFO e anamnese."
          status="Ativo"
          enabled
        />
        <ModuleCard
          to="/patients"
          Icon={Sparkles}
          title="Odontograma"
          description="Padrão FDI clicável com histórico event-sourced."
          status="Ativo"
          enabled
        />
        <ModuleCard
          to="/finance"
          Icon={Receipt}
          title="Orçamentos"
          description="Aprovação item-a-item conectada ao plano clínico."
          status="S7"
          enabled={false}
        />
      </section>
    </div>
  );
}

function ModuleCard({
  to,
  Icon,
  title,
  description,
  status,
  enabled,
}: {
  to: string;
  Icon: typeof Calendar;
  title: string;
  description: string;
  status: string;
  enabled: boolean;
}) {
  const inner = (
    <Card
      className={
        enabled
          ? "group transition-all hover:-translate-y-0.5 hover:shadow-elevated"
          : "opacity-70"
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Icon className="h-5 w-5" />
          </div>
          <Badge variant={enabled ? "accent" : "outline"}>{status}</Badge>
        </div>
        <CardTitle className="pt-4">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-accent">
          {enabled ? (
            <>
              Acessar módulo
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </>
          ) : (
            "Em construção"
          )}
        </p>
      </CardContent>
    </Card>
  );
  return enabled ? <Link to={to}>{inner}</Link> : inner;
}
