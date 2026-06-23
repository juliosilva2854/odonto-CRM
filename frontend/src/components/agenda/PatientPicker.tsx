import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, initialsOf } from "@/lib/utils";
import { patientsService } from "@/services/patients.service";
import type { PatientSummary } from "@/types/api";

interface PatientPickerProps {
  value: string | null;
  onChange: (id: string, patient: PatientSummary) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Searchable patient picker — lazy-fetches a page of 100 patients on open,
 * then filters client-side. For larger volumes the input could push the
 * query to the API, but 100 is enough for >95% of boutique clinics.
 */
export function PatientPicker({
  value,
  onChange,
  disabled,
  placeholder = "Selecione um paciente…",
}: PatientPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["patients", { picker: true }],
    queryFn: () => patientsService.list({ page: 1, page_size: 100 }),
    enabled: open,
    staleTime: 60_000,
  });

  const patients = data?.items ?? [];

  const selected = useMemo(
    () => patients.find((p) => p.id === value) ?? null,
    [patients, value],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter(
      (p) =>
        p.full_name.toLowerCase().includes(term) ||
        (p.cpf ?? "").toLowerCase().includes(term) ||
        p.phone_e164.includes(term),
    );
  }, [patients, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          data-testid="patient-picker-trigger"
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? selected.full_name : placeholder}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="border-b border-border px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nome, CPF ou telefone…"
              className="h-9 pl-7 text-sm"
              data-testid="patient-picker-search"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Nenhum paciente encontrado.
            </p>
          ) : (
            <ul>
              {filtered.map((p) => {
                const active = value === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(p.id, p);
                        setOpen(false);
                      }}
                      data-testid={`patient-picker-item-${p.id}`}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm",
                        "transition-colors hover:bg-secondary",
                        active && "bg-secondary",
                      )}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-indigo-500 text-[10px] font-semibold text-white">
                        {initialsOf(p.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-foreground">{p.full_name}</p>
                        <p className="truncate text-[10.5px] text-muted-foreground">
                          {p.cpf ?? "—"} · {p.phone_e164}
                        </p>
                      </div>
                      {active && <Check className="h-4 w-4 text-accent" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
