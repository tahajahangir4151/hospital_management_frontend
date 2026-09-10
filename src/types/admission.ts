import { Patient } from "./patient";
import { Room } from "./room";

export interface Admission {
  id: string;
  patient_id: string;
  room_id: string;
  admission_date: string;
  discharge_date: string | null;
  created_at: string;
}

export interface AdmitPatientDTO {
  patient_id: string;
  room_id: string;
  admission_date?: string;
}

export interface AdmissionsResponse {
  success: boolean;
  message?: string;
  data: Admission[];
}

export interface SingleAdmissionResponse {
  success: boolean;
  message?: string;
  data: Admission;
}

export interface AdmissionActionResponse {
  success: boolean;
  message?: string;
  data?: Admission;
}

export interface EnrichedAdmission extends Admission {
  patient?: Patient;
  room?: Room;
}
