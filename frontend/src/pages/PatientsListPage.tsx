import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, User, Phone, Calendar, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { initialsOf } from "@/lib/utils";

interface Patient {
  id: string;
  full_name: string;
  cpf: string | null;
  phone_e164: string;
  birth_date: string | null;
}

export default function PatientsListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // Busca a lista de pacientes da API
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const res = await api.get<{ items: Patient[] }>("/api/patients?page=1&page_size=50");
      return res.data;
    },
  });

  const patients = data?.items || [];
  const filteredPatients = patients.filter((p) =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.cpf && p.cpf.includes(searchTerm))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pacientes</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie os pacientes da sua clínica.</p>
        </div>
        <Button 
          onClick={() => {/* Abre modal de novo paciente se tiver */}}
          className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Paciente
        </Button>
      </div>

      {/* Barra de Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input 
          placeholder="Buscar por nome ou CPF..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-white border-slate-200 h-10"
        />
      </div>

      {/* Lista de Pacientes */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-rose-500 font-medium">Erro ao carregar a lista de pacientes. Verifique sua conexão.</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum paciente encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <Card 
              key={patient.id} 
              className="hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group bg-white border-slate-200"
              onClick={() => navigate(`/patients/${patient.id}`)}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                  {initialsOf(patient.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {patient.full_name}
                  </p>
                  <div className="flex flex-col gap-1 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {patient.phone_e164}</span>
                    {patient.birth_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> 
                        {format(parseISO(patient.birth_date), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
