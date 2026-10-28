import { Division, Department, Category } from '@/types/database';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const DEFAULT_DIVISIONS: Division[] = [
  { id: 'div-1', name: 'กองการเงิน (Financial Division)', is_active: true },
  { id: 'div-2', name: 'สำนักบริหารกลาง (Central Administration Bureau)', is_active: true },
  { id: 'div-3', name: 'กองการเจ้าหน้าที่ (Human Resources Division)', is_active: true },
  { id: 'div-4', name: 'ศูนย์เทคโนโลยีสารสนเทศ (IT & Digital Center)', is_active: true },
  { id: 'div-5', name: 'กองยุทธศาสตร์และแผนงาน (Strategy & Planning Division)', is_active: true },
];

export const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: 'dept-1',
    name: 'ฝ่ายบัญชี (Accounting Section)',
    division_id: 'div-1',
    division_name: 'กองการเงิน (Financial Division)',
    building: 'อาคาร 1',
    floor: 'ชั้น 3',
    room: 'ห้อง 301',
    is_active: true,
  },
  {
    id: 'dept-2',
    name: 'ฝ่ายการเงินและพัสดุ (Finance & Procurement)',
    division_id: 'div-1',
    division_name: 'กองการเงิน (Financial Division)',
    building: 'อาคาร 1',
    floor: 'ชั้น 3',
    room: 'ห้อง 302',
    is_active: true,
  },
  {
    id: 'dept-3',
    name: 'ฝ่ายสารบรรณและธุรการ (General Administration)',
    division_id: 'div-2',
    division_name: 'สำนักบริหารกลาง (Central Administration Bureau)',
    building: 'อาคาร 1',
    floor: 'ชั้น 1',
    room: 'ห้อง 101',
    is_active: true,
  },
  {
    id: 'dept-4',
    name: 'ฝ่ายยานพาหนะและอาคารสถานที่ (Facilities & Vehicles)',
    division_id: 'div-2',
    division_name: 'สำนักบริหารกลาง (Central Administration Bureau)',
    building: 'อาคาร 1',
    floor: 'ชั้น 1',
    room: 'ห้อง 105',
    is_active: true,
  },
  {
    id: 'dept-5',
    name: 'ฝ่ายสรรหาและบรรจุแต่งตั้ง (Talent Acquisition)',
    division_id: 'div-3',
    division_name: 'กองการเจ้าหน้าที่ (Human Resources Division)',
    building: 'อาคาร 2',
    floor: 'ชั้น 2',
    room: 'ห้อง 201',
    is_active: true,
  },
  {
    id: 'dept-6',
    name: 'ฝ่ายพัฒนาบุคลากรและสวัสดิการ (Talent Development)',
    division_id: 'div-3',
    division_name: 'กองการเจ้าหน้าที่ (Human Resources Division)',
    building: 'อาคาร 2',
    floor: 'ชั้น 2',
    room: 'ห้อง 203',
    is_active: true,
  },
  {
    id: 'dept-7',
    name: 'ฝ่ายสนับสนุนเทคนิคและบริการ (IT Support & Service)',
    division_id: 'div-4',
    division_name: 'ศูนย์เทคโนโลยีสารสนเทศ (IT & Digital Center)',
    building: 'อาคาร 1',
    floor: 'ชั้น 2',
    room: 'ห้อง 204',
    is_active: true,
  },
  {
    id: 'dept-8',
    name: 'ฝ่ายพัฒนาระบบสารสนเทศ (Software Development)',
    division_id: 'div-4',
    division_name: 'ศูนย์เทคโนโลยีสารสนเทศ (IT & Digital Center)',
    building: 'อาคาร 1',
    floor: 'ชั้น 2',
    room: 'ห้อง 206',
    is_active: true,
  },
  {
    id: 'dept-9',
    name: 'ฝ่ายแผนงานและงบประมาณ (Planning & Budgeting)',
    division_id: 'div-5',
    division_name: 'กองยุทธศาสตร์และแผนงาน (Strategy & Planning Division)',
    building: 'อาคาร 2',
    floor: 'ชั้น 4',
    room: 'ห้อง 401',
    is_active: true,
  },
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Hardware (คอมพิวเตอร์/จอ/อุปกรณ์ต่อพ่วง)', is_active: true },
  { id: 'cat-2', name: 'Software (โปรแกรม/Windows/Office)', is_active: true },
  { id: 'cat-3', name: 'Network (อินเทอร์เน็ต/Wi-Fi/LAN)', is_active: true },
  { id: 'cat-4', name: 'Printer & Scanner (เครื่องพิมพ์/หมึก)', is_active: true },
  { id: 'cat-5', name: 'CCTV & Access Control (กล้องวงจรปิด/ประตูคีย์การ์ด)', is_active: true },
  { id: 'cat-6', name: 'อื่นๆ (Other)', is_active: true },
];

// Active in-memory state
let divisionsStore: Division[] = JSON.parse(JSON.stringify(DEFAULT_DIVISIONS));
let departmentsStore: Department[] = JSON.parse(JSON.stringify(DEFAULT_DEPARTMENTS));
let categoriesStore: Category[] = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));

export function resetMasterDataStore() {
  divisionsStore = JSON.parse(JSON.stringify(DEFAULT_DIVISIONS));
  departmentsStore = JSON.parse(JSON.stringify(DEFAULT_DEPARTMENTS));
  categoriesStore = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
}

// ==========================================
// Divisions API
// ==========================================

export async function getDivisions(options?: { includeInactive?: boolean }): Promise<Division[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('divisions').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        divisionsStore = data.map((d: { id: string; name: string; is_active: boolean | null; created_at?: string }) => ({
          id: d.id,
          name: d.name,
          is_active: d.is_active ?? true,
          created_at: d.created_at,
        }));
      }
    } catch (e) {
      console.warn('Supabase getDivisions warning:', e);
    }
  }

  const includeInactive = options?.includeInactive ?? false;
  if (includeInactive) {
    return [...divisionsStore];
  }
  return divisionsStore.filter((d) => d.is_active);
}

export async function addDivision(rawName: string): Promise<{ success: boolean; data?: Division; error?: string }> {
  const name = rawName?.trim();
  if (!name) {
    return { success: false, error: 'Division name is required' };
  }

  const exists = divisionsStore.some((d) => d.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return { success: false, error: 'Division name already exists' };
  }

  const newDiv: Division = {
    id: `div-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('divisions').insert({ name, is_active: true }).select().single();
      if (!error && data) {
        newDiv.id = data.id;
        newDiv.created_at = data.created_at;
      }
    } catch (e) {
      console.warn('Supabase addDivision warning:', e);
    }
  }

  divisionsStore.push(newDiv);
  return { success: true, data: newDiv };
}

export async function updateDivision(
  id: string,
  rawName: string
): Promise<{ success: boolean; data?: Division; error?: string }> {
  const div = divisionsStore.find((d) => d.id === id);
  if (!div) {
    return { success: false, error: 'Division not found' };
  }

  const name = rawName?.trim();
  if (!name) {
    return { success: false, error: 'Division name is required' };
  }

  const exists = divisionsStore.some((d) => d.id !== id && d.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return { success: false, error: 'Division name already exists' };
  }

  div.name = name;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('divisions').update({ name }).eq('id', id);
    } catch (e) {
      console.warn('Supabase updateDivision warning:', e);
    }
  }

  // Also update division_name in associated departments
  departmentsStore.forEach((dept) => {
    if (dept.division_id === id) {
      dept.division_name = name;
    }
  });

  return { success: true, data: { ...div } };
}

export async function deleteDivision(
  id: string,
  options?: { force?: boolean }
): Promise<{ success: boolean; softDeleted?: boolean; error?: string }> {
  const index = divisionsStore.findIndex((d) => d.id === id);
  if (index === -1) {
    return { success: false, error: 'Division not found' };
  }

  if (isSupabaseConfigured()) {
    try {
      if (options?.force) {
        await supabase.from('divisions').delete().eq('id', id);
      } else {
        await supabase.from('divisions').update({ is_active: false }).eq('id', id);
      }
    } catch (e) {
      console.warn('Supabase deleteDivision warning:', e);
    }
  }

  if (options?.force) {
    divisionsStore.splice(index, 1);
    // Unlink departments
    departmentsStore.forEach((dept) => {
      if (dept.division_id === id) {
        dept.division_id = undefined;
        dept.division_name = undefined;
      }
    });
    return { success: true, softDeleted: false };
  }

  divisionsStore[index].is_active = false;
  return { success: true, softDeleted: true };
}

export async function toggleDivisionActive(id: string, is_active: boolean): Promise<{ success: boolean; error?: string }> {
  const div = divisionsStore.find((d) => d.id === id);
  if (!div) {
    return { success: false, error: 'Division not found' };
  }

  div.is_active = is_active;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('divisions').update({ is_active }).eq('id', id);
    } catch (e) {
      console.warn('Supabase toggleDivisionActive warning:', e);
    }
  }

  return { success: true };
}

// ==========================================
// Departments API
// ==========================================

export interface AddDepartmentInput {
  name: string;
  divisionId?: string;
  building?: string;
  floor?: string;
  room?: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  divisionId?: string;
  building?: string;
  floor?: string;
  room?: string;
  is_active?: boolean;
}

export async function getDepartments(options?: { divisionId?: string; includeInactive?: boolean }): Promise<Department[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('departments').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        departmentsStore = data.map((d: {
          id: string;
          name: string;
          division_id?: string | null;
          division_name?: string | null;
          building?: string | null;
          floor?: string | null;
          room?: string | null;
          is_active?: boolean | null;
          created_at?: string;
        }) => ({
          id: d.id,
          name: d.name,
          division_id: d.division_id || undefined,
          division_name: d.division_name || undefined,
          building: d.building || undefined,
          floor: d.floor || undefined,
          room: d.room || undefined,
          is_active: d.is_active ?? true,
          created_at: d.created_at,
        }));
      }
    } catch (e) {
      console.warn('Supabase getDepartments warning:', e);
    }
  }

  const includeInactive = options?.includeInactive ?? false;
  let result = includeInactive ? [...departmentsStore] : departmentsStore.filter((d) => d.is_active);

  if (options?.divisionId) {
    result = result.filter((d) => d.division_id === options.divisionId);
  }

  return result;
}

export async function addDepartment(
  input: string | AddDepartmentInput
): Promise<{ success: boolean; data?: Department; error?: string }> {
  const rawName = typeof input === 'string' ? input : input.name;
  const name = rawName?.trim();
  if (!name) {
    return { success: false, error: 'Department name is required' };
  }

  const divisionId = typeof input === 'object' ? input.divisionId : undefined;
  const building = typeof input === 'object' ? input.building?.trim() : undefined;
  const floor = typeof input === 'object' ? input.floor?.trim() : undefined;
  const room = typeof input === 'object' ? input.room?.trim() : undefined;

  let divisionName: string | undefined;
  if (divisionId) {
    const parentDiv = divisionsStore.find((d) => d.id === divisionId);
    if (parentDiv) divisionName = parentDiv.name;
  }

  const exists = departmentsStore.some((d) => d.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return { success: false, error: 'Department name already exists' };
  }

  const newDept: Department = {
    id: `dept-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    division_id: divisionId,
    division_name: divisionName,
    building,
    floor,
    room,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('departments').insert({
        name,
        division_id: divisionId,
        division_name: divisionName,
        building,
        floor,
        room,
        is_active: true,
      }).select().single();
      if (!error && data) {
        newDept.id = data.id;
        newDept.created_at = data.created_at;
      }
    } catch (e) {
      console.warn('Supabase addDepartment warning:', e);
    }
  }

  departmentsStore.push(newDept);
  return { success: true, data: newDept };
}

export async function toggleDepartmentActive(id: string, is_active: boolean): Promise<{ success: boolean; error?: string }> {
  const dept = departmentsStore.find((d) => d.id === id);
  if (!dept) {
    return { success: false, error: 'Department not found' };
  }

  dept.is_active = is_active;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('departments').update({ is_active }).eq('id', id);
    } catch (e) {
      console.warn('Supabase toggleDepartmentActive warning:', e);
    }
  }

  return { success: true };
}

export async function updateDepartment(
  id: string,
  input: string | UpdateDepartmentInput
): Promise<{ success: boolean; data?: Department; error?: string }> {
  const dept = departmentsStore.find((d) => d.id === id);
  if (!dept) {
    return { success: false, error: 'Department not found' };
  }

  const rawName = typeof input === 'string' ? input : input.name;
  if (rawName !== undefined) {
    const name = rawName.trim();
    if (!name) {
      return { success: false, error: 'Department name is required' };
    }
    const exists = departmentsStore.some((d) => d.id !== id && d.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      return { success: false, error: 'Department name already exists' };
    }
    dept.name = name;
  }

  if (typeof input === 'object') {
    if (input.divisionId !== undefined) {
      dept.division_id = input.divisionId || undefined;
      const parentDiv = divisionsStore.find((d) => d.id === input.divisionId);
      dept.division_name = parentDiv ? parentDiv.name : undefined;
    }
    if (input.building !== undefined) dept.building = input.building.trim() || undefined;
    if (input.floor !== undefined) dept.floor = input.floor.trim() || undefined;
    if (input.room !== undefined) dept.room = input.room.trim() || undefined;
    if (input.is_active !== undefined) dept.is_active = input.is_active;
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('departments').update({
        name: dept.name,
        division_id: dept.division_id,
        division_name: dept.division_name,
        building: dept.building,
        floor: dept.floor,
        room: dept.room,
        is_active: dept.is_active,
      }).eq('id', id);
    } catch (e) {
      console.warn('Supabase updateDepartment warning:', e);
    }
  }

  return { success: true, data: { ...dept } };
}

export async function deleteDepartment(
  id: string,
  options?: { force?: boolean }
): Promise<{ success: boolean; softDeleted?: boolean; error?: string }> {
  const index = departmentsStore.findIndex((d) => d.id === id);
  if (index === -1) {
    return { success: false, error: 'Department not found' };
  }

  if (isSupabaseConfigured()) {
    try {
      if (options?.force) {
        await supabase.from('departments').delete().eq('id', id);
      } else {
        await supabase.from('departments').update({ is_active: false }).eq('id', id);
      }
    } catch (e) {
      console.warn('Supabase deleteDepartment warning:', e);
    }
  }

  if (options?.force) {
    departmentsStore.splice(index, 1);
    return { success: true, softDeleted: false };
  }

  departmentsStore[index].is_active = false;
  return { success: true, softDeleted: true };
}

// ==========================================
// Categories API
// ==========================================

export async function getCategories(options?: { includeInactive?: boolean }): Promise<Category[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        categoriesStore = data.map((c: { id: string; name: string; is_active: boolean | null; created_at?: string }) => ({
          id: c.id,
          name: c.name,
          is_active: c.is_active ?? true,
          created_at: c.created_at,
        }));
      }
    } catch (e) {
      console.warn('Supabase getCategories warning:', e);
    }
  }

  const includeInactive = options?.includeInactive ?? false;
  if (includeInactive) {
    return [...categoriesStore];
  }
  return categoriesStore.filter((c) => c.is_active);
}

export async function addCategory(rawName: string): Promise<{ success: boolean; data?: Category; error?: string }> {
  const name = rawName?.trim();
  if (!name) {
    return { success: false, error: 'Category name is required' };
  }

  const exists = categoriesStore.some((c) => c.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return { success: false, error: 'Category name already exists' };
  }

  const newCat: Category = {
    id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('categories').insert({ name, is_active: true }).select().single();
      if (!error && data) {
        newCat.id = data.id;
        newCat.created_at = data.created_at;
      }
    } catch (e) {
      console.warn('Supabase addCategory warning:', e);
    }
  }

  categoriesStore.push(newCat);
  return { success: true, data: newCat };
}

export async function toggleCategoryActive(id: string, is_active: boolean): Promise<{ success: boolean; error?: string }> {
  const cat = categoriesStore.find((c) => c.id === id);
  if (!cat) {
    return { success: false, error: 'Category not found' };
  }

  cat.is_active = is_active;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('categories').update({ is_active }).eq('id', id);
    } catch (e) {
      console.warn('Supabase toggleCategoryActive warning:', e);
    }
  }

  return { success: true };
}

export async function updateCategory(
  id: string,
  rawName: string
): Promise<{ success: boolean; data?: Category; error?: string }> {
  const cat = categoriesStore.find((c) => c.id === id);
  if (!cat) {
    return { success: false, error: 'Category not found' };
  }

  const name = rawName?.trim();
  if (!name) {
    return { success: false, error: 'Category name is required' };
  }

  const exists = categoriesStore.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return { success: false, error: 'Category name already exists' };
  }

  cat.name = name;

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('categories').update({ name }).eq('id', id);
    } catch (e) {
      console.warn('Supabase updateCategory warning:', e);
    }
  }

  return { success: true, data: { ...cat } };
}

export async function deleteCategory(
  id: string,
  options?: { force?: boolean }
): Promise<{ success: boolean; softDeleted?: boolean; error?: string }> {
  const index = categoriesStore.findIndex((c) => c.id === id);
  if (index === -1) {
    return { success: false, error: 'Category not found' };
  }

  if (isSupabaseConfigured()) {
    try {
      if (options?.force) {
        await supabase.from('categories').delete().eq('id', id);
      } else {
        await supabase.from('categories').update({ is_active: false }).eq('id', id);
      }
    } catch (e) {
      console.warn('Supabase deleteCategory warning:', e);
    }
  }

  if (options?.force) {
    categoriesStore.splice(index, 1);
    return { success: true, softDeleted: false };
  }

  categoriesStore[index].is_active = false;
  return { success: true, softDeleted: true };
}
