import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  HeartPulse, AlertTriangle, Activity, Stethoscope, 
  Save, Loader2, CheckCircle2, Plus
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/api";
import { api } from "@/lib/api";

// ─── Tipagem do Template ───
interface AnamnesisData {
  alergias: string[];
  alergias_outros: string;
  doencas_preexistentes: string[];
  doencas_outros: string;
  cirurgias_anteriores: string;
  medicamentos_uso: string;
  gestante: boolean;
  fumante: boolean;
  historico_familiar: string;
  observacoes: string;
}

interface AnamnesisRecord {
  id: string;
  questionnaire: AnamnesisData;
  notes: string | null;
  created_at: string;
}

export function AnamnesisTab({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<AnamnesisData>({
    alergias: [],
    alergias_outros: "",
    doencas_preexistentes: [],
    doencas_outros: "",
    cirurgias_anteriores: "",
    medicamentos_uso: "",
    gestante: false,
    fumante: false,
    historico_familiar: "",
    observacoes: "",
  });

  // Buscar última anamnese
  const { data, isLoading } = useQuery({
    queryKey: ["anamnesis", patientId],
    queryFn: async () => {
      const res = await api.get<AnamnesisRecord>(`/api/patients/${patientId}/anamnesis`);
      return res.data;
    },
    retry: false,
  });

  // Preencher formulário com dados existentes
  useEffect(() => {
    if (data?.questionnaire) {
      setFormData({
        alergias: data.questionnaire.alergias || [],
        alergias_outros: data.questionnaire.alergias_outros || "",
        doencas_preexistentes: data.questionnaire.doencas_preexistentes || [],
        doencas_outros: data.questionnaire.doencas_outros || "",
        cirurgias_anteriores: data.questionnaire.cirurgias_anteriores || "",
        medicamentos_uso: data.questionnaire.medicamentos_uso || "",
        gestante: data.questionnaire.gestante || false,
        fumante: data.questionnaire.fumante || false,
        historico_familiar: data.questionnaire.historico_familiar || "",
        observacoes: data.questionnaire.observacoes || "",
      });
    }
  }, [data]);

  // Salvar anamnese
  const mutation = useMutation({
    mutationFn: async (payload: AnamnesisData) => {
      await api.post(`/api/patients/${patientId}/anamnesis`, {
        questionnaire: payload,
        notes: payload.observacoes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamnesis", patientId] });
      toast({ title: "Anamnese salva com sucesso!", variant: "success" });
    },
    onError: (err) => {
      toast({ title: getErrorMessage(err), variant: "destructive" });
    }
  });

  const toggleArrayItem = (field: "alergias" | "doencas_preexistentes", item: string) => {
    setFormData((prev) => {
      const list = prev[field];
      if (list.includes(item)) {
        return { ...prev, [field]: list.filter((i) => i !== item) };
      }
      return { ...prev, [field]: [...list, item] };
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Carregando anamnese...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header do Formulário */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Anamnese Digital</h2>
            <p className="text-xs text-slate-500">
              {data ? `Última atualização: ${format(new Date(data.created_at), "dd/MM/yyyy 'às' HH:mm")}` : "Nenhuma anamnese registrada ainda."}
            </p>
          </div>
        </div>
        <Button 
          onClick={() => mutation.mutate(formData)} 
          disabled={mutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Anamnese
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ALERGIAS */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> Alergias
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {["Dipirona", "Penicilina", "Anestésicos", "Látex", "AAS", "Outros"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleArrayItem("alergias", item)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    formData.alergias.includes(item)
                      ? "bg-rose-100 text-rose-700 border-rose-300 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-rose-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            {formData.alergias.includes("Outros") && (
              <div className="animate-in slide-in-from-top-2">
                <Label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Especifique as outras alergias</Label>
                <Input 
                  placeholder="Ex: Frutos do mar, poeira..." 
                  value={formData.alergias_outros}
                  onChange={(e) => setFormData({ ...formData, alergias_outros: e.target.value })}
                  className="h-9 text-sm bg-slate-50"
                />
              </div>
            )}
            <p className="text-[11px] text-slate-400">Selecione todas as alergias conhecidas do paciente.</p>
          </CardContent>
        </Card>

        {/* DOENÇAS PREEXISTENTES */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" /> Doenças Preexistentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {["Diabetes", "Hipertensão", "Cardíaca", "Coagulação", "Renal", "Hepática", "Respiratória", "Epilepsia", "Outros"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleArrayItem("doencas_preexistentes", item)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    formData.doencas_preexistentes.includes(item)
                      ? "bg-indigo-100 text-indigo-700 border-indigo-300 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            {formData.doencas_preexistentes.includes("Outros") && (
              <div className="animate-in slide-in-from-top-2">
                <Label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Especifique as outras doenças</Label>
                <Input 
                  placeholder="Ex: Tireoide, depressão..." 
                  value={formData.doencas_outros}
                  onChange={(e) => setFormData({ ...formData, doencas_outros: e.target.value })}
                  className="h-9 text-sm bg-slate-50"
                />
              </div>
            )}
            <p className="text-[11px] text-slate-400">Selecione todas as condições sistêmicas relatadas.</p>
          </CardContent>
        </Card>

        {/* HISTÓRICO E HÁBITOS */}
        <Card className="border-slate-200 shadow-sm md:col-span-2">
          <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-500" /> Histórico e Hábitos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-slate-500 font-bold">Medicamentos em Uso</Label>
              <Textarea 
                placeholder="Ex: Losartana 50mg, Dipirona se dor..." 
                value={formData.medicamentos_uso}
                onChange={(e) => setFormData({ ...formData, medicamentos_uso: e.target.value })}
                className="min-h-[80px] text-sm bg-slate-50 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-slate-500 font-bold">Histórico de Cirurgias</Label>
              <Textarea 
                placeholder="Ex: Apendicite em 2015, retirada de siso..." 
                value={formData.cirurgias_anteriores}
                onChange={(e) => setFormData({ ...formData, cirurgias_anteriores: e.target.value })}
                className="min-h-[80px] text-sm bg-slate-50 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-slate-500 font-bold">Histórico Familiar</Label>
              <Textarea 
                placeholder="Ex: Pai com diabetes, mãe com hipertensão..." 
                value={formData.historico_familiar}
                onChange={(e) => setFormData({ ...formData, historico_familiar: e.target.value })}
                className="min-h-[80px] text-sm bg-slate-50 resize-none"
              />
            </div>

            <div className="space-y-3 flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.gestante}
                  onChange={(e) => setFormData({ ...formData, gestante: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                />
                <span className="text-sm font-medium text-slate-700">Paciente Gestante</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.fumante}
                  onChange={(e) => setFormData({ ...formData, fumante: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                />
                <span className="text-sm font-medium text-slate-700">Paciente Fumante</span>
              </label>
            </div>

          </CardContent>
        </Card>

        {/* OBSERVAÇÕES */}
        <Card className="border-slate-200 shadow-sm md:col-span-2">
          <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900">Observações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Textarea 
              placeholder="Informações adicionais relevantes para o tratamento..." 
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="min-h-[100px] text-sm bg-slate-50"
            />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
