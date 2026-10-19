import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  LogIn,
  MoreHorizontal,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
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
import { adminService } from "@/services/admin.service";
import {
  STATUS_OPTIONS,
  SubStatusBadge,
  useImpersonate,
} from "@/pages/admin/shared";
import type { SubscriptionStatus } from "@/types/api";

const PAGE_SIZE = 20;

export default function AdminClinicsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const impersonate = useImpersonate();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | SubscriptionStatus>("");
  const [page, setPage] = useState(1);

  const clinicsQuery = useQuery({
    queryKey: ["admin", "clinics", { search, status, page }],
    queryFn: () =>
      adminService.listClinics({
        search: search || undefined,
        subscription_status: status || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin", "clinics"] });

  const onError = (err: unknown) =>
    toast({
      variant: "destructive",
      title: "Ação não concluída",
      description: getErrorMessage(err, "Tente novamente."),
    });

  const extend = useMutation({
    mutationFn: (id: string) => adminService.extendTrial(id, 7),
    onSuccess: () => {
      toast({ variant: "success", title: "Trial estendido por 7 dias" });
      invalidate();
    },
    onError,
  });
  const suspend = useMutation({
    mutationFn: (id: string) => adminService.suspend(id),
    onSuccess: () => {
      toast({ variant: "success", title: "Clínica suspensa" });
      invalidate();
    },
    onError,
  });
  const reactivate = useMutation({
    mutationFn: (id: string) => adminService.reactivate(id),
    onSuccess: () => {
      toast({ variant: "success", title: "Clínica reativada" });
      invalidate();
    },
    onError,
  });

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const data = clinicsQuery.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6" data-testid="admin-clinics">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Plataforma
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Clínicas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.total} clínica(s) cadastrada(s).` : "Carregando…"}
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={applySearch} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome ou CNPJ…"
            className="pl-9"
            data-testid="clinics-search"
          />
        </form>
        <SelectNative
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as "" | SubscriptionStatus);
          }}
          className="sm:w-56"
          data-testid="clinics-status-filter"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectNative>
      </div>

      <Card className="overflow-hidden">
        {clinicsQuery.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma clínica encontrada.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clínica</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Usuários</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((c) => (
                <TableRow key={c.id} data-testid={`clinic-row-${c.id}`}>
                  <TableCell className="font-medium text-foreground">
                    <Link to={`/admin/clinics/${c.id}`} className="hover:text-accent">
                      {c.trade_name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{c.legal_name}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.cnpj}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{c.plan}</TableCell>
                  <TableCell>
                    <SubStatusBadge status={c.subscription_status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {c.users_count}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          data-testid={`clinic-actions-${c.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => navigate(`/admin/clinics/${c.id}`)}
                        >
                          <Eye className="h-4 w-4" /> Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => impersonate(c.id)}>
                          <LogIn className="h-4 w-4" /> Impersonar
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => extend.mutate(c.id)}>
                          <Clock className="h-4 w-4" /> Estender trial (+7d)
                        </DropdownMenuItem>
                        {c.subscription_status === "canceled" ? (
                          <DropdownMenuItem onSelect={() => reactivate.mutate(c.id)}>
                            <CheckCircle2 className="h-4 w-4" /> Reativar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => suspend.mutate(c.id)}
                          >
                            <Ban className="h-4 w-4" /> Suspender
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              data-testid="clinics-prev"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              data-testid="clinics-next"
            >
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="text-right">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent"
        >
          Ir para visão geral <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
