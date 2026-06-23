import { api } from "@/lib/api";
import type {
  AppointmentBoardItem,
  AppointmentCreatePayload,
  AppointmentStatus,
  Room,
} from "@/types/api";

export const agendaService = {
  listRooms: async (includeInactive = false): Promise<Room[]> => {
    const { data } = await api.get<Room[]>("/api/agenda/rooms", {
      params: { include_inactive: includeInactive },
    });
    return data;
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
};
