/** Shared API contracts mirroring the FastAPI Pydantic schemas. */

export type UserRole = "admin" | "dentist" | "reception" | "assistant";

export interface CurrentUser {
  id: string;
  clinic_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface ClinicSummary {
  id: string;
  legal_name: string;
  trade_name: string;
  cnpj: string;
  timezone: string;
  plan: string;
}

export interface MeResponse {
  user: CurrentUser;
  clinic: ClinicSummary;
  features: Record<string, { enabled: boolean; config?: Record<string, unknown> }>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}
