import { api } from "@/lib/api";
import type { AnamnesisCreatePayload, AnamnesisRecord } from "@/types/api";

export const anamnesisService = {
  latest: async (patientId: string): Promise<AnamnesisRecord | null> => {
    try {
      const { data } = await api.get<AnamnesisRecord>(
        `/api/patients/${patientId}/anamnesis`,
      );
      return data;
    } catch (err: unknown) {
      // 404 => paciente ainda não respondeu
      const anyErr = err as { response?: { status?: number } };
      if (anyErr?.response?.status === 404) return null;
      throw err;
    }
  },

  history: async (patientId: string): Promise<AnamnesisRecord[]> => {
    const { data } = await api.get<AnamnesisRecord[]>(
      `/api/patients/${patientId}/anamnesis/history`,
    );
    return data;
  },

  create: async (
    patientId: string,
    payload: AnamnesisCreatePayload,
  ): Promise<AnamnesisRecord> => {
    const { data } = await api.post<AnamnesisRecord>(
      `/api/patients/${patientId}/anamnesis`,
      payload,
    );
    return data;
  },
};
