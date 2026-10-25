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
