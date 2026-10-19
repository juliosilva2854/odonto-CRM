import { api } from "@/lib/api";
import type {
  AdminBillingEvent,
  AdminClinicDetail,
  AdminClinicSummary,
  AdminImpersonateResponse,
  AdminMetrics,
  PaginatedResponse,
  SubscriptionStatus,
} from "@/types/api";

export interface ListClinicsParams {
  search?: string;
  subscription_status?: SubscriptionStatus;
  page?: number;
  page_size?: number;
}

export const adminService = {
  getMetrics: async (): Promise<AdminMetrics> => {
    const { data } = await api.get<AdminMetrics>("/api/admin/metrics");
    return data;
  },

  listClinics: async (
    params: ListClinicsParams = {},
  ): Promise<PaginatedResponse<AdminClinicSummary>> => {
    const { data } = await api.get<PaginatedResponse<AdminClinicSummary>>(
      "/api/admin/clinics",
      { params },
    );
    return data;
  },

  getClinic: async (id: string): Promise<AdminClinicDetail> => {
    const { data } = await api.get<AdminClinicDetail>(`/api/admin/clinics/${id}`);
    return data;
  },

  listBillingEvents: async (
    id: string,
    limit = 20,
  ): Promise<AdminBillingEvent[]> => {
    const { data } = await api.get<AdminBillingEvent[]>(
      `/api/admin/clinics/${id}/billing-events`,
      { params: { limit } },
    );
    return data;
  },

  impersonate: async (id: string): Promise<AdminImpersonateResponse> => {
    const { data } = await api.post<AdminImpersonateResponse>(
      `/api/admin/clinics/${id}/impersonate`,
      {},
    );
    return data;
  },

  extendTrial: async (id: string, days = 7): Promise<AdminClinicSummary> => {
    const { data } = await api.post<AdminClinicSummary>(
      `/api/admin/clinics/${id}/extend-trial`,
      { days },
    );
    return data;
  },

  suspend: async (id: string): Promise<AdminClinicSummary> => {
    const { data } = await api.post<AdminClinicSummary>(
      `/api/admin/clinics/${id}/suspend`,
      {},
    );
    return data;
  },

  reactivate: async (id: string): Promise<AdminClinicSummary> => {
    const { data } = await api.post<AdminClinicSummary>(
      `/api/admin/clinics/${id}/reactivate`,
      {},
    );
    return data;
  },
};
