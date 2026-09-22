import { Building2, FileText, Globe, Hash, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { maskCnpj } from "@/lib/masks";
import { planLabel } from "@/lib/plans";
import { useAuthStore } from "@/store/auth";

const SUPPORT_WHATSAPP =
  "https://wa.me/5511999999999?text=" +
  encodeURIComponent("Olá! Preciso atualizar os dados cadastrais da minha clínica.");

export default function ClinicPage() {
  const clinic = useAuthStore((s) => s.clinic);

  const rows = [
    {
      icon: <FileText className="h-4 w-4" />,
      label: "Razão social",
      value: clinic?.legal_name ?? "—",
    },
    {
      icon: <Building2 className="h-4 w-4" />,
      label: "Nome fantasia",
      value: clinic?.trade_name ?? "—",
    },
    {
      icon: <Hash className="h-4 w-4" />,
      label: "CNPJ",
      value: clinic?.cnpj ? maskCnpj(clinic.cnpj) : "—",
    },
    {
      icon: <Globe className="h-4 w-4" />,
      label: "Fuso horário",
      value: clinic?.timezone ?? "—",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6" data-testid="clinic-page">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Configurações
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Dados da Clínica
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informações cadastrais da sua clínica.
        </p>
      </header>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {clinic?.trade_name ?? "Sua clínica"}
              </p>
              <p className="text-xs text-muted-foreground">
                Plano {clinic ? planLabel(clinic.plan) : "—"}
              </p>
            </div>
          </div>
          {clinic && <Badge variant="accent">Plano {planLabel(clinic.plan)}</Badge>}
        </div>

        <dl className="divide-y divide-border">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center gap-4 px-6 py-4"
              data-testid={`clinic-field-${r.label}`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                {r.icon}
              </span>
              <dt className="w-40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {r.label}
              </dt>
              <dd className="flex-1 text-sm font-medium text-foreground">
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Precisa alterar esses dados?
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            A edição de dados cadastrais é feita pelo nosso time de suporte.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" /> Falar com suporte
          </a>
        </Button>
      </Card>
    </div>
  );
}
