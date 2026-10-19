import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth";
import type { ClinicSummary, LoginRequest, MeResponse } from "@/types/api";

const ME_KEY = ["auth", "me"] as const;

/** Super admins são tenant-less: `me.clinic` vem vazio ({}) do backend. */
export function toClinic(me: MeResponse): ClinicSummary | null {
  const c = me.clinic as unknown as Record<string, unknown>;
  if (!c || !c.id) return null;
  return {
    id: c.id as string,
    legal_name: c.legal_name as string,
    trade_name: c.trade_name as string,
    cnpj: c.cnpj as string,
    timezone: c.timezone as string,
    plan: c.plan as string,
  };
}

export function useCurrentUser() {
  const token = useAuthStore((s) => s.token);
  const setIdentity = useAuthStore((s) => s.setIdentity);

  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      const me = await authService.me();
      setIdentity(me.user, toClinic(me));
      return me;
    },
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useLogin() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const setIdentity = useAuthStore((s) => s.setIdentity);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (creds: LoginRequest) => {
      const tokens = await authService.login(creds);
      setTokens(tokens.access_token, tokens.refresh_token);
      const me = await authService.me();
      return me;
    },
    onSuccess: (me) => {
      setIdentity(me.user, toClinic(me));
      qc.setQueryData(ME_KEY, me);
    },
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await authService.logout();
    },
    onSettled: () => {
      clear();
      qc.clear();
    },
  });
}
