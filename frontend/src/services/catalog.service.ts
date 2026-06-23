import { api } from "@/lib/api";
import type { PaginatedResponse, Procedure } from "@/types/api";

export const catalogService = {
  listProcedures: async (params: {
    page?: number;
    page_size?: number;
    search?: string;
  } = {}): Promise<PaginatedResponse<Procedure>> => {
    const { data } = await api.get<PaginatedResponse<Procedure>>(
      "/api/procedures",
      { params: { page: 1, page_size: 100, ...params } },
    );
    return data;
  },
};
