import { api } from "@/lib/api";
import type {
  ClinicalRecord,
  ClinicalRecordAddendum,
  ClinicalRecordAddendumPayload,
  ClinicalRecordCreatePayload,
  ClinicalRecordUpdatePayload,
  PaginatedResponse,
} from "@/types/api";

export const clinicalRecordsService = {
  list: async (
    patientId: string,
    params: { page?: number; page_size?: number } = {},
  ): Promise<PaginatedResponse<ClinicalRecord>> => {
    const { data } = await api.get<PaginatedResponse<ClinicalRecord>>(
      `/api/clinical/patients/${patientId}/records`,
      { params: { page: 1, page_size: 50, ...params } },
    );
    return data;
  },

  get: async (recordId: string): Promise<ClinicalRecord> => {
    const { data } = await api.get<ClinicalRecord>(
      `/api/clinical/records/${recordId}`,
    );
    return data;
  },

  create: async (
    patientId: string,
    payload: ClinicalRecordCreatePayload,
  ): Promise<ClinicalRecord> => {
    const { data } = await api.post<ClinicalRecord>(
      `/api/clinical/patients/${patientId}/records`,
      payload,
    );
    return data;
  },

  update: async (
    recordId: string,
    payload: ClinicalRecordUpdatePayload,
  ): Promise<ClinicalRecord> => {
    const { data } = await api.put<ClinicalRecord>(
      `/api/clinical/records/${recordId}`,
      payload,
    );
    return data;
  },

  listAddendums: async (recordId: string): Promise<ClinicalRecordAddendum[]> => {
    const { data } = await api.get<ClinicalRecordAddendum[]>(
      `/api/clinical/records/${recordId}/addendums`,
    );
    return data;
  },

  addAddendum: async (
    recordId: string,
    payload: ClinicalRecordAddendumPayload,
  ): Promise<ClinicalRecordAddendum> => {
    const { data } = await api.post<ClinicalRecordAddendum>(
      `/api/clinical/records/${recordId}/addendums`,
      payload,
    );
    return data;
  },
};
