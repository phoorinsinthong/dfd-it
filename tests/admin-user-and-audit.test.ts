import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  toggleAdminUserActive,
  resetAdminUserStore,
} from '@/lib/services/admin-user-service';
import {
  recordAuditLog,
  getAuditLogs,
  resetAuditLogStore,
} from '@/lib/services/audit-log-service';
import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  borrowAsset,
  resetAssetStore,
} from '@/lib/services/asset-service';
import {
  getChecklists,
  generateAnnualRoadmap,
  updateMonthlyChecklist,
  deleteMonthlyChecklist,
  getChecklistTemplates,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  resetRoadmapStore,
} from '@/lib/services/roadmap-service';
import {
  generateMonthlyReport,
  saveReportSignature,
  clearReportSignature,
} from '@/lib/services/report-service';
import { authenticateStaff } from '@/lib/auth/auth-service';

describe('Admin Users, Superadmin, Audit Trail & CRUD Services', () => {
  beforeEach(() => {
    resetAdminUserStore();
    resetAuditLogStore();
    resetAssetStore();
    resetRoadmapStore();
  });

  describe('1. Superadmin & Admin User Management', () => {
    it('authenticates superadmin account with superadmin role', async () => {
      const res = await authenticateStaff({
        email: 'superadmin@company.local',
        password: 'SuperAdmin@2026!',
      });
      expect(res.success).toBe(true);
      expect(res.user?.role).toBe('superadmin');
      expect(res.user?.name).toBe('ผู้ดูแลระบบสูงสุด (Super Administrator)');
    });

    it('creates a new admin user with audit log', async () => {
      const actor = {
        id: 'admin-super-01',
        name: 'Superadmin',
        email: 'superadmin@company.local',
        role: 'superadmin',
      };

      const res = await createAdminUser(
        {
          name: 'นายช่างไอที ทดสอบ',
          email: 'test.it@company.local',
          password: 'Password123!',
          role: 'admin',
          title: 'เจ้าหน้าที่คอมพิวเตอร์',
        },
        actor
      );

      expect(res.success).toBe(true);
      expect(res.data?.email).toBe('test.it@company.local');

      const allUsers = await getAdminUsers();
      expect(allUsers.some((u) => u.email === 'test.it@company.local')).toBe(true);

      // Verify audit log
      const logs = await getAuditLogs({ module: 'USER_ADMIN' });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('CREATE');
      expect(logs[0].target_name).toBe('นายช่างไอที ทดสอบ');
    });

    it('updates an admin user details', async () => {
      const actor = {
        id: 'admin-super-01',
        name: 'Superadmin',
        email: 'superadmin@company.local',
        role: 'superadmin',
      };

      const updateRes = await updateAdminUser(
        {
          id: 'admin-std-01',
          name: 'นายสมเกียรติ สถิตย์สุข (ปรับปรุง)',
          title: 'หัวหน้างานบริการเทคนิค',
        },
        actor
      );

      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.name).toBe('นายสมเกียรติ สถิตย์สุข (ปรับปรุง)');
      expect(updateRes.data?.title).toBe('หัวหน้างานบริการเทคนิค');
    });

    it('toggles admin user active status', async () => {
      const actor = {
        id: 'admin-super-01',
        name: 'Superadmin',
        role: 'superadmin',
      };

      const res = await toggleAdminUserActive('admin-std-01', actor);
      expect(res.success).toBe(true);
      expect(res.data?.is_active).toBe(false);

      const res2 = await toggleAdminUserActive('admin-std-01', actor);
      expect(res2.success).toBe(true);
      expect(res2.data?.is_active).toBe(true);
    });

    it('prevents deactivating or deleting the last active superadmin', async () => {
      const actor = {
        id: 'admin-super-01',
        name: 'Superadmin',
        role: 'superadmin',
      };

      // Try to deactivate the single superadmin
      const toggleRes = await toggleAdminUserActive('admin-super-01', actor);
      expect(toggleRes.success).toBe(false);
      expect(toggleRes.error).toContain('Superadmin คนสุดท้าย');

      // Try to delete the single superadmin
      const deleteRes = await deleteAdminUser('admin-super-01', actor);
      expect(deleteRes.success).toBe(false);
      expect(deleteRes.error).toContain('ไม่สามารถลบ Superadmin คนสุดท้าย');
    });
  });

  describe('2. Audit Trail Engine', () => {
    it('records and filters audit logs accurately', async () => {
      await recordAuditLog({
        actorId: 'admin-std-01',
        actorName: 'Admin One',
        actorRole: 'admin',
        action: 'CREATE',
        module: 'ASSET',
        targetId: 'asset-100',
        targetName: 'Dell Laptop 5420',
        details: 'เพิ่มครุภัณฑ์ใหม่',
      });

      await recordAuditLog({
        actorId: 'admin-super-01',
        actorName: 'Super Admin',
        actorRole: 'superadmin',
        action: 'UPDATE',
        module: 'PM',
        targetId: 'chk-2026-10',
        targetName: 'แผนกักเก็บสำรองข้อมูล',
        details: 'ปรับปรุงรายการตรวจสอบ',
      });

      const assetLogs = await getAuditLogs({ module: 'ASSET' });
      expect(assetLogs.length).toBe(1);
      expect(assetLogs[0].target_name).toBe('Dell Laptop 5420');

      const pmLogs = await getAuditLogs({ module: 'PM' });
      expect(pmLogs.length).toBe(1);
      expect(pmLogs[0].action).toBe('UPDATE');

      const allLogs = await getAuditLogs();
      expect(allLogs.length).toBe(2);
    });
  });

  describe('3. Asset Management CRUD & Safe Delete', () => {
    const actor = {
      id: 'it-staff-1',
      name: 'สมเกียรติ',
      role: 'admin',
    };

    it('creates an asset and updates it', async () => {
      const createRes = await createAsset({
        assetCode: 'PROJ-TEST-001',
        name: '4K Laser Projector',
        category: 'Projector',
        actor,
      });
      expect(createRes.success).toBe(true);
      const assetId = createRes.data!.id;

      const updateRes = await updateAsset({
        assetId: assetId,
        name: '4K High-Lumens Laser Projector',
        status: 'maintenance',
        actor,
      });
      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.name).toBe('4K High-Lumens Laser Projector');
      expect(updateRes.data?.status).toBe('maintenance');
    });

    it('hard-deletes asset when it has no borrow history', async () => {
      const createRes = await createAsset({
        assetCode: 'HARD-DEL-001',
        name: 'Unused HDMI Cable',
        category: 'Cable',
        actor,
      });
      const assetId = createRes.data!.id;

      const delRes = await deleteAsset(assetId, actor);
      expect(delRes.success).toBe(true);
      expect(delRes.softDeleted).toBeFalsy();

      const remaining = await getAssets({ search: 'HARD-DEL-001' });
      expect(remaining.length).toBe(0);
    });

    it('rejects deletion if asset is currently borrowed', async () => {
      // asset-1 is initial asset
      await borrowAsset({
        assetId: 'asset-1',
        borrowerName: 'นายยืม ทดสอบ',
        borrowerDeptName: 'การเงิน',
        staffId: 'it-staff-1',
        expectedReturnDate: '2026-10-29',
        notes: 'ประชุมนอกสถานที่',
      });

      const delRes = await deleteAsset('asset-1', actor);
      expect(delRes.success).toBe(false);
      expect(delRes.error).toContain('ถูกยืม');
    });
  });

  describe('4. PM Roadmap & Checklist CRUD', () => {
    const actor = {
      id: 'admin-super-01',
      name: 'Super Admin',
      role: 'superadmin',
    };

    it('updates and deletes a monthly checklist', async () => {
      // Populate checklists using generateAnnualRoadmap
      await generateAnnualRoadmap('tpl-server-ups', 2026);
      const checklists = await getChecklists(2026);
      expect(checklists.length).toBeGreaterThan(0);
      const targetId = checklists[0].id;

      // Update checklist
      const updateRes = await updateMonthlyChecklist({
        checklistId: targetId,
        title: 'แผนบำรุงรักษาพิเศษประจำเดือนตุลาคม',
        periodLabel: 'Q4 Peak Season',
        items: ['ตรวจสอบ UPS ตัวที่ 1', 'ตรวจสอบระบบสำรองไฟฟ้าตู้ Server'],
        actor,
      });
      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.title).toBe('แผนบำรุงรักษาพิเศษประจำเดือนตุลาคม');
      expect(updateRes.data?.period_label).toBe('Q4 Peak Season');
      expect(updateRes.data?.items.length).toBe(2);

      // Delete checklist
      const delRes = await deleteMonthlyChecklist(targetId, actor);
      expect(delRes.success).toBe(true);

      const afterChecklists = await getChecklists(2026);
      expect(afterChecklists.some((c) => c.id === targetId)).toBe(false);
    });

    it('creates, updates, and deletes a checklist template', async () => {
      const createRes = await createChecklistTemplate({
        title: 'แม่แบบตรวจสภาพระบบ CCTV',
        description: 'ตรวจกล้องวงจรปิดรอบอาคาร 1-3',
        frequency: 'quarterly',
        items: ['เช็คไฟเลี้ยง PoE', 'ทำความสะอาดหน้าเลนส์', 'ทดสอบการบันทึก NVR'],
        actor,
      });
      expect(createRes.success).toBe(true);
      const templateId = createRes.data!.id;

      // Update template
      const updateRes = await updateChecklistTemplate({
        id: templateId,
        title: 'แม่แบบตรวจสภาพระบบ CCTV และ Access Control',
        items: ['เช็คไฟ PoE', 'เช็ค Door Lock'],
        actor,
      });
      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.title).toBe('แม่แบบตรวจสภาพระบบ CCTV และ Access Control');
      expect(updateRes.data?.items.length).toBe(2);

      // Delete template
      const delRes = await deleteChecklistTemplate(templateId, actor);
      expect(delRes.success).toBe(true);

      const templates = await getChecklistTemplates();
      expect(templates.some((t) => t.id === templateId)).toBe(false);
    });
  });

  describe('5. Monthly Report Signatures (Physical & Clear)', () => {
    const actor = {
      id: 'it-staff-1',
      name: 'นายสมชาย ไอที',
      role: 'admin',
    };

    it('saves a physical signature mode and renders signature properly', async () => {
      const signRes = await saveReportSignature({
        month: 10,
        year: 2026,
        staffName: 'นายสมชาย ไอที',
        staffTitle: 'นักวิชาการคอมพิวเตอร์ชำนาญการ',
        staffSignatureType: 'physical',
        actor,
      });
      expect(signRes.success).toBe(true);
      expect(signRes.data?.staff_name).toBe('นายสมชาย ไอที');
      expect(signRes.data?.staff_signature_type).toBe('physical');
      expect(signRes.data?.staff_signature).toBe('PHYSICAL_SIGN');

      const report = await generateMonthlyReport(10, 2026);
      expect(report.signature?.staff_name).toBe('นายสมชาย ไอที');
      expect(report.signature?.staff_signature_type).toBe('physical');
    });

    it('clears signature and records audit log', async () => {
      // First save signature
      await saveReportSignature({
        month: 10,
        year: 2026,
        supervisorName: 'นายผู้อำนวยการ ตรวจงาน',
        supervisorTitle: 'ผู้อำนวยการกลุ่มงาน IT',
        supervisorSignature: 'CERTIFIED:2026-10-28',
        supervisorSignatureType: 'typed',
        actor,
      });

      // Clear supervisor signature
      const clearRes = await clearReportSignature({
        month: 10,
        year: 2026,
        role: 'supervisor',
        actor,
      });
      expect(clearRes.success).toBe(true);

      const report = await generateMonthlyReport(10, 2026);
      expect(report.signature?.supervisor_signature).toBeUndefined();
      expect(report.signature?.supervisor_name).toBeUndefined();

      // Check audit log
      const logs = await getAuditLogs({ module: 'REPORT' });
      expect(logs.some((l) => l.action === 'CLEAR_SIGN')).toBe(true);
    });
  });
});
