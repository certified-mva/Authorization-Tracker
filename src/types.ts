export type AuthStatus = "Pending" | "Approved" | "Denied" | "Not Required" | "Follow Up" | "Cancelled" | "Not Covered";

export interface AuthRecord {
  id: number;
  visit_type: string;
  insurance: string;
  insurance_id: string;
  patient_name: string;
  dob: string;
  account_number: string;
  p_r: string;
  doctor_name: string;
  procedure_codes: string;
  dx_codes: string;
  status: AuthStatus;
  request_initiated: string;
  insurance_portal_name: string;
  rep_name: string;
  phone_number: string;
  auth_case_number: string;
  ref_number: string;
  date_worked: string;
  call_time_spent: string;
  checklist: string; // JSON string
  notes: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total: number;
  pending: number;
  approved: number;
  denied: number;
  not_required: number;
  follow_up: number;
  cancelled: number;
  not_covered: number;
  submitted_today: number;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'employee';
}

export interface EmployeeStats extends User {
  today: number;
  this_week: number;
  this_month: number;
  ytd: number;
}
