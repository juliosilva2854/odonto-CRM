import { api } from "@/lib/api";
import type {
  LoginRequest,
  MeResponse,
  TokenResponse,
} from "@/types/api";

export const authService = {
  async login(payload: LoginRequest): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>("/api/auth/login", payload);
    return data;
  },

  async me(): Promise<MeResponse> {
    const { data } = await api.get<MeResponse>("/api/auth/me");
    return data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post("/api/auth/forgot-password", { email });
  },

  async resetPassword(token: string, new_password: string): Promise<void> {
    await api.post("/api/auth/reset-password", { token, new_password });
  },

  async logout(): Promise<void> {
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* Best-effort — local session is cleared regardless. */
    }
  },
};
