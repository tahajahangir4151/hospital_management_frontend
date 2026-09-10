import { Doctor } from "./doctor";
import { Patient } from "./patient";

export interface Treatment {
  id: string;
  doctor_id: string;
  patient_id: string;
  treatment_date: string;
  diagnosis: string;
  medication: string | null;
  created_at: string;
}

export interface CreateTreatmentDTO {
  doctor_id: string;
  patient_id: string;
  treatment_date: string;
  diagnosis: string;
  medication?: string;
}

export interface UpdateTreatmentDTO {
  doctor_id: string;
  patient_id: string;
  treatment_date: string;
  diagnosis: string;
  medication?: string;
}

export interface TreatmentsResponse {
  success: boolean;
  message?: string;
  data: Treatment[];
}

export interface SingleTreatmentResponse {
  success: boolean;
  message?: string;
  data: Treatment;
}

export interface TreatmentActionResponse {
  success: boolean;
  message?: string;
  data?: Treatment;
}

export interface EnrichedTreatment extends Treatment {
  doctor?: Doctor;
  patient?: Patient;
}
