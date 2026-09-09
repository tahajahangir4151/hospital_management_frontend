export interface Doctor {
  id: string;
  full_name: string;
  specialization: string;
  years_of_experience: number;
  contact_number: string;
  department_id: string;
  created_at: string;
}

export interface CreateDoctorDTO {
  full_name: string;
  specialization: string;
  years_of_experience: number;
  contact_number: string;
  department_id: string;
}

export interface UpdateDoctorDTO {
  full_name: string;
  specialization: string;
  years_of_experience: number;
  contact_number: string;
  department_id: string;
}

export interface DoctorsResponse {
  success: boolean;
  message?: string;
  data: Doctor[];
}

export interface SingleDoctorResponse {
  success: boolean;
  message?: string;
  data: Doctor;
}

export interface DoctorActionResponse {
  success: boolean;
  message?: string;
}
