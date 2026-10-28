import { AdminUser } from '@/types/database';
import { recordAuditLog } from './audit-log-service';

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
  return adminUsersStore.map((u) => ({ ...u }));
}

export async function getAdminUserByEmail(email: string): Promise<AdminUser | null> {
  const emailLower = email.trim().toLowerCase();
  const found = adminUsersStore.find((u) => u.email.toLowerCase() === emailLower);
  return found ? { ...found } : null;
}

export async function getAdminUserById(id: string): Promise<AdminUser | null> {
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
    const otherSuperadmins = adminUsersStore.filter(
      (u) => u.role === 'superadmin' && u.is_active && u.id !== input.id
    );
    if (otherSuperadmins.length === 0) {
      return { success: false, error: 'ไม่สามารถระงับการใช้งาน Superadmin คนสุดท้ายของระบบได้' };
    }
  }

  if (input.name) target.name = input.name.trim();
  if (input.email) {
    const emailLower = input.email.trim().toLowerCase();
    const collision = adminUsersStore.some((u) => u.id !== input.id && u.email.toLowerCase() === emailLower);
    if (collision) {
      return { success: false, error: `อีเมล ${emailLower} ซ้ำกับผู้ใช้อื่น` };
    }
    target.email = emailLower;
  }
  if (input.password && input.password.trim()) {
    target.password = input.password.trim();
  }
  if (input.role) target.role = input.role;
  if (input.title !== undefined) target.title = input.title.trim();
  if (input.isActive !== undefined) target.is_active = input.isActive;

  // Record audit log
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
      details: `แก้ไขข้อมูลผู้ดูแลระบบ: ${target.name} (${target.email}) สิทธิ์: ${target.role}`,
    });
  }

  return { success: true, data: { ...target } };
}

export async function deleteAdminUser(
  adminId: string,
  actor?: ActorInfo
): Promise<{ success: boolean; error?: string }> {
  const targetIdx = adminUsersStore.findIndex((u) => u.id === adminId);
  if (targetIdx === -1) {
    return { success: false, error: 'ไม่พบบัญชีผู้ดูแลระบบที่ต้องการลบ' };
  }

  const target = adminUsersStore[targetIdx];

  // Prevent deleting the last active superadmin
  if (target.role === 'superadmin') {
    const otherSuperadmins = adminUsersStore.filter(
      (u) => u.role === 'superadmin' && u.id !== adminId
    );
    if (otherSuperadmins.length === 0) {
      return { success: false, error: 'ไม่สามารถลบ Superadmin คนสุดท้ายของระบบได้' };
    }
  }

  adminUsersStore.splice(targetIdx, 1);

  // Record audit log
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
      details: `ลบบัญชีผู้ดูแลระบบ: ${target.name} (${target.email})`,
    });
  }

  return { success: true };
}

export async function toggleAdminUserActive(
  adminId: string,
  isActive?: boolean | ActorInfo,
  actor?: ActorInfo
): Promise<{ success: boolean; data?: AdminUser; error?: string }> {
  const target = adminUsersStore.find((u) => u.id === adminId);
  if (!target) {
    return { success: false, error: 'ไม่พบบัญชีผู้ดูแลระบบที่ต้องการแก้ไข' };
  }

  let newActiveState: boolean;
  let currentActor: ActorInfo | undefined;

  if (typeof isActive === 'boolean') {
    newActiveState = isActive;
    currentActor = actor;
  } else {
    newActiveState = !target.is_active;
    currentActor = isActive as ActorInfo | undefined;
  }

  return updateAdminUser({ id: adminId, isActive: newActiveState }, currentActor);
}
