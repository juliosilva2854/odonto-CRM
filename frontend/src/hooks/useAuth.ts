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
        id: me.clinic.id,
        legal_name: me.clinic.legal_name,
        trade_name: me.clinic.trade_name,
        cnpj: me.clinic.cnpj,
        timezone: me.clinic.timezone,
        plan: me.clinic.plan,
      });
      qc.setQueryData(ME_KEY, me);
    },
  });
}
