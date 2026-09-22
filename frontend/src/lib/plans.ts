import type { PlanTier } from "@/types/api";

export interface PlanDef {
  tier: PlanTier;
  name: string;
  priceLabel: string;
  priceMonthly: number;
  tagline: string;
  features: string[];
  highlight?: boolean;
}

export const PLANS: PlanDef[] = [
  {
    tier: "essencial",
    name: "Essencial",
    priceLabel: "R$ 297",
    priceMonthly: 297,
    tagline: "Consult\u00f3rio solo",
    features: [
      "1 usu\u00e1rio",
      "Pacientes",
      "Agenda",
      "Prontu\u00e1rio",
      "Odontograma",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    priceLabel: "R$ 497",
    priceMonthly: 497,
    tagline: "Cl\u00ednica pequena (2-4 dentistas)",
    highlight: true,
    features: [
      "Tudo do Essencial",
      "Or\u00e7amentos",
      "WhatsApp",
      "Comiss\u00e3o",
      "5 usu\u00e1rios",
      "Multi-sala",
    ],
  },
  {
    tier: "clinica",
    name: "Cl\u00ednica",
    priceLabel: "R$ 797",
    priceMonthly: 797,
    tagline: "Cl\u00ednica m\u00e9dia (5+ dentistas)",
    features: [
      "Tudo do Pro",
      "Multi-unidade",
      "Financeiro",
      "Usu\u00e1rios ilimitados",
      "Suporte priorit\u00e1rio",
    ],
  },
];

export const PLAN_MAP: Record<PlanTier, PlanDef> = {
  essencial: PLANS[0],
  pro: PLANS[1],
  clinica: PLANS[2],
};

export function planLabel(tier: string): string {
  return (PLAN_MAP as Record<string, PlanDef>)[tier]?.name ?? tier;
}
