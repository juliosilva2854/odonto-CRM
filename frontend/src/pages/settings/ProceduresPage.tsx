import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListTree, Loader2, Pencil, Plus, Search } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/api";
import { catalogService } from "@/services/catalog.service";
import type {
  Procedure,
  ProcedureCategory,
  ProcedureCreatePayload,
} from "@/types/api";

const CATEGORIES: { value: ProcedureCategory; label: string }[] = [
  { value: "clinical_general", label: "Clínica geral" },
  { value: "orthodontics", label: "Ortodontia" },
  { value: "endodontics", label: "Endodontia" },
  { value: "surgery", label: "Cirurgia" },
  { value: "prosthesis", label: "Prótese" },
  { value: "aesthetic", label: "Estética" },
  { value: "prevention", label: "Prevenção" },
  { value: "other", label: "Outro" },
];

const catLabel = (c: ProcedureCategory) =>
  CATEGORIES.find((x) => x.value === c)?.label ?? c;

const brl = (v: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v),
  );

export default function ProceduresPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProcedureCategory | "">("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Procedure | null>(null);

  const proceduresQuery = useQuery({
    queryKey: ["procedures", { search, category }],
    queryFn: () =>
      catalogService.listProcedures({
        page: 1,
        page_size: 100,
        search: search.trim() || undefined,
        category: category || undefined,
        include_inactive: true,
      }),
  });

  const specialtiesQuery = useQuery({
    queryKey: ["specialties"],
    queryFn: () => catalogService.listSpecialties(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["procedures"] });

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(p: Procedure) {
    setEditing(p);
    setOpen(true);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="procedures-page">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Configurações
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Catálogo de Procedimentos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre os procedimentos, preços e durações da clínica.
          </p>
        </div>
        <Button variant="accent" onClick={openNew} data-testid="new-procedure-button">
          <Plus className="h-4 w-4" /> Novo procedimento
        </Button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nome ou código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="procedures-search"
          />
        </div>
        <div className="w-full sm:w-56">
          <SelectNative
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as ProcedureCategory | "")
            }
            data-testid="procedures-category-filter"
          >
            <option value="">Todas as categorias</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </SelectNative>
        </div>
      </div>

      <Card className="overflow-hidden">
        {proceduresQuery.isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !proceduresQuery.data || proceduresQuery.data.items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum procedimento encontrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>TUSS</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Duração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proceduresQuery.data.items.map((p) => (
                <TableRow key={p.id} data-testid={`procedure-row-${p.id}`}>
                  <TableCell className="font-medium text-foreground">
                    {p.code}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.tuss_code || "—"}
                  </TableCell>
                  <TableCell className="text-foreground">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{catLabel(p.category)}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {brl(p.base_price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {p.default_duration_min} min
                  </TableCell>
                  <TableCell>
                    {p.is_active ? (
                      <Badge variant="success">Ativo</Badge>
                    ) : (
                      <Badge variant="default">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(p)}
                      data-testid={`edit-procedure-${p.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ProcedureSheet
        open={open}
        onOpenChange={setOpen}
        procedure={editing}
        specialties={specialtiesQuery.data ?? []}
        onSaved={invalidate}
      />
    </div>
  );
}

function ProcedureSheet({
  open,
  onOpenChange,
  procedure,
  specialties,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  procedure: Procedure | null;
  specialties: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [code, setCode] = useState("");
  const [tuss, setTuss] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProcedureCategory>("clinical_general");
  const [specialtyId, setSpecialtyId] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [duration, setDuration] = useState("30");
  const [requiresTooth, setRequiresTooth] = useState(true);
  const [requiresFaces, setRequiresFaces] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode(procedure?.code ?? "");
      setTuss(procedure?.tuss_code ?? "");
      setName(procedure?.name ?? "");
      setDescription(procedure?.description ?? "");
      setCategory(procedure?.category ?? "clinical_general");
      setSpecialtyId(procedure?.specialty_id ?? "");
      setBasePrice(procedure?.base_price ?? "");
      setDuration(String(procedure?.default_duration_min ?? 30));
      setRequiresTooth(procedure?.requires_tooth ?? true);
      setRequiresFaces(procedure?.requires_faces ?? false);
      setIsActive(procedure?.is_active ?? true);
      setError(null);
    }
  }, [open, procedure]);

  const mutation = useMutation({
    mutationFn: (payload: ProcedureCreatePayload) =>
      procedure
        ? catalogService.updateProcedure(procedure.id, payload)
        : catalogService.createProcedure(payload),
    onSuccess: () => {
      toast({
        variant: "success",
        title: procedure ? "Procedimento atualizado" : "Procedimento criado",
      });
      onSaved();
      onOpenChange(false);
    },
    onError: (err) =>
      setError(getErrorMessage(err, "Não foi possível salvar o procedimento.")),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (code.trim().length < 1) return setError("Informe o código.");
    if (name.trim().length < 2) return setError("Informe o nome.");
    const price = Number(basePrice.replace(",", "."));
    if (Number.isNaN(price) || price < 0)
      return setError("Informe um preço base válido.");

    mutation.mutate({
      code: code.trim(),
      tuss_code: tuss.trim() || null,
      name: name.trim(),
      description: description.trim() || null,
      category,
      specialty_id: specialtyId || null,
      base_price: price.toFixed(2),
      default_duration_min: Number(duration) || 30,
      requires_tooth: requiresTooth,
      requires_faces: requiresFaces,
      is_active: isActive,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <ListTree className="h-5 w-5" />
            </div>
            <SheetTitle>
              {procedure ? "Editar procedimento" : "Novo procedimento"}
            </SheetTitle>
          </div>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto px-6 py-5"
          data-testid="procedure-form"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pr-code">Código</Label>
                <Input
                  id="pr-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="REST-01"
                  data-testid="procedure-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr-tuss">TUSS</Label>
                <Input
                  id="pr-tuss"
                  value={tuss}
                  onChange={(e) => setTuss(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pr-name">Nome</Label>
              <Input
                id="pr-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Restauração em resina"
                data-testid="procedure-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pr-desc">Descrição</Label>
              <Textarea
                id="pr-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pr-cat">Categoria</Label>
                <SelectNative
                  id="pr-cat"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as ProcedureCategory)
                  }
                  data-testid="procedure-category"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr-spec">Especialidade</Label>
                <SelectNative
                  id="pr-spec"
                  value={specialtyId}
                  onChange={(e) => setSpecialtyId(e.target.value)}
                >
                  <option value="">— nenhuma —</option>
                  {specialties.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pr-price">Preço base (R$)</Label>
                <Input
                  id="pr-price"
                  inputMode="decimal"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="0,00"
                  data-testid="procedure-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr-dur">Duração (min)</Label>
                <Input
                  id="pr-dur"
                  type="number"
                  min={5}
                  max={480}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-4">
              <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={requiresTooth}
                  onChange={(e) => setRequiresTooth(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-accent focus:ring-ring"
                />
                Requer dente (FDI)
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={requiresFaces}
                  onChange={(e) => setRequiresFaces(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-accent focus:ring-ring"
                />
                Requer faces
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-accent focus:ring-ring"
                />
                Procedimento ativo
              </label>
            </div>

            {error && (
              <Alert variant="destructive">
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
                "[data-testid='procedure-form']",
              ) as HTMLFormElement | null;
              form?.requestSubmit();
            }}
            data-testid="procedure-submit"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
