import { api } from "@/lib/api";
import type {
  AppointmentBoardItem,
  AppointmentCheckIn,
  AppointmentDetail,
  AppointmentCreatePayload,
  AppointmentStatus,
  Professional,
  Room,
  RoomCreatePayload,
  RoomUpdatePayload,
  SendWhatsAppResponse,
  TeleconsultationResponse,
  WhatsAppTemplate,
} from "@/types/api";

export const agendaService = {
  listProfessionals: async (): Promise<Professional[]> => {
    const { data } = await api.get<Professional[]>("/api/professionals");
    return data;
  },

  listRooms: async (includeInactive = false): Promise<Room[]> => {
    const { data } = await api.get<Room[]>("/api/agenda/rooms", {
      params: { include_inactive: includeInactive },
    });
    return data;
  },

  createRoom: async (payload: RoomCreatePayload): Promise<Room> => {
    const { data } = await api.post<Room>("/api/agenda/rooms", payload);
    return data;
  },

  updateRoom: async (
    id: string,
    payload: RoomUpdatePayload,
  ): Promise<Room> => {
    const { data } = await api.put<Room>(`/api/agenda/rooms/${id}`, payload);
    return data;
  },

  deleteRoom: async (id: string): Promise<void> => {
    await api.delete(`/api/agenda/rooms/${id}`);
  },

  listAppointments: async (params: {
    start: string;
    end: string;
    professional_id?: string;
    room_id?: string;
    patient_id?: string;
    statuses?: AppointmentStatus[];
  }): Promise<AppointmentBoardItem[]> => {
    const { data } = await api.get<AppointmentBoardItem[]>(
      "/api/agenda/appointments",
      {
        params,
        paramsSerializer: { indexes: null },
      },
    );
    return data;
  },

  createAppointment: async (
    payload: AppointmentCreatePayload,
  ): Promise<AppointmentBoardItem> => {
    const { data } = await api.post<AppointmentBoardItem>(
      "/api/agenda/appointments",
      payload,
    );
    return data;
  },

  /** Renderiza a mensagem pt-BR no backend e devolve o link wa.me (Click-to-Chat). */
  sendWhatsapp: async (
    appointmentId: string,
    template: WhatsAppTemplate = "confirmation",
    options: { includeTeleconsultation?: boolean } = {},
  ): Promise<SendWhatsAppResponse> => {
    const { data } = await api.post<SendWhatsAppResponse>(
      `/api/agenda/appointments/${appointmentId}/send-whatsapp`,
      {
        template,
        include_teleconsultation: Boolean(options.includeTeleconsultation),
      },
    );
    return data;
  },

  /** Sala de teleconsulta (Jitsi Meet) do agendamento. */
  getTeleconsultation: async (
    appointmentId: string,
  ): Promise<TeleconsultationResponse> => {
    const { data } = await api.get<TeleconsultationResponse>(
      `/api/agenda/appointments/${appointmentId}/teleconsultation`,
    );
    return data;
  },

  /** Transição de status (o backend valida a máquina de estados). */
  changeStatus: async (
    appointmentId: string,
    newStatus: AppointmentStatus,
    reason?: string | null,
  ): Promise<AppointmentDetail> => {
    const { data } = await api.post<AppointmentDetail>(
      `/api/agenda/appointments/${appointmentId}/status`,
      { new_status: newStatus, reason: reason || null },
    );
    return data;
  },

  /** Check-in MANUAL pela recepção (registra o CheckIn e move para sala de espera). */
  checkinManual: async (appointmentId: string): Promise<AppointmentCheckIn> => {
    const { data } = await api.post<AppointmentCheckIn>(
      `/api/agenda/appointments/${appointmentId}/checkin`,
      {},
    );
    return data;
  },
};
