import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NewPatientSheet } from "@/components/patients/NewPatientSheet";
import { cn, initialsOf } from "@/lib/utils";
import { patientsService } from "@/services/patients.service";

export default function PatientsListPage() {
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["patients", { search }],
    queryFn: () =>
      patientsService.list({
        page: 1,
        page_size: 50,
        search: search.trim() || undefined,
      }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6" data-testid="patients-list-page">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Pacientes
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Lista de pacientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione um paciente para abrir o prontuário e o odontograma.
          </p>
        </div>
        <Button
          variant="accent"
          onClick={() => setSheetOpen(true)}
          data-testid="new-patient-button"
        >
          <UserPlus className="h-4 w-4" />
          Novo paciente
        </Button>
      </header>

      <NewPatientSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nome, CPF, telefone ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="patients-search"
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <ul className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-5 w-16" />
              </li>
            ))}
          </ul>
        ) : isError || !data ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Não foi possível carregar a lista de pacientes.
          </div>
        ) : data.items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum paciente encontrado{search ? ` para “${search}”.` : "."}
          </div>
        ) : (
          <ul className="divide-y divide-border" data-testid="patients-list">
            {data.items.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/patients/${p.id}`}
                  className={cn(
                    "group flex items-center gap-4 p-4 transition-colors",
                    "hover:bg-secondary/60",
                  )}
                  data-testid={`patient-item-${p.id}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-indigo-500 text-xs font-semibold text-white shadow-xs">
                    {initialsOf(p.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{p.full_name}</p>
                      {p.is_minor && <Badge variant="warning">Menor</Badge>}
                      {p.anonymized_at && <Badge variant="destructive">Anonimizado</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {p.cpf ?? "—"} · {p.phone_e164}
                      {p.email ? ` · ${p.email}` : ""}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
