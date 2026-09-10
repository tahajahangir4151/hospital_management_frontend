export interface Bill {
  id: string;
  patient_id: string;
  total_amount: number;
  payment_status: "pending" | "paid" | "partially_paid" | "overdue" | string;
  date_issued: string;
  created_at: string;
}

export interface CreateBillDTO {
  patient_id: string;
  total_amount: number;
  payment_status: string;
  date_issued: string;
}

export interface UpdateBillDTO {
  patient_id: string;
  total_amount: number;
  payment_status: string;
  date_issued: string;
}

export interface BillsResponse {
  success: boolean;
  message?: string;
  data: Bill[];
}

export interface SingleBillResponse {
  success: boolean;
  message?: string;
  data: Bill;
}

export interface BillActionResponse {
  success: boolean;
  message?: string;
  data?: Bill;
}

export interface EnrichedBill extends Bill {
  patient_name?: string;
  patient_phone?: string;
  patient_gender?: string;
}
