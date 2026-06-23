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

// ────────────────────────────────────────────────────────────────────
// Patients
// ────────────────────────────────────────────────────────────────────
export type Gender =
  | "male"
  | "female"
  | "non_binary"
  | "other"
  | "not_informed";

export interface Patient {
  id: string;
  clinic_id: string;
  full_name: string;
  social_name: string | null;
  cpf: string | null;
  rg: string | null;
  birth_date: string | null;
  gender: Gender;
  phone_e164: string;
  secondary_phone_e164: string | null;
  email: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zipcode: string | null;
  is_minor: boolean;
  guardian_name: string | null;
  guardian_cpf: string | null;
  guardian_phone_e164: string | null;
  notes: string | null;
  anonymized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientSummary {
  id: string;
  full_name: string;
  cpf: string | null;
  phone_e164: string;
  email: string | null;
  is_minor: boolean;
  anonymized_at: string | null;
  created_at: string;
}

// ────────────────────────────────────────────────────────────────────
// Clinical — Catalog
// ────────────────────────────────────────────────────────────────────
export type ProcedureCategory =
  | "clinical_general"
  | "orthodontics"
  | "endodontics"
  | "surgery"
  | "prosthesis"
  | "aesthetic"
  | "prevention"
  | "other";

export interface Procedure {
  id: string;
  clinic_id: string;
  code: string;
  tuss_code: string | null;
  name: string;
  description: string | null;
  category: ProcedureCategory;
  specialty_id: string | null;
  requires_tooth: boolean;
  requires_faces: boolean;
  default_color_hex: string;
  completed_color_hex: string;
  base_price: string;
  default_duration_min: number;
  commission_pct_override: string | null;
  is_active: boolean;
  created_at: string;
}

// ────────────────────────────────────────────────────────────────────
// Clinical — Odontogram (FDI / ISO 3950)
// ────────────────────────────────────────────────────────────────────
export type ToothFace = "M" | "D" | "V" | "L" | "O" | "I" | "B" | "P";

export type ToothProcedureStatus =
  | "planned"
  | "to_execute"
  | "in_progress"
  | "done"
  | "cancelled";

export interface ToothProcedure {
  id: string;
  clinic_id: string;
  patient_id: string;
  tooth_fdi: string | null;
  faces: string[];
  procedure_id: string;
  status: ToothProcedureStatus;
  price_snapshot: string;
  commission_pct_snapshot: string | null;
  notes: string | null;
  planned_by_user_id: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OdontogramSnapshot {
  patient_id: string;
  procedures: ToothProcedure[];
}

export interface AddProcedurePayload {
  procedure_id: string;
  tooth_fdi: string | null;
  faces: string[];
  notes?: string | null;
  price_override?: string | null;
}

// ────────────────────────────────────────────────────────────────────
// Clinical — Records (with CFO Lock metadata)
// ────────────────────────────────────────────────────────────────────
export type ClinicalRecordType =
  | "evolution"
  | "anamnesis"
  | "prescription"
  | "exam"
  | "consent"
  | "other";

export interface ClinicalRecordAttachment {
  filename: string;
  url: string;
  mime?: string | null;
  size_bytes?: number | null;
  sha256?: string | null;
}

export interface ClinicalRecord {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id: string | null;
  author_user_id: string;
  record_type: ClinicalRecordType;
  title: string;
  content: string;
  attachments: ClinicalRecordAttachment[];
  locked_at: string | null;
  is_locked: boolean;
  locks_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicalRecordAddendum {
  id: string;
  clinic_id: string;
  record_id: string;
  author_user_id: string;
  content: string;
  attachments: ClinicalRecordAttachment[];
  created_at: string;
}

export interface ClinicalRecordCreatePayload {
  appointment_id?: string | null;
  record_type?: ClinicalRecordType;
  title: string;
  content: string;
  attachments?: ClinicalRecordAttachment[];
}

export interface ClinicalRecordUpdatePayload {
  title?: string;
  content?: string;
  attachments?: ClinicalRecordAttachment[];
}

export interface ClinicalRecordAddendumPayload {
  content: string;
  attachments?: ClinicalRecordAttachment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Finance — Quotes
// ─────────────────────────────────────────────────────────────────────────────

export type QuoteStatus =
  | "draft"
  | "sent"
  | "approved_partial"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired";

export type QuoteItemStatus = "pending" | "approved" | "rejected";

export type DeductionType =
  | "card_fee"
  | "lab_fee"
  | "material"
  | "platform_fee"
  | "other";

export interface QuoteDeduction {
  type: DeductionType;
  amount: string;
  label?: string | null;
}

export interface QuoteItem {
  id: string;
  clinic_id: string;
  quote_id: string;
  procedure_id: string;
  procedure_code_snapshot: string;
  procedure_name_snapshot: string;
  tooth_procedure_id: string | null;
  tooth_fdi: string | null;
  faces: string[];
  description: string | null;
  quantity: string;
  unit_price: string;
  discount_amount: string;
  line_total: string;
  commission_pct_snapshot: string | null;
  commission_amount_snapshot: string | null;
  deductions: Array<Record<string, unknown>>;
  status: QuoteItemStatus;
  decided_at: string | null;
  decided_by_user_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  clinic_id: string;
  patient_id: string;
  number: string;
  status: QuoteStatus;
  subtotal: string;
  discount_amount: string;
  total: string;
  notes: string | null;
  valid_until: string | null;
  created_by_user_id: string;
  approved_by_user_id: string | null;
  approved_at: string | null;
  items: QuoteItem[];
  created_at: string;
  updated_at: string;
}

export interface QuoteItemCreatePayload {
  procedure_id: string;
  tooth_procedure_id?: string | null;
  tooth_fdi?: string | null;
  faces?: string[];
  description?: string | null;
  quantity?: string;
  unit_price_override?: string | null;
  discount_amount?: string;
  commission_pct?: string | null;
  commission_amount?: string | null;
  deductions?: QuoteDeduction[];
}

export interface QuoteCreatePayload {
  patient_id: string;
  items: QuoteItemCreatePayload[];
  discount_amount?: string;
  notes?: string | null;
  valid_until?: string | null;
}

export interface QuoteRejectPayload {
  reason?: string | null;
}

export interface QuoteCancelPayload {
  reason?: string | null;
}
