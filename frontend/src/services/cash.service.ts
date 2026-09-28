import { api } from "@/lib/api";
import type {
  CashDay,
  CashMovement,
  CashMovementPayload,
  CashMovementUpdatePayload,
  CashSummary,
} from "@/types/api";

export const cashService = {
  day: async (date?: string): Promise<CashDay> => {
    const { data } = await api.get<CashDay>("/api/finance/cash", {
      params: date ? { date } : {},
    });
    return data;
  },

  summary: async (start: string, end: string): Promise<CashSummary> => {
    const { data } = await api.get<CashSummary>("/api/finance/cash/summary", {
      params: { start, end },
    });
    return data;
  },

  create: async (payload: CashMovementPayload): Promise<CashMovement> => {
    const { data } = await api.post<CashMovement>("/api/finance/cash", payload);
    return data;
  },

  update: async (
    id: string,
    payload: CashMovementUpdatePayload,
  ): Promise<CashMovement> => {
    const { data } = await api.put<CashMovement>(
      `/api/finance/cash/${id}`,
      payload,
    );
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/api/finance/cash/${id}`);
  },
};
