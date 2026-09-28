import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Loader2,
  Plus,
  Scale,
  Trash2,
  Wallet,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { cashService } from "@/services/cash.service";
import type {
  CashMovement,
  CashMovementType,
  CashPaymentMethod,
} from "@/types/api";

const PAYMENT_LABELS: Record<CashPaymentMethod, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  card_credit: "Cartão crédito",
  card_debit: "Cartão débito",
  transfer: "Transferência",
  other: "Outro",
};

const PAYMENT_OPTIONS: CashPaymentMethod[] = [
  "cash",
  "pix",
  "card_credit",
  "card_debit",
  "transfer",
  "other",
];

const INCOME_CATEGORIES = ["Consulta", "Procedimento", "Orçamento", "Outros"];
const EXPENSE_CATEGORIES = [
  "Material",
  "Laboratório",
  "Salário",
  "Aluguel",
  "Comissão",
  "Impostos",
  "Outros",
];

function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

function formatBRL(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FinanceCashPage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<string>(todayISO());
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CashMovement | null>(null);

  const dayQuery = useQuery({
    queryKey: ["cash", date],
    queryFn: () => cashService.day(date),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["cash", date] });

  const removeMutation = useMutation({
    mutationFn: (id: string) => cashService.remove(id),
    onSuccess: () => {
      toast({ variant: "success", title: "Movimento excluído" });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: "Não foi possível excluir",
        description: getErrorMessage(err, "Tente novamente."),
      }),
  });

  const summary = dayQuery.data?.summary;
  const movements = dayQuery.data?.movements ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="finance-cash-page">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Financeiro
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Wallet className="h-6 w-6 text-accent" /> Caixa diário
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entradas e saídas do dia. Selecione a data para consultar.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="cash-date" className="text-xs">
              Data
            </Label>
            <Input
              id="cash-date"
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
              data-testid="cash-date-input"
            />
          </div>
          <Button
            variant="accent"
            onClick={() => setCreateOpen(true)}
            data-testid="cash-new-button"
          >
            <Plus className="h-4 w-4" /> Novo movimento
          </Button>
        </div>
      </header>

      {/* ── 3 cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Entradas"
          value={summary?.total_income}
          isLoading={dayQuery.isLoading}
          tone="success"
          Icon={ArrowUpCircle}
          testid="cash-card-income"
        />
        <SummaryCard
          label="Saídas"
          value={summary?.total_expense}
          isLoading={dayQuery.isLoading}
          tone="destructive"
          Icon={ArrowDownCircle}
          testid="cash-card-expense"
        />
        <SummaryCard
          label="Saldo do dia"
          value={summary?.balance}
          isLoading={dayQuery.isLoading}
          tone="accent"
          Icon={Scale}
          testid="cash-card-balance"
        />
      </div>

      {/* ── Tabela ─────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        {dayQuery.isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <Banknote className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Nenhum movimento registrado nesta data.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id} data-testid={`cash-row-${m.id}`}>
                  <TableCell>
                    {m.type === "income" ? (
                      <Badge variant="success" className="gap-1">
                        <ArrowUpCircle className="h-3 w-3" /> Entrada
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <ArrowDownCircle className="h-3 w-3" /> Saída
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {m.category}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.description}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {PAYMENT_LABELS[m.payment_method]}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      m.type === "income" ? "text-success" : "text-destructive",
                    )}
                  >
                    {m.type === "income" ? "+" : "−"}
                    {formatBRL(m.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTarget(m)}
                      data-testid={`cash-delete-${m.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <NewMovementSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={invalidate}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Excluir movimento
            </DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Confirma a exclusão de "${deleteTarget.description}" (${formatBRL(
                    deleteTarget.amount,
                  )})?`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => deleteTarget && removeMutation.mutate(deleteTarget.id)}
              data-testid="cash-delete-confirm"
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Excluindo…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  isLoading,
  tone,
  Icon,
  testid,
}: {
  label: string;
  value?: string;
  isLoading: boolean;
  tone: "success" | "destructive" | "accent";
  Icon: typeof Wallet;
  testid: string;
}) {
  const toneClasses = {
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    accent: "bg-accent/10 text-accent",
  }[tone];

  return (
    <Card data-testid={testid}>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            toneClasses,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {isLoading ? (
            <Skeleton className="mt-1 h-6 w-24" />
          ) : (
            <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
              {formatBRL(value ?? "0")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NewMovementSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<CashMovementType>("income");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<CashPaymentMethod>("pix");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setType("income");
    setCategory("");
    setDescription("");
    setAmount("");
    setPaymentMethod("pix");
    setError(null);
  }

  const mutation = useMutation({
    mutationFn: () =>
      cashService.create({
        type,
        category: category.trim(),
        description: description.trim(),
        amount: Number(amount).toFixed(2),
        payment_method: paymentMethod,
      }),
    onSuccess: () => {
      toast({ variant: "success", title: "Movimento registrado" });
      onSaved();
      onOpenChange(false);
      reset();
    },
    onError: (err) =>
      setError(getErrorMessage(err, "Não foi possível registrar o movimento.")),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (category.trim().length < 1) return setError("Informe a categoria.");
    if (description.trim().length < 1) return setError("Informe a descrição.");
    const val = Number(amount);
    if (Number.isNaN(val) || val <= 0)
      return setError("Informe um valor maior que zero.");
    mutation.mutate();
  }

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Wallet className="h-5 w-5" />
            </div>
            <SheetTitle>Novo movimento</SheetTitle>
          </div>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto px-6 py-5"
          data-testid="cash-form"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("income")}
                  data-testid="cash-type-income"
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    type === "income"
                      ? "border-success bg-success/10 text-success"
                      : "border-border text-muted-foreground hover:bg-secondary/60",
                  )}
                >
                  <ArrowUpCircle className="h-4 w-4" /> Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setType("expense")}
                  data-testid="cash-type-expense"
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    type === "expense"
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border text-muted-foreground hover:bg-secondary/60",
                  )}
                >
                  <ArrowDownCircle className="h-4 w-4" /> Saída
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash-category">Categoria</Label>
              <Input
                id="cash-category"
                list="cash-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Consulta"
                data-testid="cash-category"
              />
              <datalist id="cash-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash-description">Descrição</Label>
              <Input
                id="cash-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Restauração paciente Maria"
                maxLength={200}
                data-testid="cash-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cash-amount">Valor (R$)</Label>
                <Input
                  id="cash-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  data-testid="cash-amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cash-payment">Forma de pagamento</Label>
                <SelectNative
                  id="cash-payment"
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as CashPaymentMethod)
                  }
                  data-testid="cash-payment"
                >
                  {PAYMENT_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {PAYMENT_LABELS[p]}
                    </option>
                  ))}
                </SelectNative>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </form>

        <SheetFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={mutation.isPending}
            onClick={() => {
              const form = document.querySelector(
                "[data-testid='cash-form']",
              ) as HTMLFormElement | null;
              form?.requestSubmit();
            }}
            data-testid="cash-submit"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
              </>
            ) : (
              "Registrar"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
