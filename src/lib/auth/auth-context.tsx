'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '@/types/database';
import { authenticateGeneralUser, authenticateStaff } from './auth-service';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  loginGeneralUser: (name: string, departmentId?: string) => Promise<{ success: boolean; error?: string }>;
  loginStaff: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'it_support_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.role) {
          setUser(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load session from storage', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginGeneralUser = async (name: string, departmentId?: string) => {
    setIsLoading(true);
    try {
      const res = await authenticateGeneralUser({ name, departmentId });
      if (res.success && res.user && res.token) {
        const profile: UserProfile = {
          id: res.user.id,
          employee_id: res.user.employeeId,
          name: res.user.name,
          role: 'user',
        };
        setUser(profile);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        localStorage.setItem('it_support_saved_name', res.user.name);
        document.cookie = `session_token=${res.token}; path=/; max-age=2592000; SameSite=Lax`;
        return { success: true };
      }
      return { success: false, error: res.error || 'Authentication failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginStaff = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authenticateStaff({ email, password });
      if (res.success && res.user && res.token) {
        const profile: UserProfile = {
          id: res.user.id,
          email: res.user.email,
          name: res.user.name,
          role: 'admin',
        };
        setUser(profile);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        document.cookie = `session_token=${res.token}; path=/; max-age=604800; SameSite=Lax`;
        return { success: true };
      }
      return { success: false, error: res.error || 'Authentication failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginGeneralUser, loginStaff, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
