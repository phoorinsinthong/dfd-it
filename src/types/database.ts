export type UserRole = 'user' | 'admin' | 'superadmin';

export interface Division {
  id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
}

export interface Department {
  id: string;
  name: string;
  division_id?: string;
  division_name?: string;
  building?: string;
  floor?: string;
  room?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  employee_id?: string;
  email?: string;
  name: string;
  phone?: string;
  division_id?: string;
  division_name?: string;
  department_id?: string;
  department_name?: string;
  role: UserRole;
  created_at?: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  expires_at?: number;
}

export type TicketStatus = 'pending' | 'in_progress' | 'resolved' | 'cancelled';
export type TicketUrgency = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  user_id: string;
  user_name?: string;
  user_employee_id?: string;
  division_id?: string;
  division_name?: string;
  department_id?: string;
  department_name?: string;
  building?: string;
  floor?: string;
  room?: string;
  location_note?: string;
  category_id?: string;
  category_name?: string;
  title: string;
  description: string;
  location: string;
  image_url?: string;
  urgency?: TicketUrgency;
  status: TicketStatus;
  assigned_to?: string;
  assigned_to_name?: string;
  solution_note?: string;
  root_cause?: string;
  created_at: string;
  resolved_at?: string;
}

export type RoomType = 'onsite' | 'online';
export type BookingStatus = 'confirmed' | 'cancelled';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity?: number;
  location?: string;
  static_url?: string;
  passcode?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Booking {
  id: string;
  user_id: string;
  user_name?: string;
  user_department?: string;
  room_id: string;
  room_name?: string;
  room_type?: RoomType;
  room_static_url?: string;
  room_passcode?: string;
  title: string;
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  required_equipment: string[];
  status: BookingStatus;
  created_at: string;
}

export type AssetStatus = 'available' | 'borrowed' | 'maintenance';

export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  category: string;
  status: AssetStatus;
  created_at?: string;
}

export interface BorrowLog {
  id: string;
  asset_id: string;
  asset_code?: string;
  asset_name?: string;
  borrower_name: string;
  borrower_division_id?: string;
  borrower_division_name?: string;
  borrower_dept_id?: string;
  borrower_dept_name?: string;
  borrow_date: string;
  expected_return_date: string;
  actual_return_date?: string;
  staff_id?: string;
  staff_name?: string;
  condition_out?: string;
  condition_in?: string;
  notes?: string;
  is_overdue?: boolean;
}

export interface ChecklistTemplate {
  id: string;
  title: string;
  description?: string;
  frequency?: 'monthly' | 'quarterly' | 'annually' | 'custom_range';
  scheduled_months?: number[]; // e.g. [10, 11, 12]
  period_label?: string; // e.g. "ต.ค. - ธ.ค."
  items: string[];
  created_at?: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  task_name: string;
  is_completed: boolean;
  completed_by?: string;
  completed_at?: string;
}

export interface Checklist {
  id: string;
  title: string;
  year: number;
  target_month?: number; // 1 - 12
  target_month_end?: number; // e.g. 12
  period_label?: string; // e.g. "ต.ค. - ธ.ค."
  scheduled_months?: number[];
  type: 'annual' | 'adhoc';
  status: 'pending' | 'in_progress' | 'completed';
  items: ChecklistItem[];
  progress_percent?: number;
  created_at?: string;
}

export interface ReportSignature {
  id: string;
  month: number;
  year: number;
  staff_signature?: string; // base64 data url, certified stamp, or empty for physical
  staff_name?: string;
  staff_title?: string;
  staff_signature_type?: 'drawn' | 'typed' | 'physical';
  supervisor_signature?: string; // base64 data url, certified stamp, or empty for physical
  supervisor_name?: string;
  supervisor_title?: string;
  supervisor_signature_type?: 'drawn' | 'typed' | 'physical';
  signed_at?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'superadmin';
  title?: string;
  is_active: boolean;
  created_at: string;
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'SIGN' | 'CLEAR_SIGN' | 'STATUS_CHANGE';
export type AuditModule = 'ASSET' | 'PM' | 'BOOKING' | 'REPORT' | 'USER_ADMIN' | 'MASTER_DATA' | 'TICKET' | 'AUTH';

export interface AuditLog {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_name: string;
  actor_email?: string;
  actor_role: string;
  action: AuditAction;
  module: AuditModule;
  target_id?: string;
  target_name?: string;
  details: string;
}

export interface MonthlyReportSummary {
  month: number;
  year: number;
  ticketStats: {
    total: number;
    resolved: number;
    pending: number;
    inProgress: number;
    cancelled: number;
    resolutionRate: number; // percentage
    byCategory: Record<string, number>;
    byDepartment: Record<string, number>;
  };
  bookingStats: {
    total: number;
    onsite: number;
    online: number;
    byRoom: Record<string, number>;
  };
  assetStats: {
    totalLoans: number;
    returned: number;
    active: number;
    overdue: number;
  };
  pmStats: {
    totalChecklists: number;
    completedChecklists: number;
    completionRate: number;
  };
  signature?: ReportSignature;
}
