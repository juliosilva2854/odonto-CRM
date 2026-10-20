import { api } from "@/lib/api";
import type {
  AppointmentBoardItem,
  AppointmentCreatePayload,
  AppointmentStatus,
  Professional,
  Room,
  RoomCreatePayload,
  RoomUpdatePayload,
  SendWhatsAppResponse,
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
  ): Promise<SendWhatsAppResponse> => {
    const { data } = await api.post<SendWhatsAppResponse>(
      `/api/agenda/appointments/${appointmentId}/send-whatsapp`,
      { template },
    );
    return data;
  },
};
