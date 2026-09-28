import { api } from "@/lib/api";
import type {
  CurrentUser,
  InvitedUser,
  PaginatedResponse,
  ResendInviteResponse,
  UserInvitePayload,
  UserRole,
} from "@/types/api";

export const usersService = {
  list: async (): Promise<PaginatedResponse<CurrentUser>> => {
    const { data } = await api.get<PaginatedResponse<CurrentUser>>(
      "/api/users",
      { params: { page: 1, page_size: 100 } },
    );
    return data;
  },

  invite: async (payload: UserInvitePayload): Promise<InvitedUser> => {
    const { data } = await api.post<InvitedUser>("/api/users/invite", payload);
    return data;
  },

  updateRole: async (id: string, role: UserRole): Promise<CurrentUser> => {
    const { data } = await api.put<CurrentUser>(`/api/users/${id}/role`, {
      role,
    });
    return data;
  },

  deactivate: async (id: string): Promise<CurrentUser> => {
    const { data } = await api.delete<CurrentUser>(`/api/users/${id}`);
    return data;
  },

  hardDelete: async (id: string): Promise<void> => {
    await api.delete(`/api/users/${id}/hard`);
  },

  resendInvite: async (id: string): Promise<ResendInviteResponse> => {
    const { data } = await api.post<ResendInviteResponse>(
      `/api/users/${id}/resend-invite`,
    );
    return data;
  },
};
