export interface Patient {
  id: string;
  name: string;
  date_of_birth: string;
  gender: string;
  address: string;
  phone_number: string;
  created_at: string;
}

export interface CreatePatientDTO {
  name: string;
  date_of_birth: string;
  gender: string;
  address: string;
  phone_number: string;
}

export interface UpdatePatientDTO {
  name: string;
  date_of_birth: string;
  gender: string;
  address: string;
  phone_number: string;
}

export interface PatientsResponse {
  success: boolean;
  message?: string;
  data: Patient[];
}

export interface SinglePatientResponse {
  success: boolean;
  message?: string;
  data: Patient;
}

export interface PatientActionResponse {
  success: boolean;
  message?: string;
  data?: Patient;
}

export interface PatientTreatment {
  id?: string;
  treatment_name?: string;
  diagnosis?: string;
  description?: string;
  notes?: string;
  treatment_date?: string;
}

export interface PatientAdmission {
  id?: string;
  status?: string;
  admission_date?: string;
  discharge_date?: string;
}
