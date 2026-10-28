import { UserRole } from '@/types/database';

export interface GeneralUserLoginInput {
  name?: string;
  employeeId?: string;
  phoneOrPin?: string;
  divisionId?: string;
  divisionName?: string;
  departmentId?: string;
  departmentName?: string;
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
    divisionId?: string;
    divisionName?: string;
    departmentId?: string;
    departmentName?: string;
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
  divisionId?: string;
  divisionName?: string;
  departmentId?: string;
  departmentName?: string;
  expiresAt: number;
}>();

// Universal Base64URL encoder (Pure Web Standard - works in Browser & Node.js without polyfill issues)
function encodeBase64Url(str: string): string {
  const base64 = btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Universal Base64URL decoder (Pure Web Standard - works in Browser & Node.js without polyfill issues)
function decodeBase64Url(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export async function authenticateGeneralUser(input: GeneralUserLoginInput): Promise<AuthResult> {
  const nameTrimmed = input.name?.trim();
  const empIdTrimmed = input.employeeId?.trim();

  if (!nameTrimmed && !empIdTrimmed) {
    return { success: false, error: 'Name or Employee ID is required' };
  }

  // Derive stable user ID and display name
  const userName = nameTrimmed || (empIdTrimmed ? `Employee ${empIdTrimmed}` : 'General User');
  const userId = empIdTrimmed
    ? `usr_${empIdTrimmed.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    : `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  const token = `token_usr_${encodeBase64Url(JSON.stringify({
    id: userId,
    employeeId: empIdTrimmed,
    name: userName,
    role: 'user',
    divisionId: input.divisionId,
    divisionName: input.divisionName,
    departmentId: input.departmentId,
    departmentName: input.departmentName,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  }))}`;

  tokenStore.set(token, {
    id: userId,
    employeeId: empIdTrimmed,
    name: userName,
    role: 'user',
    divisionId: input.divisionId,
    divisionName: input.divisionName,
    departmentId: input.departmentId,
    departmentName: input.departmentName,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });

  return {
    success: true,
    user: {
      id: userId,
      employeeId: empIdTrimmed,
      name: userName,
      role: 'user',
      divisionId: input.divisionId,
      divisionName: input.divisionName,
      departmentId: input.departmentId,
      departmentName: input.departmentName,
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
    'admin@itsupport.com': 'admin-password-1234',
    'admin@company.local': 'AdminPassword123!',
    'admin@company.com': 'AdminPassword123!',
    'support@company.local': 'SupportPass2026!',
  };

  const envAdminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const envAdminPassword = process.env.ADMIN_PASSWORD;
  if (envAdminEmail && envAdminPassword) {
    STAFF_CREDENTIALS[envAdminEmail.toLowerCase()] = envAdminPassword;
  }

  const emailLower = input.email.toLowerCase();
  const expectedPassword = STAFF_CREDENTIALS[emailLower];
  const isValidStaff = expectedPassword !== undefined && input.password === expectedPassword;

  if (!isValidStaff) {
    return { success: false, error: 'Invalid credentials or unauthorized staff account' };
  }

  const userId = `staff_${input.email.split('@')[0]}`;
  const userName = 'IT Administrator';

  const token = `token_staff_${encodeBase64Url(JSON.stringify({
    id: userId,
    email: input.email,
    name: userName,
    role: 'admin',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  }))}`;

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
    const decoded = JSON.parse(decodeBase64Url(raw));
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
