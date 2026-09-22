import { api } from "@/lib/api";
import type {
  BillingStatus,
  CheckoutResponse,
  PlanTier,
  PortalResponse,
} from "@/types/api";

export const billingService = {
  getStatus: async (): Promise<BillingStatus> => {
    const { data } = await api.get<BillingStatus>("/api/billing/status");
    return data;
  },

  createCheckout: async (plan: PlanTier): Promise<CheckoutResponse> => {
    const { data } = await api.post<CheckoutResponse>("/api/billing/checkout", {
      plan,
    });
    return data;
  },

  createPortal: async (): Promise<PortalResponse> => {
    const { data } = await api.post<PortalResponse>("/api/billing/portal", {});
    return data;
  },
};
