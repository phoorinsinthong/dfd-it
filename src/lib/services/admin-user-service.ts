import { AdminUser } from '@/types/database';
import { recordAuditLog } from './audit-log-service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'admin-super-01',
    name: 'ผู้ดูแลระบบสูงสุด (Super Administrator)',
    email: 'superadmin@company.local',
    password: 'SuperAdmin@2026!',
    role: 'superadmin',
    title: 'ผู้อำนวยการกลุ่มงานเทคโนโลยีสารสนเทศ',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'admin-std-01',
    name: 'เจ้าหน้าที่ไอทีหลัก (Admin)',
    email: 'admin@company.local',
    password: 'Admin@2026!',
    role: 'admin',
    title: 'นักวิชาการคอมพิวเตอร์ชำนาญการ',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'admin-std-02',
    name: 'เจ้าหน้าที่ฝ่ายสนับสนุนเทคนิค (IT Staff)',
    email: 'it-admin@company.local',
    password: 'AdminPassword123!',
    role: 'admin',
    title: 'เจ้าหน้าที่ฝ่ายสนับสนุนเทคนิค',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

let adminUsersStore: AdminUser[] = INITIAL_ADMIN_USERS.map((u) => ({ ...u }));

export function resetAdminUserStore() {
  adminUsersStore = INITIAL_ADMIN_USERS.map((u) => ({ ...u }));
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('admin_users').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        adminUsersStore = data as AdminUser[];
      }
    } catch (e) {
      console.warn('Supabase getAdminUsers warning:', e);
    }
  }
  return adminUsersStore.map((u) => ({ ...u }));
}

export async function getAdminUserByEmail(email: string): Promise<AdminUser | null> {
  await getAdminUsers();
  const emailLower = email.trim().toLowerCase();
  const found = adminUsersStore.find((u) => u.email.toLowerCase() === emailLower);
  return found ? { ...found } : null;
}

export async function getAdminUserById(id: string): Promise<AdminUser | null> {
  await getAdminUsers();
  const found = adminUsersStore.find((u) => u.id === id);
  return found ? { ...found } : null;
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'superadmin';
  title?: string;
}

export interface ActorInfo {
  id: string;
  name: string;
  email?: string;
  role: string;
}

export async function createAdminUser(
  input: CreateAdminUserInput,
  actor?: ActorInfo
): Promise<{ success: boolean; data?: AdminUser; error?: string }> {
  if (!input.name?.trim() || !input.email?.trim()) {
    return { success: false, error: 'กรุณากรอกชื่อและอีเมลให้ครบถ้วน' };
  }

  const emailLower = input.email.trim().toLowerCase();
  if (!emailLower.includes('@')) {
    return { success: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }

  const exists = adminUsersStore.some((u) => u.email.toLowerCase() === emailLower);
  if (exists) {
    return { success: false, error: `อีเมล ${emailLower} มีอยู่ในระบบแล้ว` };
  }

  const newAdmin: AdminUser = {
    id: `admin-${Date.now().toString().slice(-6)}`,
    name: input.name.trim(),
    email: emailLower,
    password: input.password?.trim() || 'Admin@2026!',
    role: input.role,
    title: input.title?.trim() || (input.role === 'superadmin' ? 'Super Administrator' : 'IT Staff'),
    is_active: true,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('admin_users').insert({
        name: newAdmin.name,
        email: newAdmin.email,
        password: newAdmin.password,
        role: newAdmin.role,
        title: newAdmin.title,
        is_active: true,
      }).select().single();
      if (!error && data) {
        newAdmin.id = data.id;
        newAdmin.created_at = data.created_at;
      }
    } catch (e) {
      console.warn('Supabase createAdminUser warning:', e);
    }
  }

  adminUsersStore.push(newAdmin);

  // Record audit log
  if (actor) {
    await recordAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'CREATE',
      module: 'USER_ADMIN',
      targetId: newAdmin.id,
      targetName: newAdmin.name,
      details: `เพิ่มผู้ดูแลระบบใหม่: ${newAdmin.name} (${newAdmin.email}) สิทธิ์: ${newAdmin.role}`,
    });
  }

  return { success: true, data: { ...newAdmin } };
}

export interface UpdateAdminUserInput {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'superadmin';
  title?: string;
  isActive?: boolean;
}

export async function updateAdminUser(
  input: UpdateAdminUserInput,
  actor?: ActorInfo
): Promise<{ success: boolean; data?: AdminUser; error?: string }> {
  const target = adminUsersStore.find((u) => u.id === input.id);
  if (!target) {
    return { success: false, error: 'ไม่พบบัญชีผู้ดูแลระบบที่ต้องการแก้ไข' };
  }

  // Prevent demoting the last active superadmin
  if (input.role === 'admin' && target.role === 'superadmin') {
    const activeSuperadmins = adminUsersStore.filter(
      (u) => u.role === 'superadmin' && u.is_active && u.id !== input.id
    );
    if (activeSuperadmins.length === 0) {
      return { success: false, error: 'ไม่สามารถลดระดับ Superadmin คนสุดท้ายของระบบได้' };
    }
  }

  // Prevent deactivating the last active superadmin
  if (input.isActive === false && target.role === 'superadmin') {
    const activeSuperadmins = adminUsersStore.filter(
      (u) => u.role === 'superadmin' && u.is_active && u.id !== input.id
    );
    if (activeSuperadmins.length === 0) {
      return { success: false, error: 'ไม่สามารถระงับการใช้งาน Superadmin คนสุดท้ายของระบบได้' };
    }
  }

  if (input.email && input.email.trim().toLowerCase() !== target.email.toLowerCase()) {
    const emailNorm = input.email.trim().toLowerCase();
    const collision = adminUsersStore.some(
      (u) => u.id !== input.id && u.email.toLowerCase() === emailNorm
    );
    if (collision) {
      return { success: false, error: `อีเมล ${emailNorm} ถูกใช้งานแล้วโดยผู้ดูแลระบบอื่น` };
    }
    target.email = emailNorm;
  }

  if (input.name) target.name = input.name.trim();
  if (input.password && input.password.trim()) target.password = input.password.trim();
  if (input.role) target.role = input.role;
  if (input.title !== undefined) target.title = input.title.trim();
  if (input.isActive !== undefined) target.is_active = input.isActive;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('admin_users').update({
        name: target.name,
        email: target.email,
        password: target.password,
        role: target.role,
        title: target.title,
        is_active: target.is_active,
      }).eq('id', input.id);
    } catch (e) {
      console.warn('Supabase updateAdminUser warning:', e);
    }
  }

  if (actor) {
    await recordAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'UPDATE',
      module: 'USER_ADMIN',
      targetId: target.id,
      targetName: target.name,
      details: `แก้ไขข้อมูลผู้ดูแลระบบ: ${target.name} (${target.email}) สิทธิ์: ${target.role} สถานะ: ${target.is_active ? 'ใช้งาน' : 'ระงับ'}`,
    });
  }

  return { success: true, data: { ...target } };
}

export async function toggleAdminUserActive(
  id: string,
  activeOrActor?: boolean | ActorInfo,
  actor?: ActorInfo
): Promise<{ success: boolean; data?: AdminUser; error?: string }> {
  const target = adminUsersStore.find((u) => u.id === id);
  if (!target) {
    return { success: false, error: 'ไม่พบบัญชีผู้ดูแลระบบที่ต้องการเปลี่ยนสถานะ' };
  }

  const actorInfo: ActorInfo | undefined =
    typeof activeOrActor === 'object' ? activeOrActor : actor;

  const newActiveState: boolean =
    typeof activeOrActor === 'boolean' ? activeOrActor : !target.is_active;

  // Prevent deactivating the last active superadmin
  if (!newActiveState && target.role === 'superadmin') {
    const activeSuperadmins = adminUsersStore.filter(
      (u) => u.role === 'superadmin' && u.is_active && u.id !== id
    );
    if (activeSuperadmins.length === 0) {
      return { success: false, error: 'ไม่สามารถระงับการใช้งาน Superadmin คนสุดท้ายของระบบได้' };
    }
  }

  target.is_active = newActiveState;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('admin_users').update({ is_active: newActiveState }).eq('id', id);
    } catch (e) {
      console.warn('Supabase toggleAdminUserActive warning:', e);
    }
  }

  if (actorInfo) {
    await recordAuditLog({
      actorId: actorInfo.id,
      actorName: actorInfo.name,
      actorEmail: actorInfo.email,
      actorRole: actorInfo.role,
      action: 'STATUS_CHANGE',
      module: 'USER_ADMIN',
      targetId: target.id,
      targetName: target.name,
      details: `เปลี่ยนสถานะผู้ดูแลระบบ: ${target.name} เป็น ${newActiveState ? 'เปิดใช้งาน' : 'ระงับใช้งาน'}`,
    });
  }

  return { success: true, data: { ...target } };
}

export async function deleteAdminUser(
  id: string,
  actor?: ActorInfo,
  options?: { force?: boolean }
): Promise<{ success: boolean; softDeleted?: boolean; message?: string; error?: string }> {
  const index = adminUsersStore.findIndex((u) => u.id === id);
  if (index === -1) {
    return { success: false, error: 'ไม่พบบัญชีผู้ดูแลระบบที่ต้องการลบ' };
  }

  const target = adminUsersStore[index];

  // Prevent deleting the last active superadmin
  if (target.role === 'superadmin') {
    const activeSuperadmins = adminUsersStore.filter(
      (u) => u.role === 'superadmin' && u.is_active && u.id !== id
    );
    if (activeSuperadmins.length === 0) {
      return { success: false, error: 'ไม่สามารถลบ Superadmin คนสุดท้ายของระบบได้' };
    }
  }

  // Prevent deleting currently logged-in actor themselves
  if (actor && actor.id === id) {
    return { success: false, error: 'ไม่สามารถลบบัญชีของตนเองที่กำลังใช้งานอยู่ได้' };
  }

  if (!options?.force) {
    target.is_active = false;
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('admin_users').update({ is_active: false }).eq('id', id);
      } catch (e) {
        console.warn('Supabase soft deleteAdminUser warning:', e);
      }
    }
    if (actor) {
      await recordAuditLog({
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'STATUS_CHANGE',
        module: 'USER_ADMIN',
        targetId: target.id,
        targetName: target.name,
        details: `ระงับการใช้งานผู้ดูแลระบบ (Soft Delete): ${target.name} (${target.email})`,
      });
    }

    return {
      success: true,
      softDeleted: true,
      message: `ระงับการใช้งานผู้ดูแลระบบ ${target.name} สำเร็จ (สามารถเปิดใช้งานใหม่ได้)`,
    };
  }

  adminUsersStore.splice(index, 1);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('admin_users').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase hard deleteAdminUser warning:', e);
    }
  }

  if (actor) {
    await recordAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'DELETE',
      module: 'USER_ADMIN',
      targetId: target.id,
      targetName: target.name,
      details: `ลบบัญชีผู้ดูแลระบบถาวร: ${target.name} (${target.email})`,
    });
  }

  return { success: true, softDeleted: false };
}
