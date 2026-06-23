import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { ClinicSummary, CurrentUser } from "@/types/api";

interface AuthSession {
  token: string | null;
  refreshToken: string | null;
  user: CurrentUser | null;
  clinic: ClinicSummary | null;
}

interface AuthState extends AuthSession {
  isAuthenticated: () => boolean;
  setTokens: (access: string, refresh: string) => void;
  setIdentity: (user: CurrentUser, clinic: ClinicSummary) => void;
  clear: () => void;
}

const initial: AuthSession = {
  token: null,
  refreshToken: null,
  user: null,
  clinic: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initial,
      isAuthenticated: () => Boolean(get().token && get().user),
      setTokens: (access, refresh) =>
        set({ token: access, refreshToken: refresh }),
      setIdentity: (user, clinic) => set({ user, clinic }),
      clear: () => set({ ...initial }),
    }),
    {
      name: "dental-crm.auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        token: s.token,
        refreshToken: s.refreshToken,
        user: s.user,
        clinic: s.clinic,
      }),
    },
  ),
);
