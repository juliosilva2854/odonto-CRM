import { api } from "@/lib/api";
import type {
  PaginatedResponse,
  Patient,
  PatientCreatePayload,
  PatientSummary,
} from "@/types/api";

export const patientsService = {
  create: async (payload: PatientCreatePayload): Promise<Patient> => {
    const { data } = await api.post<Patient>("/api/patients", payload);
    return data;
  },

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
