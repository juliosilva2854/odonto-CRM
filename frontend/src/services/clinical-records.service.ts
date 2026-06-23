import { api } from "@/lib/api";
import type { ClinicalRecord, PaginatedResponse } from "@/types/api";

export const clinicalRecordsService = {
  list: async (
    patientId: string,
    params: { page?: number; page_size?: number } = {},
  ): Promise<PaginatedResponse<ClinicalRecord>> => {
    const { data } = await api.get<PaginatedResponse<ClinicalRecord>>(
      `/api/clinical/patients/${patientId}/records`,
      { params },
    );
    return data;
  },
};
