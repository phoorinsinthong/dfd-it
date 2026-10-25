import { describe, it, expect, beforeEach } from 'vitest';
import {
  getChecklistTemplates,
  createChecklistTemplate,
  generateAnnualRoadmap,
  createAdhocChecklist,
  getChecklists,
  toggleChecklistItem,
  resetRoadmapStore,
} from '@/lib/services/roadmap-service';

describe('Ticket 07: Preventive Maintenance Roadmap & Checklist Seam', () => {
  beforeEach(() => {
    resetRoadmapStore();
  });

  describe('Checklist Templates', () => {
    it('provides standard default PM templates', async () => {
      const templates = await getChecklistTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(1);

      const serverTemplate = templates.find((t) => t.title.includes('Server'));
      expect(serverTemplate).toBeDefined();
      expect(serverTemplate?.items.length).toBeGreaterThan(0);
    });

    it('creates new custom template with reusable items', async () => {
      const res = await createChecklistTemplate({
        title: 'Townhall Event Checklist',
        description: 'การตรวจสอบระบบเสียงและจอภาพก่อนงานถ่ายทอดสดประจำไตรมาส',
        items: [
          'ทดสอบไมโครโฟนไร้สาย 4 ตัวและสำรองแบตเตอรี่',
          'ตรวจสอบสัญญาณภาพขึ้นจอ LED Main Stage',
          'ทดสอบระบบถ่ายทอดสด Zoom/Teams Live Stream',
        ],
      });

      expect(res.success).toBe(true);
      expect(res.data?.id).toBeDefined();
      expect(res.data?.items.length).toBe(3);
    });
  });

  describe('1-Click Annual Roadmap Generation (12 Months)', () => {
    it('generates 12 monthly scheduled checklists for target year from template', async () => {
      const templates = await getChecklistTemplates();
      const template = templates[0];

      const res = await generateAnnualRoadmap(template.id, 2026);
      expect(res.success).toBe(true);
      expect(res.createdCount).toBe(12);

      const checklists = await getChecklists(2026);
      expect(checklists.length).toBe(12);

      // Verify months 1 to 12
      const months = checklists.map((c) => c.target_month).sort((a, b) => (a || 0) - (b || 0));
      expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

      // Verify each checklist has the cloned items
      expect(checklists[0].items.length).toBe(template.items.length);
      expect(checklists[0].progress_percent).toBe(0);
    });
  });

  describe('Task Completion Accountability & Progress Calculation', () => {
    it('toggles task completion and accurately updates checklist progress percentage', async () => {
      const adhoc = await createAdhocChecklist({
        title: 'Office Network Migration',
        year: 2026,
        targetMonth: 3,
        items: ['สำรองข้อมูล Config Switch', 'เดินสาย LAN ชั้น 3', 'ทดสอบ Speedtest'],
      });

      expect(adhoc.success).toBe(true);
      const checklistId = adhoc.data!.id;
      const firstItemId = adhoc.data!.items[0].id;

      // Check item 1
      const toggleRes = await toggleChecklistItem(firstItemId, 'วิชัย ช่างไอที');
      expect(toggleRes.success).toBe(true);
      expect(toggleRes.item?.is_completed).toBe(true);
      expect(toggleRes.item?.completed_by).toBe('วิชัย ช่างไอที');
      expect(toggleRes.item?.completed_at).toBeDefined();

      // Check overall progress: 1 of 3 = 33%
      const updatedChecklists = await getChecklists(2026);
      const targetChecklist = updatedChecklists.find((c) => c.id === checklistId);
      expect(targetChecklist?.progress_percent).toBe(33);

      // Check remaining 2 items
      await toggleChecklistItem(adhoc.data!.items[1].id, 'วิชัย ช่างไอที');
      await toggleChecklistItem(adhoc.data!.items[2].id, 'วิชัย ช่างไอที');

      const fullCompleted = (await getChecklists(2026)).find((c) => c.id === checklistId);
      expect(fullCompleted?.progress_percent).toBe(100);
      expect(fullCompleted?.status).toBe('completed');
    });
  });
});
