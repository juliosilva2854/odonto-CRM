import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/api";
import { isValidCpf, maskCep, maskCpf, maskPhoneBr, onlyDigits } from "@/lib/masks";
import { patientsService } from "@/services/patients.service";
import type { Gender, PatientCreatePayload } from "@/types/api";

interface NewPatientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GENDERS: { value: Gender; label: string }[] = [
  { value: "not_informed", label: "Não informado" },
  { value: "female", label: "Feminino" },
  { value: "male", label: "Masculino" },
  { value: "non_binary", label: "Não-binário" },
  { value: "other", label: "Outro" },
];

const EMPTY = {
  full_name: "",
  cpf: "",
  birth_date: "",
  gender: "not_informed" as Gender,
  phone: "",
  email: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  zipcode: "",
  is_minor: false,
  guardian_name: "",
  guardian_cpf: "",
  guardian_phone: "",
  notes: "",
};

export function NewPatientSheet({ open, onOpenChange }: NewPatientSheetProps) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({ ...EMPTY });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setF({ ...EMPTY });
      setError(null);
    }
  }, [open]);

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: (payload: PatientCreatePayload) => patientsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast({
        variant: "success",
        title: "Paciente cadastrado",
        description: "O novo paciente já aparece na lista.",
      });
      onOpenChange(false);
    },
    onError: (err) =>
      setError(getErrorMessage(err, "Verifique os dados e tente novamente.")),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (f.full_name.trim().length < 2) {
      setError("Informe o nome completo do paciente.");
      return;
    }
    if (onlyDigits(f.phone).length < 10) {
      setError("Informe um telefone válido com DDD.");
      return;
    }
    if (f.cpf && !isValidCpf(f.cpf)) {
      setError("CPF inválido.");
      return;
    }
    if (f.is_minor && f.guardian_name.trim().length < 2) {
      setError("Para menores, informe o nome do responsável.");
      return;
    }

    const payload: PatientCreatePayload = {
      full_name: f.full_name.trim(),
      cpf: f.cpf ? onlyDigits(f.cpf) : null,
      birth_date: f.birth_date ? new Date(f.birth_date).toISOString() : null,
      gender: f.gender,
      phone_e164: f.phone,
      email: f.email.trim() || null,
      address_street: f.street.trim() || null,
      address_number: f.number.trim() || null,
      address_neighborhood: f.neighborhood.trim() || null,
      address_city: f.city.trim() || null,
      address_state: f.state.trim() ? f.state.trim().toUpperCase() : null,
      address_zipcode: f.zipcode ? onlyDigits(f.zipcode) : null,
      is_minor: f.is_minor,
      guardian_name: f.is_minor ? f.guardian_name.trim() || null : null,
      guardian_cpf: f.is_minor && f.guardian_cpf ? onlyDigits(f.guardian_cpf) : null,
      guardian_phone_e164: f.is_minor && f.guardian_phone ? f.guardian_phone : null,
      notes: f.notes.trim() || null,
    };
    mutation.mutate(payload);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col p-0 sm:max-w-lg"
        data-testid="new-patient-sheet"
      >
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle>Novo paciente</SheetTitle>
              <SheetDescription>
                Cadastre os dados essenciais para abrir o prontuário.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto px-6 py-5"
          data-testid="new-patient-form"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="p-name">Nome completo</Label>
              <Input
                id="p-name"
                value={f.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="Maria da Silva"
                data-testid="patient-full-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="p-cpf">CPF</Label>
                <Input
                  id="p-cpf"
                  inputMode="numeric"
                  value={f.cpf}
                  onChange={(e) => set("cpf", maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  data-testid="patient-cpf"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-birth">Data de nascimento</Label>
                <Input
                  id="p-birth"
                  type="date"
                  value={f.birth_date}
                  onChange={(e) => set("birth_date", e.target.value)}
                  data-testid="patient-birth"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="p-gender">Gênero</Label>
                <SelectNative
                  id="p-gender"
                  value={f.gender}
                  onChange={(e) => set("gender", e.target.value as Gender)}
                >
                  {GENDERS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-phone">Telefone</Label>
                <Input
                  id="p-phone"
                  inputMode="tel"
                  value={f.phone}
                  onChange={(e) => set("phone", maskPhoneBr(e.target.value))}
                  placeholder="(11) 99999-9999"
                  data-testid="patient-phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-email">E-mail</Label>
              <Input
                id="p-email"
                type="email"
                value={f.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="maria@email.com"
                data-testid="patient-email"
              />
            </div>

            <Separator />

            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Endereço
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="p-street">Rua</Label>
                <Input
                  id="p-street"
                  value={f.street}
                  onChange={(e) => set("street", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-number">Número</Label>
                <Input
                  id="p-number"
                  value={f.number}
                  onChange={(e) => set("number", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="p-neigh">Bairro</Label>
                <Input
                  id="p-neigh"
                  value={f.neighborhood}
                  onChange={(e) => set("neighborhood", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-cep">CEP</Label>
                <Input
                  id="p-cep"
                  inputMode="numeric"
                  value={f.zipcode}
                  onChange={(e) => set("zipcode", maskCep(e.target.value))}
                  placeholder="00000-000"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="p-city">Cidade</Label>
                <Input
                  id="p-city"
                  value={f.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-state">UF</Label>
                <Input
                  id="p-state"
                  maxLength={2}
                  value={f.state}
                  onChange={(e) => set("state", e.target.value.toUpperCase())}
                  placeholder="SP"
                />
              </div>
            </div>

            <Separator />

            <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={f.is_minor}
                onChange={(e) => set("is_minor", e.target.checked)}
                className="h-4 w-4 rounded border-input text-accent focus:ring-ring"
                data-testid="patient-is-minor"
              />
              Paciente menor de idade
            </label>

            {f.is_minor && (
              <div className="space-y-4 rounded-xl border border-border bg-secondary/30 p-4">
                <div className="space-y-2">
                  <Label htmlFor="p-gname">Nome do responsável</Label>
                  <Input
                    id="p-gname"
                    value={f.guardian_name}
                    onChange={(e) => set("guardian_name", e.target.value)}
                    data-testid="patient-guardian-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="p-gcpf">CPF do responsável</Label>
                    <Input
                      id="p-gcpf"
                      inputMode="numeric"
                      value={f.guardian_cpf}
                      onChange={(e) => set("guardian_cpf", maskCpf(e.target.value))}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-gphone">Telefone do responsável</Label>
                    <Input
                      id="p-gphone"
                      inputMode="tel"
                      value={f.guardian_phone}
                      onChange={(e) => set("guardian_phone", maskPhoneBr(e.target.value))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="p-notes">Observações</Label>
              <Textarea
                id="p-notes"
                rows={3}
                value={f.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Anotações internas…"
              />
            </div>

            {error && (
              <Alert variant="destructive" data-testid="patient-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </form>

        <SheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={mutation.isPending}
            onClick={() => {
              const form = document.querySelector(
                "[data-testid='new-patient-form']",
              ) as HTMLFormElement | null;
              form?.requestSubmit();
            }}
            data-testid="patient-submit"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Cadastrar paciente
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
