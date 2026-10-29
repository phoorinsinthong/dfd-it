import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDivisions,
  addDivision,
  updateDivision,
  deleteDivision,
  toggleDivisionActive,
  getDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  toggleDepartmentActive,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryActive,
  resetMasterDataStore,
} from '@/lib/services/master-data-service';

describe('Master Data Service Seam (Divisions, Departments & Categories)', () => {
  beforeEach(() => {
    resetMasterDataStore();
  });

  describe('Divisions Management', () => {
    it('returns pre-seeded active divisions by default', async () => {
      const divisions = await getDivisions();
      expect(divisions.length).toBeGreaterThan(0);
      expect(divisions.every((d) => d.is_active)).toBe(true);
      expect(divisions.some((d) => d.name.includes('กองการเงิน'))).toBe(true);
    });

    it('adds a new division and trims whitespace', async () => {
      const res = await addDivision('  กองนวัตกรรมดิจิทัล  ');
      expect(res.success).toBe(true);
      expect(res.data?.name).toBe('กองนวัตกรรมดิจิทัล');

      const all = await getDivisions();
      expect(all.some((d) => d.name === 'กองนวัตกรรมดิจิทัล')).toBe(true);
    });

    it('prevents duplicate division names', async () => {
      const dup = await addDivision('กองการเงิน (Financial Division)');
      expect(dup.success).toBe(false);
      expect(dup.error).toMatch(/already exists/i);
    });

    it('updates division name and propagates to child departments', async () => {
      const divs = await getDivisions();
      const div1 = divs.find((d) => d.name.includes('กองการเงิน'))!;

      const res = await updateDivision(div1.id, 'กองการเงินและการคลัง');
      expect(res.success).toBe(true);
      expect(res.data?.name).toBe('กองการเงินและการคลัง');

      const depts = await getDepartments({ divisionId: div1.id });
      expect(depts.every((d) => d.division_name === 'กองการเงินและการคลัง')).toBe(true);
    });

    it('toggles division active state and deletes safely', async () => {
      const added = await addDivision('กองทดสอบลบ');
      const divId = added.data!.id;

      await toggleDivisionActive(divId, false);
      const activeDivs = await getDivisions();
      expect(activeDivs.some((d) => d.id === divId)).toBe(false);

      const delRes = await deleteDivision(divId, { force: true });
      expect(delRes.success).toBe(true);
      const allDivs = await getDivisions({ includeInactive: true });
      expect(allDivs.some((d) => d.id === divId)).toBe(false);
    });
  });

  describe('Departments Management with Location Hierarchy', () => {
    it('returns pre-seeded active departments with division and location fields', async () => {
      const departments = await getDepartments();
      expect(departments.length).toBeGreaterThan(0);
      expect(departments.every((d) => d.is_active)).toBe(true);
      
      const acctDept = departments.find((d) => d.name.includes('ฝ่ายบัญชี'));
      expect(acctDept).toBeDefined();
      expect(acctDept?.building).toBe('อาคาร 1');
      expect(acctDept?.floor).toBe('ชั้น 3');
      expect(acctDept?.room).toBe('ห้อง 301');
      expect(acctDept?.division_name).toContain('กองการเงิน');
    });

    it('adds a new department with division and location attributes', async () => {
      const divs = await getDivisions();
      const targetDiv = divs[0];

      const result = await addDepartment({
        name: 'ฝ่ายตรวจสอบภายใน',
        divisionId: targetDiv.id,
        building: 'อาคาร 2',
        floor: 'ชั้น 5',
        room: 'ห้อง 501',
      });
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('ฝ่ายตรวจสอบภายใน');
      expect(result.data?.division_id).toBe(targetDiv.id);
      expect(result.data?.division_name).toBe(targetDiv.name);
      expect(result.data?.building).toBe('อาคาร 2');
      expect(result.data?.floor).toBe('ชั้น 5');
      expect(result.data?.room).toBe('ห้อง 501');

      const filtered = await getDepartments({ divisionId: targetDiv.id });
      expect(filtered.some((d) => d.name === 'ฝ่ายตรวจสอบภายใน')).toBe(true);
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

      const all = await getDepartments({ includeInactive: true });
      const found = all.find((d) => d.id === deptId);
      expect(found).toBeDefined();
      expect(found?.is_active).toBe(false);
    });

    it('updates department name and location and prevents duplicate name collision', async () => {
      const added = await addDepartment('แผนกบัญชี 2');
      const deptId = added.data!.id;

      const updated = await updateDepartment(deptId, {
        name: 'ฝ่ายบัญชีพิเศษ (Special Account)',
        building: 'อาคาร 1',
        floor: 'ชั้น 4',
        room: 'ห้อง 402',
      });
      expect(updated.success).toBe(true);
      expect(updated.data?.name).toBe('ฝ่ายบัญชีพิเศษ (Special Account)');
      expect(updated.data?.floor).toBe('ชั้น 4');

      // Attempt collision with existing name
      const collision = await updateDepartment(deptId, 'ฝ่ายบัญชี (Accounting Section)');
      expect(collision.success).toBe(false);
      expect(collision.error).toMatch(/already exists/i);
    });

    it('deletes department safely or with force', async () => {
      const added = await addDepartment('แผนกลบ');
      const deptId = added.data!.id;

      // Soft delete
      const delRes = await deleteDepartment(deptId);
      expect(delRes.success).toBe(true);
      expect(delRes.softDeleted).toBe(true);

      const activeOnly = await getDepartments();
      expect(activeOnly.some((d) => d.id === deptId)).toBe(false);

      // Force delete
      const forceRes = await deleteDepartment(deptId, { force: true });
      expect(forceRes.success).toBe(true);

      const allAfterForce = await getDepartments({ includeInactive: true });
      expect(allAfterForce.some((d) => d.id === deptId)).toBe(false);
    });

    it('changes parent division and supports unlinking division with null', async () => {
      const divs = await getDivisions();
      const div1 = divs[0];
      const div2 = divs[1];

      const added = await addDepartment({
        name: 'ฝ่ายงานแผนใหม่',
        divisionId: div1.id,
      });
      expect(added.data?.division_id).toBe(div1.id);
      expect(added.data?.division_name).toBe(div1.name);

      // Change to div2
      const updatedToDiv2 = await updateDepartment(added.data!.id, {
        divisionId: div2.id,
      });
      expect(updatedToDiv2.success).toBe(true);
      expect(updatedToDiv2.data?.division_id).toBe(div2.id);
      expect(updatedToDiv2.data?.division_name).toBe(div2.name);

      // Unlink division with null
      const unlinked = await updateDepartment(added.data!.id, {
        divisionId: null,
      });
      expect(unlinked.success).toBe(true);
      expect(unlinked.data?.division_id).toBeUndefined();
      expect(unlinked.data?.division_name).toBeUndefined();
    });
  });

  describe('Categories Management', () => {
    it('returns pre-seeded active problem categories', async () => {
      const categories = await getCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories.some((c) => c.name.includes('Hardware'))).toBe(true);
    });

    it('adds new problem category successfully', async () => {
      const result = await addCategory('Email & Webmail');
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Email & Webmail');

      const all = await getCategories();
      expect(all.some((c) => c.name === 'Email & Webmail')).toBe(true);
    });

    it('toggles category active state', async () => {
      const added = await addCategory('หมวดหมู่ชั่วคราว');
      const catId = added.data!.id;

      await toggleCategoryActive(catId, false);
      const activeOnly = await getCategories();
      expect(activeOnly.some((c) => c.id === catId)).toBe(false);
    });

    it('updates category name and prevents collision', async () => {
      const added = await addCategory('Printer หมึกหมด');
      const catId = added.data!.id;

      const updated = await updateCategory(catId, 'Printer & Plotter');
      expect(updated.success).toBe(true);
      expect(updated.data?.name).toBe('Printer & Plotter');

      const collision = await updateCategory(catId, 'Hardware (คอมพิวเตอร์/จอ/อุปกรณ์ต่อพ่วง)');
      expect(collision.success).toBe(false);
      expect(collision.error).toMatch(/already exists/i);
    });

    it('deletes category safely and with force', async () => {
      const added = await addCategory('หมวดลบ');
      const catId = added.data!.id;

      const delRes = await deleteCategory(catId);
      expect(delRes.success).toBe(true);
      expect(delRes.softDeleted).toBe(true);

      const forceRes = await deleteCategory(catId, { force: true });
      expect(forceRes.success).toBe(true);

      const all = await getCategories({ includeInactive: true });
      expect(all.some((c) => c.id === catId)).toBe(false);
    });
  });
});
