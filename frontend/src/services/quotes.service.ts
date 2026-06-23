import { api } from "@/lib/api";
import type {
  PaginatedResponse,
  Quote,
  QuoteCancelPayload,
  QuoteCreatePayload,
  QuoteItem,
  QuoteRejectPayload,
  QuoteStatus,
} from "@/types/api";

export const quotesService = {
  list: async (params: {
    patient_id?: string;
    status?: QuoteStatus[];
    page?: number;
    page_size?: number;
  } = {}): Promise<PaginatedResponse<Quote>> => {
    // FastAPI expects repeated `?status=draft&status=sent` for list params.
    const { data } = await api.get<PaginatedResponse<Quote>>(
      "/api/finance/quotes",
      {
        params: {
          patient_id: params.patient_id,
          status: params.status,
          page: params.page ?? 1,
          page_size: params.page_size ?? 50,
        },
        paramsSerializer: { indexes: null },
      },
    );
    return data;
  },

  get: async (id: string): Promise<Quote> => {
    const { data } = await api.get<Quote>(`/api/finance/quotes/${id}`);
    return data;
  },

  create: async (payload: QuoteCreatePayload): Promise<Quote> => {
    const { data } = await api.post<Quote>("/api/finance/quotes", payload);
    return data;
  },

  approveItem: async (
    quoteId: string,
    itemId: string,
  ): Promise<QuoteItem> => {
    const { data } = await api.post<QuoteItem>(
      `/api/finance/quotes/${quoteId}/items/${itemId}/approve`,
    );
    return data;
  },

  rejectItem: async (
    quoteId: string,
    itemId: string,
    payload: QuoteRejectPayload = {},
  ): Promise<QuoteItem> => {
    const { data } = await api.post<QuoteItem>(
      `/api/finance/quotes/${quoteId}/items/${itemId}/reject`,
      payload,
    );
    return data;
  },

  approveQuote: async (quoteId: string): Promise<Quote> => {
    const { data } = await api.post<Quote>(
      `/api/finance/quotes/${quoteId}/approve`,
    );
    return data;
  },

  cancel: async (
    quoteId: string,
    payload: QuoteCancelPayload = {},
  ): Promise<Quote> => {
    const { data } = await api.post<Quote>(
      `/api/finance/quotes/${quoteId}/cancel`,
      payload,
    );
    return data;
  },
};
