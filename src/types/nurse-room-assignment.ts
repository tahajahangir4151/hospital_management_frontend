import { Room } from "./room";

export interface NurseRoomAssignment {
  id: string;
  nurse_id: string;
  room_id: string;
  created_at: string;
}

export interface AssignNurseToRoomDTO {
  nurse_id: string;
  room_id: string;
}

export interface NurseRoomAssignmentResponse {
  success: boolean;
  message?: string;
  data: NurseRoomAssignment;
}

export interface NurseRoomsResponse {
  success: boolean;
  message?: string;
  data: Room[];
}

export interface EnrichedNurseAssignment {
  nurse_id: string;
  nurse_name: string;
  shift_timing: string;
  department_name: string;
  contact_number: string;
  rooms: Room[];
}
