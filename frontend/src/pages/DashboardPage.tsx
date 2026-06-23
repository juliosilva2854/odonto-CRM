import { Calendar, Receipt, Sparkles, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";

/**
 * Placeholder home page for the post-login experience.
 * The clinical modules (S5.2+) will replace these cards with live data.
 */
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const clinic = useAuthStore((s) => s.clinic);

  const firstName = user?.full_name?.split(" ")[0] ?? "doutor(a)";

  return (
    <div className="mx-auto max-w-6xl space-y-10" data-testid="dashboard-page">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {clinic?.trade_name ?? ""}
        </p>
        <h1 className="text-4xl font-semibold leading-tight">
          Bom dia, {firstName}.
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Os módulos clínicos e financeiros entrarão em produção no próximo
          sprint. A fundação visual e a autenticação já estão prontas.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <PlaceholderCard
          Icon={Calendar}
          title="Agenda"
          description="Multi-recurso, anti-conflito e check-in em tempo real."
          eta="S5.2"
        />
        <PlaceholderCard
          Icon={Users}
          title="Pacientes"
          description="Cadastro LGPD-safe, prontuário com lock CFO e anamnese."
          eta="S5.3"
        />
        <PlaceholderCard
          Icon={Sparkles}
          title="Odontograma"
          description="Padrão FDI clicável com histórico event-sourced."
          eta="S5.4"
        />
        <PlaceholderCard
          Icon={Receipt}
          title="Orçamentos"
          description="Aprovação item-a-item conectada ao plano clínico."
          eta="S5.5"
        />
      </section>
    </div>
  );
}

function PlaceholderCard({
  Icon,
  title,
  description,
  eta,
}: {
  Icon: typeof Calendar;
  title: string;
  description: string;
  eta: string;
}) {
  return (
    <Card className="group transition-shadow hover:shadow-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
            {eta}
          </span>
        </div>
        <CardTitle className="pt-3 text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground/80">
          Em construção · disponibilizado no próximo sprint
        </p>
      </CardContent>
    </Card>
  );
}
