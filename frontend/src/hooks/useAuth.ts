import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth";
import type { LoginRequest } from "@/types/api";

const ME_KEY = ["auth", "me"] as const;

export function useCurrentUser() {
  const token = useAuthStore((s) => s.token);
  const setIdentity = useAuthStore((s) => s.setIdentity);

  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      const me = await authService.me();
      setIdentity(me.user, {
        id: me.clinic.id as string,
        legal_name: me.clinic.legal_name as string,
        trade_name: me.clinic.trade_name as string,
        cnpj: me.clinic.cnpj as string,
        timezone: me.clinic.timezone as string,
        plan: me.clinic.plan as string,
      });
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
      setIdentity(me.user, {
        id: me.clinic.id as string,
        legal_name: me.clinic.legal_name as string,
        trade_name: me.clinic.trade_name as string,
        cnpj: me.clinic.cnpj as string,
        timezone: me.clinic.timezone as string,
        plan: me.clinic.plan as string,
      });
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
