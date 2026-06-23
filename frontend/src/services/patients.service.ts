import { api } from "@/lib/api";
import type {
  PaginatedResponse,
  Patient,
  PatientSummary,
} from "@/types/api";

export const patientsService = {
  list: async (params: {
    page?: number;
    page_size?: number;
    search?: string;
  } = {}): Promise<PaginatedResponse<PatientSummary>> => {
    const { data } = await api.get<PaginatedResponse<PatientSummary>>(
      "/api/patients",
      { params },
    );
    return data;
  },

  get: async (id: string): Promise<Patient> => {
    const { data } = await api.get<Patient>(`/api/patients/${id}`);
    return data;
  },
};
