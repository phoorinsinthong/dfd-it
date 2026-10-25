import { UserRole } from '@/types/database';

export interface GeneralUserLoginInput {
  employeeId: string;
  phoneOrPin: string;
  name?: string;
  departmentId?: string;
}

export interface StaffLoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    employeeId?: string;
    email?: string;
    name: string;
    role: UserRole;
    departmentId?: string;
  };
  token?: string;
  error?: string;
}

// In-memory or simulated session store for tests and fast token verification
const tokenStore = new Map<string, {
  id: string;
  employeeId?: string;
  email?: string;
  name: string;
  role: UserRole;
  departmentId?: string;
  expiresAt: number;
}>();

export async function authenticateGeneralUser(input: GeneralUserLoginInput): Promise<AuthResult> {
  if (!input.employeeId || input.employeeId.trim() === '') {
    return { success: false, error: 'Employee ID is required' };
  }

  if (!input.phoneOrPin || input.phoneOrPin.trim() === '') {
    return { success: false, error: 'Phone number or PIN is required' };
  }

  const userId = `usr_${input.employeeId.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const userName = input.name || `Employee ${input.employeeId}`;

  const token = `token_usr_${Buffer.from(JSON.stringify({
    id: userId,
    employeeId: input.employeeId,
    name: userName,
    role: 'user',
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  })).toString('base64url')}`;

  tokenStore.set(token, {
    id: userId,
    employeeId: input.employeeId,
    name: userName,
    role: 'user',
    departmentId: input.departmentId,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });

  return {
    success: true,
    user: {
      id: userId,
      employeeId: input.employeeId,
      name: userName,
      role: 'user',
      departmentId: input.departmentId,
    },
    token,
  };
}

export async function authenticateStaff(input: StaffLoginInput): Promise<AuthResult> {
  if (!input.email || !input.email.includes('@')) {
    return { success: false, error: 'Valid email is required' };
  }

  // Pre-configured staff accounts and passwords
  const STAFF_CREDENTIALS: Record<string, string> = {
    'it-admin@company.local': 'AdminPassword123!',
    'support@company.local': 'SupportPass2026!',
  };

  const expectedPassword = STAFF_CREDENTIALS[input.email.toLowerCase()];
  const isValidStaff = expectedPassword !== undefined && input.password === expectedPassword;

  if (!isValidStaff) {
    return { success: false, error: 'Invalid credentials or unauthorized staff account' };
  }

  const userId = `staff_${input.email.split('@')[0]}`;
  const userName = 'IT Administrator';

  const token = `token_staff_${Buffer.from(JSON.stringify({
    id: userId,
    email: input.email,
    name: userName,
    role: 'admin',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })).toString('base64url')}`;

  tokenStore.set(token, {
    id: userId,
    email: input.email,
    name: userName,
    role: 'admin',
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  return {
    success: true,
    user: {
      id: userId,
      email: input.email,
      name: userName,
      role: 'admin',
    },
    token,
  };
}

export async function verifySession(token: string) {
  if (!token) return null;

  const session = tokenStore.get(token);
  if (session && session.expiresAt > Date.now()) {
    return session;
  }

  // Fallback: decode base64url payload if stored in cookie
  try {
    const raw = token.replace(/^token_(usr|staff)_/, '');
    const decoded = JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8'));
    if (decoded && decoded.exp > Date.now()) {
      return decoded;
    }
  } catch {
    return null;
  }

  return null;
}

export function canAccessAdminRoute(role?: string): boolean {
  return role === 'admin';
}
