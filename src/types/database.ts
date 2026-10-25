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
