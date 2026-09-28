import { api } from "@/lib/api";
import type { DashboardOverview } from "@/types/api";

export const dashboardService = {
  overview: async (): Promise<DashboardOverview> => {
    const { data } = await api.get<DashboardOverview>(
      "/api/dashboard/overview",
    );
    return data;
  },
};
