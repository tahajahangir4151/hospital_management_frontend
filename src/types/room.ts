export interface Room {
  id: string;
  room_number: string;
  type: string;
  daily_charge: number;
  created_at: string;
}

export interface CreateRoomDTO {
  room_number: string;
  type: string;
  daily_charge: number;
}

export interface UpdateRoomDTO {
  room_number: string;
  type: string;
  daily_charge: number;
}

export interface RoomsResponse {
  success: boolean;
  message?: string;
  data: Room[];
}

export interface SingleRoomResponse {
  success: boolean;
  message?: string;
  data: Room;
}

export interface RoomActionResponse {
  success: boolean;
  message?: string;
  data?: Room;
}

export interface RoomOccupant {
  id?: string;
  patient_id?: string;
  patient_name?: string;
  admission_date?: string;
  status?: string;
  notes?: string;
}

export interface RoomAdmission {
  id?: string;
  patient_id?: string;
  patient_name?: string;
  admission_date?: string;
  discharge_date?: string;
  status?: string;
}
