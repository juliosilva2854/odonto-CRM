import { api } from "@/lib/api";
import type { SignupPayload, SignupResponse } from "@/types/api";

export const onboardingService = {
  signup: async (payload: SignupPayload): Promise<SignupResponse> => {
    const { data } = await api.post<SignupResponse>(
      "/api/public/signup",
      payload,
    );
    return data;
  },
};
