export interface Department {
  id: string;
  name: string;
  location: string;
  contact_number: string;
  created_at: string;
}

export interface CreateDepartmentDTO {
  name: string;
  location: string;
  contact_number: string;
}

export interface UpdateDepartmentDTO {
  name: string;
  location: string;
  contact_number: string;
}

export interface DepartmentsResponse {
  success: boolean;
  message?: string;
  data: Department[];
}

export interface SingleDepartmentResponse {
  success: boolean;
  message?: string;
  data: Department;
}

export interface DepartmentActionResponse {
  success: boolean;
  message?: string;
}
