/**
 * Axios client — single source of truth for all backend calls.
 *
 * - baseURL comes from VITE_API_URL (proxied via Vite during dev)
 * - Interceptor injects the Bearer token from the Zustand auth store
 * - 401 responses clear the session and trigger a redirect to /login
 *
 * NOTE: We keep zero implicit retries; React Query handles retry policy
 *       per-query so we don't double-retry on transient failures.
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { useAuthStore } from "@/store/auth";

const baseURL = import.meta.env.VITE_API_URL ?? "";

export const api = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(handler: () => void): void {
  onUnauthorized = handler;
}

let onSubscriptionInactive: (() => void) | null = null;
export function setOnSubscriptionInactive(handler: () => void): void {
  onSubscriptionInactive = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<BackendErrorEnvelope>) => {
    const status = error.response?.status;

    if (status === 401) {
      useAuthStore.getState().clear();
      onUnauthorized?.();
      return Promise.reject(error);
    }

    // 402 → assinatura inativa: middleware devolve o envelope padrão.
    // Redireciona para a página de billing (fluxo distinto do 401).
    if (
      status === 402 &&
      error.response?.data?.error?.code === "subscription_inactive"
    ) {
      onSubscriptionInactive?.();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

/**
 * Backend error envelope (matches `core/errors.py`):
 *   { error: { code: string; message: string; details?: Record<string, unknown> } }
 */
export interface BackendErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function getErrorMessage(err: unknown, fallback = "Erro inesperado"): string {
  if (axios.isAxiosError<BackendErrorEnvelope>(err)) {
    return err.response?.data?.error?.message ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
