import { Department, Category } from '@/types/database';

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'dept-1', name: 'ฝ่ายสนับสนุนเทคนิค (IT Support)', is_active: true },
  { id: 'dept-2', name: 'ฝ่ายทรัพยากรบุคคล (HR)', is_active: true },
  { id: 'dept-3', name: 'ฝ่ายบัญชีและการเงิน (Accounting & Finance)', is_active: true },
  { id: 'dept-4', name: 'ฝ่ายการตลาดและประชาสัมพันธ์ (Marketing & PR)', is_active: true },
  { id: 'dept-5', name: 'ฝ่ายปฏิบัติการ (Operations)', is_active: true },
  { id: 'dept-6', name: 'ฝ่ายบริหาร (Executive)', is_active: true },
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Hardware (คอมพิวเตอร์/จอ/อุปกรณ์ต่อพ่วง)', is_active: true },
  { id: 'cat-2', name: 'Software (โปรแกรม/Windows/Office)', is_active: true },
  { id: 'cat-3', name: 'Network (อินเทอร์เน็ต/Wi-Fi/LAN)', is_active: true },
  { id: 'cat-4', name: 'Printer & Scanner (เครื่องพิมพ์/หมึก)', is_active: true },
  { id: 'cat-5', name: 'CCTV & Access Control (กล้องวงจรปิด/ประตูคีย์การ์ด)', is_active: true },
  { id: 'cat-6', name: 'อื่นๆ (Other)', is_active: true },
];

// Active in-memory state
let departmentsStore: Department[] = JSON.parse(JSON.stringify(DEFAULT_DEPARTMENTS));
let categoriesStore: Category[] = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));

export function resetMasterDataStore() {
  departmentsStore = JSON.parse(JSON.stringify(DEFAULT_DEPARTMENTS));
  categoriesStore = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
}

// ==========================================
// Departments API
// ==========================================

export async function getDepartments(options?: { includeInactive?: boolean }): Promise<Department[]> {
  const includeInactive = options?.includeInactive ?? false;
  if (includeInactive) {
    return [...departmentsStore];
  }
  return departmentsStore.filter((d) => d.is_active);
}

export async function addDepartment(rawName: string): Promise<{ success: boolean; data?: Department; error?: string }> {
  const name = rawName?.trim();
  if (!name) {
    return { success: false, error: 'Department name is required' };
  }

  const exists = departmentsStore.some((d) => d.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return { success: false, error: 'Department name already exists' };
  }

  const newDept: Department = {
    id: `dept-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  departmentsStore.push(newDept);
  return { success: true, data: newDept };
}

export async function toggleDepartmentActive(id: string, is_active: boolean): Promise<{ success: boolean; error?: string }> {
  const dept = departmentsStore.find((d) => d.id === id);
  if (!dept) {
    return { success: false, error: 'Department not found' };
  }

  dept.is_active = is_active;
  return { success: true };
}

export async function updateDepartment(
  id: string,
  rawName: string
): Promise<{ success: boolean; data?: Department; error?: string }> {
  const dept = departmentsStore.find((d) => d.id === id);
  if (!dept) {
    return { success: false, error: 'Department not found' };
  }

  const name = rawName?.trim();
  if (!name) {
    return { success: false, error: 'Department name is required' };
  }

  const exists = departmentsStore.some((d) => d.id !== id && d.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return { success: false, error: 'Department name already exists' };
  }

  dept.name = name;
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

  categoriesStore.push(newCat);
  return { success: true, data: newCat };
}

export async function toggleCategoryActive(id: string, is_active: boolean): Promise<{ success: boolean; error?: string }> {
  const cat = categoriesStore.find((c) => c.id === id);
  if (!cat) {
    return { success: false, error: 'Category not found' };
  }

  cat.is_active = is_active;
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

  if (options?.force) {
    categoriesStore.splice(index, 1);
    return { success: true, softDeleted: false };
  }

  categoriesStore[index].is_active = false;
  return { success: true, softDeleted: true };
}
