export interface Nurse {
  id: string;
  name: string;
  shift_timing: string;
  contact_number: string;
  department_id: string;
  created_at: string;
}

export interface CreateNurseDTO {
  name: string;
  shift_timing: string;
  contact_number: string;
  department_id: string;
}

export interface UpdateNurseDTO {
  name: string;
  shift_timing: string;
  contact_number: string;
  department_id: string;
}

export interface NursesResponse {
  success: boolean;
  message?: string;
  data: Nurse[];
}

export interface SingleNurseResponse {
  success: boolean;
  message?: string;
  data: Nurse;
}

export interface NurseActionResponse {
  success: boolean;
  message?: string;
}
