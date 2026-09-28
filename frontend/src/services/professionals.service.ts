import { api } from "@/lib/api";
import type { Professional, ProfessionalUpdatePayload } from "@/types/api";

export const professionalsService = {
  list: async (): Promise<Professional[]> => {
    const { data } = await api.get<Professional[]>("/api/professionals");
    return data;
  },

  update: async (
    id: string,
    payload: ProfessionalUpdatePayload,
  ): Promise<Professional> => {
    const { data } = await api.put<Professional>(
      `/api/professionals/${id}`,
      payload,
    );
    return data;
  },
};
