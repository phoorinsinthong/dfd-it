import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDepartments,
  addDepartment,
  toggleDepartmentActive,
  getCategories,
  addCategory,
  toggleCategoryActive,
  resetMasterDataStore,
} from '@/lib/services/master-data-service';

describe('Master Data Service Seam (Departments & Categories)', () => {
  beforeEach(() => {
    resetMasterDataStore();
  });

  describe('Departments Management', () => {
    it('returns pre-seeded active departments by default', async () => {
      const departments = await getDepartments();
      expect(departments.length).toBeGreaterThan(0);
      expect(departments.every((d) => d.is_active)).toBe(true);
      expect(departments.some((d) => d.name.includes('IT Support'))).toBe(true);
    });

    it('adds a new department successfully and trims whitespace', async () => {
      const result = await addDepartment('  ฝ่ายวิจัยและพัฒนา (R&D)  ');
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('ฝ่ายวิจัยและพัฒนา (R&D)');
      expect(result.data?.is_active).toBe(true);

      const all = await getDepartments();
      expect(all.some((d) => d.name === 'ฝ่ายวิจัยและพัฒนา (R&D)')).toBe(true);
    });

    it('prevents adding duplicate department names', async () => {
      await addDepartment('ฝ่ายจัดซื้อ (Procurement)');
      const duplicate = await addDepartment('ฝ่ายจัดซื้อ (Procurement)');
      expect(duplicate.success).toBe(false);
      expect(duplicate.error).toMatch(/already exists/i);
    });

    it('toggles department active state, hiding inactive ones from default queries', async () => {
      const added = await addDepartment('แผนกทดสอบ');
      const deptId = added.data!.id;

      // Deactivate department
      const toggleRes = await toggleDepartmentActive(deptId, false);
      expect(toggleRes.success).toBe(true);

      // Default query only returns active departments
      const activeOnly = await getDepartments();
      expect(activeOnly.some((d) => d.id === deptId)).toBe(false);

      // Query with includeInactive=true includes it
      const all = await getDepartments({ includeInactive: true });
      const found = all.find((d) => d.id === deptId);
      expect(found).toBeDefined();
      expect(found?.is_active).toBe(false);
    });
  });

  describe('Problem Categories Management', () => {
    it('returns pre-seeded problem categories by default', async () => {
      const categories = await getCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories.some((c) => c.name.includes('Hardware'))).toBe(true);
      expect(categories.some((c) => c.name.includes('Software'))).toBe(true);
    });

    it('adds a new problem category successfully', async () => {
      const result = await addCategory('ระบบ ERP / SAP');
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('ระบบ ERP / SAP');
      expect(result.data?.is_active).toBe(true);

      const all = await getCategories();
      expect(all.some((c) => c.name === 'ระบบ ERP / SAP')).toBe(true);
    });

    it('toggles category active status and respects filter', async () => {
      const added = await addCategory('หมวดหมู่ชั่วคราว');
      const catId = added.data!.id;

      await toggleCategoryActive(catId, false);

      const activeOnly = await getCategories();
      expect(activeOnly.some((c) => c.id === catId)).toBe(false);

      const all = await getCategories({ includeInactive: true });
      expect(all.some((c) => c.id === catId && !c.is_active)).toBe(true);
    });
  });
});
