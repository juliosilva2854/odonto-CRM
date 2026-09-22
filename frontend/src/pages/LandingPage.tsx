import {
  ArrowRight,
  CalendarClock,
  Check,
  FileCheck2,
  LayoutGrid,
  Lock,
  MessageCircle,
} from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER =
  (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? "5511989442854";

const WHATSAPP_MESSAGE =
  "Olá! Tenho interesse no sistema de gestão para clínicas odontológicas. Podem me ajudar?";

const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`;

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: CalendarClock,
    title: "Agenda anti-conflito",
    description:
      "Trava tripla por dentista, sala e paciente. Nunca mais dois agendamentos sobrepostos no mesmo recurso.",
  },
  {
    icon: LayoutGrid,
    title: "Odontograma FDI clicável",
    description:
      "32 dentes em SVG com 5 faces por dente. Planeje procedimentos direto no mapa, com histórico event-sourced.",
  },
  {
    icon: Lock,
    title: "Prontuário com trava CFO 24h",
    description:
      "Janela editável de 24h. Depois disso, tudo vira adendo append-only — conformidade e auditoria garantidas.",
  },
  {
    icon: FileCheck2,
    title: "Orçamentos item-a-item",
    description:
      "Aprovação granular com snapshots de preço e comissão. Aprovar um item já libera o procedimento no odontograma.",
  },
];

interface Plan {
  name: string;
  price: string;
  tagline: string;
  perks: string[];
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Essencial",
    price: "R$ 297",
    tagline: "Para começar com o essencial",
    perks: ["1 usuário", "Pacientes & anamnese", "Agenda anti-conflito", "Prontuário + odontograma"],
  },
  {
    name: "Pro",
    price: "R$ 497",
    tagline: "O mais escolhido pelas clínicas",
    perks: [
      "Até 5 usuários",
      "Tudo do Essencial",
      "Orçamentos & aprovação",
      "WhatsApp & comissão",
    ],
    highlighted: true,
  },
  {
    name: "Clínica",
    price: "R$ 797",
    tagline: "Operação completa, sem limites",
    perks: ["Usuários ilimitados", "Multi-sala", "Financeiro completo", "Dashboard & relatórios"],
  },
];

const STEPS: { step: string; title: string; description: string }[] = [
  {
    step: "1",
    title: "Cadastre sua clínica",
    description: "Leva 2 minutos. Você já entra com 7 dias de teste grátis, sem cartão.",
  },
  {
    step: "2",
    title: "Importe ou cadastre pacientes",
    description: "Traga sua base atual ou cadastre na hora — tudo em conformidade com a LGPD.",
  },
  {
    step: "3",
    title: "Comece a atender",
    description: "Agenda, prontuário, odontograma e orçamentos prontos no primeiro dia.",
  },
];

function WhatsappButton({
  size = "lg",
  className,
}: {
  size?: "lg" | "xl";
  className?: string;
}) {
  return (
    <Button asChild variant="accent" size={size} className={className}>
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />
        Falar no WhatsApp
      </a>
    </Button>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <BrandMark size="md" withWordmark />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="default">
              <a href="/login">Entrar</a>
            </Button>
            <div className="hidden sm:block">
              <WhatsappButton size="lg" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-40 -top-32 h-[520px] w-[520px] rounded-full bg-accent/10 blur-[130px]"
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <Badge variant="accent" className="mb-6">
            Teste 7 dias grátis · sem cartão
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
            Sistema de gestão para clínicas odontológicas
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Odontograma interativo, prontuário com trava CFO, agenda anti-conflito e
            orçamentos — a partir de{" "}
            <span className="font-semibold text-foreground">R$ 297/mês</span>.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <WhatsappButton size="xl" />
            <Button asChild variant="outline" size="xl">
              <a href="/login">
                Entrar
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── O que resolve ── */}
      <section className="border-t border-border/60 bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">O que resolve</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            As dores reais de quem opera uma clínica de alto padrão.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-6 shadow-xs transition-shadow hover:shadow-glow"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planos ── */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Planos</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Todos com <span className="font-medium text-foreground">teste 7 dias grátis</span>.
            Setup único de <span className="font-medium text-foreground">R$ 300</span>{" "}
            (implementação + treinamento).
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={[
                  "relative flex flex-col rounded-2xl border p-7 shadow-xs",
                  plan.highlighted
                    ? "border-accent bg-card ring-1 ring-accent/30"
                    : "border-border bg-card",
                ].join(" ")}
              >
                {plan.highlighted && (
                  <Badge variant="accent" className="absolute -top-3 left-7">
                    ⭐ Mais escolhido
                  </Badge>
                )}
                <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button
                    asChild
                    variant={plan.highlighted ? "accent" : "outline"}
                    size="lg"
                    className="w-full"
                  >
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      Começar teste grátis
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section className="border-t border-border/60 bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Como funciona</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map(({ step, title, description }) => (
              <div key={step} className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                  {step}
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <WhatsappButton size="xl" />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark size="sm" withWordmark />
          </div>
          <div className="space-y-1">
            <p>CNPJ 00.000.000/0001-00</p>
            <p>
              Contato:{" "}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent hover:underline"
              >
                WhatsApp
              </a>
            </p>
            <p className="text-xs">Dados tratados em conformidade com a LGPD (Lei 13.709/2018).</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
