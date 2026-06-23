import { api } from "@/lib/api";
import type {
  AddProcedurePayload,
  OdontogramSnapshot,
  ToothProcedure,
  ToothProcedureStatus,
} from "@/types/api";

export const odontogramService = {
  snapshot: async (patientId: string): Promise<OdontogramSnapshot> => {
    const { data } = await api.get<OdontogramSnapshot>(
      `/api/clinical/patients/${patientId}/odontogram`,
    );
    return data;
  },

  addProcedure: async (
    patientId: string,
    payload: AddProcedurePayload,
  ): Promise<ToothProcedure> => {
    const { data } = await api.post<ToothProcedure>(
      `/api/clinical/patients/${patientId}/odontogram/procedures`,
      payload,
    );
    return data;
  },

  changeStatus: async (
    procedureId: string,
    new_status: ToothProcedureStatus,
    reason?: string,
  ): Promise<ToothProcedure> => {
    const { data } = await api.post<ToothProcedure>(
      `/api/clinical/odontogram/procedures/${procedureId}/status`,
      { new_status, reason },
    );
    return data;
  },
};
