import { api } from "@/lib/api";
import type {
  PaginatedResponse,
  Procedure,
  ProcedureCategory,
  ProcedureCreatePayload,
  ProcedureUpdatePayload,
  Specialty,
  SpecialtyCreatePayload,
} from "@/types/api";

export const catalogService = {
  listProcedures: async (params: {
    page?: number;
    page_size?: number;
    search?: string;
    category?: ProcedureCategory;
    include_inactive?: boolean;
  } = {}): Promise<PaginatedResponse<Procedure>> => {
    const { data } = await api.get<PaginatedResponse<Procedure>>(
      "/api/procedures",
      { params: { page: 1, page_size: 100, ...params } },
    );
    return data;
  },

  createProcedure: async (
    payload: ProcedureCreatePayload,
  ): Promise<Procedure> => {
    const { data } = await api.post<Procedure>("/api/procedures", payload);
    return data;
  },

  updateProcedure: async (
    id: string,
    payload: ProcedureUpdatePayload,
  ): Promise<Procedure> => {
    const { data } = await api.put<Procedure>(`/api/procedures/${id}`, payload);
    return data;
  },

  listSpecialties: async (): Promise<Specialty[]> => {
    const { data } = await api.get<Specialty[]>("/api/specialties");
    return data;
  },

  createSpecialty: async (
    payload: SpecialtyCreatePayload,
  ): Promise<Specialty> => {
    const { data } = await api.post<Specialty>("/api/specialties", payload);
    return data;
  },
};
