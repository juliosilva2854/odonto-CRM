import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
  UserRound,
} from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/api";
import { isValidCnpj, maskCnpj, onlyDigits } from "@/lib/masks";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/plans";
import { authService } from "@/services/auth.service";
import { onboardingService } from "@/services/onboarding.service";
import { useAuthStore } from "@/store/auth";
import type { PlanTier } from "@/types/api";

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Cuiaba",
  "America/Porto_Velho",
  "America/Rio_Branco",
  "America/Noronha",
];

const STEPS = ["Sua clínica", "Administrador", "Escolha seu plano"];

export default function SignupPage() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setIdentity = useAuthStore((s) => s.setIdentity);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Step 1 — clinic
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");

  // Step 2 — admin
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Step 3 — plan
  const [plan, setPlan] = useState<PlanTier>("pro");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordValid = useMemo(
    () => password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password),
    [password],
  );

  if (isAuthed) return <Navigate to="/dashboard" replace />;

  function validateStep(current: number): boolean {
    const e: Record<string, string> = {};
    if (current === 0) {
      if (legalName.trim().length < 2) e.legalName = "Informe a razão social.";
      if (tradeName.trim().length < 2) e.tradeName = "Informe o nome fantasia.";
      if (!isValidCnpj(cnpj)) e.cnpj = "CNPJ inválido.";
      if (!timezone) e.timezone = "Selecione o fuso horário.";
    }
    if (current === 1) {
      if (fullName.trim().length < 2) e.fullName = "Informe o nome completo.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        e.email = "E-mail inválido.";
      if (!passwordValid)
        e.password = "Mínimo 8 caracteres, com letra e número.";
      if (confirm !== password) e.confirm = "As senhas não coincidem.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setServerError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validateStep(0) || !validateStep(1)) {
      setStep(0);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await onboardingService.signup({
        clinic_legal_name: legalName.trim(),
        clinic_trade_name: tradeName.trim(),
        clinic_cnpj: onlyDigits(cnpj),
        clinic_timezone: timezone,
        admin_full_name: fullName.trim(),
        admin_email: email.trim(),
        admin_password: password,
        plan,
      });
      setTokens(res.access_token, res.refresh_token);
      const me = await authService.me();
      setIdentity(me.user, {
        id: String(me.clinic.id),
        legal_name: String(me.clinic.legal_name),
        trade_name: String(me.clinic.trade_name),
        cnpj: String(me.clinic.cnpj),
        timezone: String(me.clinic.timezone),
        plan: String(me.clinic.plan),
      });
      toast({
        variant: "success",
        title: "Bem-vindo!",
        description: "14 dias grátis começaram.",
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, "Não foi possível criar sua conta."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.1fr_1fr]">
      {/* ─── Left splash ─────────────────────────────────────── */}
      <aside className="relative hidden overflow-hidden bg-foreground text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-dotgrid opacity-30" aria-hidden />
        <div
          className="pointer-events-none absolute -left-32 top-1/3 h-[420px] w-[420px] rounded-full bg-accent/40 blur-[120px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-[360px] w-[360px] rounded-full bg-indigo-500/30 blur-[120px]"
          aria-hidden
        />

        <div className="relative z-10 flex items-center gap-3 px-12 pt-12">
          <BrandMark size="md" withWordmark tone="light" />
        </div>

        <div className="relative z-10 px-12 pb-16">
          <h2 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight text-white/95">
            Comece grátis em <span className="text-accent">2 minutos</span>.
          </h2>
          <p className="mt-4 max-w-md text-sm text-white/60">
            Ative sua clínica e leve toda a operação para um só lugar — agenda,
            prontuário, odontograma e financeiro.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            {[
              "14 dias grátis, sem cartão",
              "Multi-tenant com LGPD e trava CFO",
              "Cancele quando quiser",
            ].map((b) => (
              <li key={b} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 border-t border-white/10 px-12 py-7 text-[11px] uppercase tracking-[0.18em] text-white/45">
          Dental.CRM · Modern Premium
        </div>
      </aside>

      {/* ─── Right form ──────────────────────────────────────── */}
      <section className="flex items-center justify-center bg-background px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark size="md" withWordmark />
          </div>

          {/* Stepper */}
          <ol className="mb-8 flex items-center gap-2" data-testid="signup-stepper">
            {STEPS.map((label, i) => (
              <li key={label} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    i < step && "bg-accent text-accent-foreground",
                    i === step && "bg-accent/15 text-accent ring-2 ring-accent",
                    i > step && "bg-secondary text-muted-foreground",
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <span
                    className={cn(
                      "h-px flex-1",
                      i < step ? "bg-accent" : "bg-border",
                    )}
                  />
                )}
              </li>
            ))}
          </ol>

          <h1 className="text-2xl font-semibold tracking-tight">
            {STEPS[step]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Passo {step + 1} de {STEPS.length}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
            {step === 0 && (
              <>
                <Field
                  id="legal_name"
                  label="Razão social"
                  value={legalName}
                  onChange={setLegalName}
                  placeholder="Clínica Sorriso LTDA"
                  error={errors.legalName}
                  icon={<Building2 className="h-4 w-4" />}
                />
                <Field
                  id="trade_name"
                  label="Nome fantasia"
                  value={tradeName}
                  onChange={setTradeName}
                  placeholder="Sorriso Odontologia"
                  error={errors.tradeName}
                />
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    inputMode="numeric"
                    placeholder="00.000.000/0001-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(maskCnpj(e.target.value))}
                    data-testid="signup-cnpj"
                  />
                  {errors.cnpj && <FieldError>{errors.cnpj}</FieldError>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso horário</Label>
                  <SelectNative
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    data-testid="signup-timezone"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </SelectNative>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <Field
                  id="full_name"
                  label="Nome completo"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Dra. Ana Souza"
                  error={errors.fullName}
                  icon={<UserRound className="h-4 w-4" />}
                />
                <Field
                  id="email"
                  type="email"
                  label="E-mail"
                  value={email}
                  onChange={setEmail}
                  placeholder="voce@clinica.com.br"
                  error={errors.email}
                />
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="signup-password"
                  />
                  <p
                    className={cn(
                      "text-xs",
                      password.length === 0
                        ? "text-muted-foreground"
                        : passwordValid
                          ? "text-success"
                          : "text-amber-600",
                    )}
                  >
                    Mínimo 8 caracteres, com pelo menos uma letra e um número.
                  </p>
                  {errors.password && <FieldError>{errors.password}</FieldError>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar senha</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    data-testid="signup-confirm"
                  />
                  {errors.confirm && <FieldError>{errors.confirm}</FieldError>}
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-3" data-testid="signup-plans">
                {PLANS.map((p) => {
                  const selected = plan === p.tier;
                  return (
                    <button
                      type="button"
                      key={p.tier}
                      onClick={() => setPlan(p.tier)}
                      data-testid={`signup-plan-${p.tier}`}
                      className={cn(
                        "relative w-full rounded-2xl border p-4 text-left transition-all",
                        selected
                          ? "border-accent bg-accent/5 shadow-glow"
                          : "border-border bg-card hover:border-accent/40",
                      )}
                    >
                      {p.highlight && (
                        <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                          <Sparkles className="h-3 w-3" /> Mais escolhido
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {p.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.tagline}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold tracking-tight text-foreground">
                            {p.priceLabel}
                          </p>
                          <p className="text-[11px] text-muted-foreground">/mês</p>
                        </div>
                      </div>
                      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                        {p.features.map((f) => (
                          <li
                            key={f}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                          >
                            <Check className="h-3 w-3 text-accent" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <span
                        className={cn(
                          "absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border",
                          selected
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-border",
                          p.highlight && "hidden",
                        )}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {serverError && (
              <Alert variant="destructive" data-testid="signup-error">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={back}
                  disabled={submitting}
                  data-testid="signup-back"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  variant="accent"
                  className="flex-1"
                  onClick={next}
                  data-testid="signup-next"
                >
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="accent"
                  className="flex-1"
                  disabled={submitting}
                  data-testid="signup-submit"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Criando…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Começar trial grátis de
                      14 dias
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  icon,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(icon && "pl-9")}
          data-testid={`signup-${id}`}
        />
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium text-destructive">{children}</p>;
}
