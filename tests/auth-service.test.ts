import { describe, it, expect } from 'vitest';
import {
  authenticateGeneralUser,
  authenticateStaff,
  verifySession,
  canAccessAdminRoute,
} from '@/lib/auth/auth-service';

describe('Dual Authentication & Role Guard Seam', () => {
  describe('General User Authentication', () => {
    it('successfully authenticates a general user with valid Employee ID and PIN', async () => {
      const result = await authenticateGeneralUser({
        employeeId: 'EMP001',
        phoneOrPin: '1234',
        name: 'สมชาย สดใส',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.employeeId).toBe('EMP001');
      expect(result.user?.role).toBe('user');
      expect(result.token).toBeDefined();
    });

    it('rejects general user login with missing Employee ID', async () => {
      const result = await authenticateGeneralUser({
        employeeId: '',
        phoneOrPin: '1234',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Employee ID is required/i);
    });
  });

  describe('IT Staff Authentication', () => {
    it('successfully authenticates IT staff with valid credentials and admin role', async () => {
      const result = await authenticateStaff({
        email: 'it-admin@company.local',
        password: 'AdminPassword123!',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('it-admin@company.local');
      expect(result.user?.role).toBe('admin');
      expect(result.token).toBeDefined();
    });

    it('rejects IT staff authentication with invalid password', async () => {
      const result = await authenticateStaff({
        email: 'it-admin@company.local',
        password: 'WrongPassword',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid credentials/i);
    });
  });

  describe('Role-Based Route Guard', () => {
    it('allows admin users to access admin routes', () => {
      expect(canAccessAdminRoute('admin')).toBe(true);
    });

    it('denies general users from accessing admin routes', () => {
      expect(canAccessAdminRoute('user')).toBe(false);
      expect(canAccessAdminRoute(undefined)).toBe(false);
    });

    it('verifies valid session tokens and extracts user role', async () => {
      const login = await authenticateGeneralUser({
        employeeId: 'EMP002',
        phoneOrPin: '5678',
      });

      const session = await verifySession(login.token!);
      expect(session).toBeDefined();
      expect(session?.employeeId).toBe('EMP002');
      expect(session?.role).toBe('user');
    });
  });
});
