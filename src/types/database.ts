export type UserRole = 'user' | 'admin';

export interface Department {
  id: string;
  name: string;
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
  department_id?: string;
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
  department_id?: string;
  department_name?: string;
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
  type: 'annual' | 'adhoc';
  status: 'pending' | 'in_progress' | 'completed';
  items: ChecklistItem[];
  progress_percent?: number;
  created_at?: string;
}
