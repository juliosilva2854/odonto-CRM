import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isThisMonth } from "date-fns";
import { 
  Search, UserPlus, MoreHorizontal, ChevronRight, 
  Users, Filter, CalendarDays, FileText, UserCheck, 
  UserX, Plus, Mail, Phone
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialsOf } from "@/lib/utils";
import { patientsService } from "@/services/patients.service";

export default function PatientsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["patients", { search }],
    queryFn: () =>
      patientsService.list({
        page: 1,
        page_size: 50,
        search: search.trim() || undefined,
      }),
  });

  const patients = data?.items ?? [];
  const total = data?.total ?? 0;

  // Cálculos para os KPIs (baseados na página atual)
  const activeCount = patients.filter(p => !p.anonymized_at).length;
  const inactiveCount = patients.filter(p => p.anonymized_at).length;
  const newThisMonthCount = patients.filter(p => isThisMonth(parseISO(p.created_at))).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-500" data-testid="patients-list-page">
      
      {/* ─── Header ─── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Clínica</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Pacientes</h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Gerencie o cadastro e histórico dos seus pacientes.
          </p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 h-10">
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Paciente
        </Button>
      </header>

      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ativos</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Anonimizados</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{inactiveCount}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <UserX className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Novos (Mês)</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{newThisMonthCount}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                <Plus className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Barra de Busca e Filtros ─── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Buscar por nome, CPF, telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg shadow-sm"
          />
        </div>
        <Button variant="outline" className="h-10 border-slate-200 text-slate-700 bg-white">
          <Filter className="h-4 w-4 mr-2 text-slate-400" /> Filtros
        </Button>
      </div>

      {/* ─── Tabela de Pacientes ─── */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError || !data ? (
            <div className="p-12 text-center">
              <p className="text-sm text-slate-500">Não foi possível carregar a lista de pacientes.</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Nenhum paciente encontrado</h3>
              <p className="text-sm text-slate-500 max-w-sm mb-6">
                {search ? `Não encontramos resultados para "${search}".` : "Sua clínica ainda não tem pacientes cadastrados."}
              </p>
              {!search && (
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <UserPlus className="h-4 w-4 mr-2" /> Cadastrar primeiro paciente
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-6">Paciente</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">Contato</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 hidden lg:table-cell">CPF</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Cadastro</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                    <TableHead className="text-right pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p) => (
                    <TableRow 
                      key={p.id} 
                      className="cursor-pointer hover:bg-slate-50/50 transition-colors border-slate-100 group"
                      onClick={() => navigate(`/patients/${p.id}`)}
                    >
                      {/* Paciente (Avatar + Nome + Email no Mobile) */}
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shadow-sm">
                            {initialsOf(p.full_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{p.full_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-slate-500 truncate md:hidden">{p.phone_e164}</p>
                              <p className="text-xs text-slate-500 truncate hidden md:block">{p.email || "Sem e-mail"}</p>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contato (Telefone + Email) - Escondido no Mobile */}
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-slate-700 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" /> {p.phone_e164}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1.5 truncate max-w-[200px]">
                            <Mail className="w-3 h-3 text-slate-400" /> {p.email || "—"}
                          </span>
                        </div>
                      </TableCell>

                      {/* CPF - Escondido em telas menores */}
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm font-medium text-slate-700">{p.cpf || "—"}</span>
                      </TableCell>

                      {/* Data de Cadastro */}
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-slate-700">
                          {format(new Date(p.created_at), "dd/MM/yyyy")}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {p.anonymized_at ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 text-[10px] uppercase">Anonimizado</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] uppercase">Ativo</Badge>
                        )}
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => navigate(`/patients/${p.id}`)}>
                                <FileText className="h-4 w-4 mr-2 text-slate-400" /> Abrir Prontuário
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <CalendarDays className="h-4 w-4 mr-2 text-slate-400" /> Agendar Consulta
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
