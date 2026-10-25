import { ChecklistTemplate, ChecklistItem, Checklist } from '@/types/database';

export const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const INITIAL_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'tpl-server-ups',
    title: 'แผนบำรุงรักษา Server, Network & UPS ประจำเดือน',
    description: 'มาตรฐานการตรวจเช็คระบบแม่ข่าย เครือข่าย และระบบสำรองไฟของบริษัท',
    items: [
      'ตรวจเช็คอุณหภูมิห้อง Server และสถานะเครื่องปรับอากาศ (ไม่เกิน 22°C)',
      'ตรวจสอบไฟสถานะและทำความสะอาดฝุ่น Server Rack & Core Switch',
      'ทดสอบระบบสำรองไฟ UPS และแบตเตอรี่ฉุกเฉิน (UPS Self-Test)',
      'ตรวจสอบผลการสำรองข้อมูลรายวันและรายสัปดาห์ (Backup Log Verification)',
      'ตรวจสอบการอัปเดตระบบปฏิบัติการและ Security Patch ที่สำคัญ',
    ],
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-meeting-room-av',
    title: 'แผนตรวจเช็คอุปกรณ์ห้องประชุมและระบบ AV ประจำไตรมาส',
    description: 'ตรวจเช็คจอภาพ โปรเจคเตอร์ และระบบไมโครโฟนไร้สายทุกห้อง',
    items: [
      'ทดสอบสัญญาณภาพ HDMI / Type-C ทุกจุดเชื่อมต่อในห้องประชุม',
      'ทำความสะอาดตัวกรองฝุ่นและเลนส์โปรเจคเตอร์',
      'ตรวจเช็คระดับแบตเตอรี่ไมโครโฟนไร้สายและทำความสะอาดหัวไมค์',
      'ทดสอบความคมชัดของกล้องและไมค์ห้องประชุม Zoom/Teams Room',
    ],
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

let templatesStore: ChecklistTemplate[] = [...INITIAL_TEMPLATES];
let checklistsStore: Checklist[] = [];

export function resetRoadmapStore() {
  templatesStore = INITIAL_TEMPLATES.map((t) => ({ ...t, items: [...t.items] }));
  checklistsStore = [];
}

export async function getChecklistTemplates(): Promise<ChecklistTemplate[]> {
  return [...templatesStore];
}

export async function getChecklistTemplateById(id: string): Promise<ChecklistTemplate | null> {
  const found = templatesStore.find((t) => t.id === id);
  return found ? { ...found } : null;
}

export interface CreateChecklistTemplateInput {
  title: string;
  description?: string;
  items: string[];
}

export async function createChecklistTemplate(
  input: CreateChecklistTemplateInput
): Promise<{ success: boolean; data?: ChecklistTemplate; error?: string }> {
  if (!input.title?.trim() || !input.items || input.items.length === 0) {
    return { success: false, error: 'Title and at least one item are required' };
  }

  const newTemplate: ChecklistTemplate = {
    id: `tpl-${Date.now().toString().slice(-6)}`,
    title: input.title.trim(),
    description: input.description?.trim(),
    items: input.items.map((i) => i.trim()).filter(Boolean),
    created_at: new Date().toISOString(),
  };

  templatesStore.push(newTemplate);
  return { success: true, data: newTemplate };
}

export async function generateAnnualRoadmap(
  templateId: string,
  year: number
): Promise<{ success: boolean; createdCount: number; data?: Checklist[]; error?: string }> {
  const template = await getChecklistTemplateById(templateId);
  if (!template) {
    return { success: false, createdCount: 0, error: 'Template not found' };
  }

  const createdChecklists: Checklist[] = [];

  for (let month = 1; month <= 12; month++) {
    const monthName = THAI_MONTH_NAMES[month - 1];
    const checklistId = `chk-${year}-${month.toString().padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    const items: ChecklistItem[] = template.items.map((taskName, idx) => ({
      id: `${checklistId}-item-${idx + 1}`,
      checklist_id: checklistId,
      task_name: taskName,
      is_completed: false,
    }));

    const checklist: Checklist = {
      id: checklistId,
      title: `[${monthName} ${year}] ${template.title}`,
      year,
      target_month: month,
      type: 'annual',
      status: 'pending',
      items,
      progress_percent: 0,
      created_at: new Date().toISOString(),
    };

    checklistsStore.push(checklist);
    createdChecklists.push(checklist);
  }

  return {
    success: true,
    createdCount: createdChecklists.length,
    data: createdChecklists,
  };
}

export interface CreateAdhocChecklistInput {
  title: string;
  year: number;
  targetMonth?: number;
  items: string[];
}

export async function createAdhocChecklist(
  input: CreateAdhocChecklistInput
): Promise<{ success: boolean; data?: Checklist; error?: string }> {
  if (!input.title?.trim() || !input.items || input.items.length === 0) {
    return { success: false, error: 'Title and at least one item are required' };
  }

  const checklistId = `adhoc-${Date.now().toString().slice(-6)}`;
  const items: ChecklistItem[] = input.items.map((taskName, idx) => ({
    id: `${checklistId}-item-${idx + 1}`,
    checklist_id: checklistId,
    task_name: taskName.trim(),
    is_completed: false,
  }));

  const newChecklist: Checklist = {
    id: checklistId,
    title: input.title.trim(),
    year: input.year,
    target_month: input.targetMonth,
    type: 'adhoc',
    status: 'pending',
    items,
    progress_percent: 0,
    created_at: new Date().toISOString(),
  };

  checklistsStore.unshift(newChecklist);
  return { success: true, data: newChecklist };
}

export async function getChecklists(year?: number): Promise<Checklist[]> {
  const filtered = year ? checklistsStore.filter((c) => c.year === year) : [...checklistsStore];

  return filtered.map((c) => {
    const total = c.items.length;
    const completed = c.items.filter((i) => i.is_completed).length;
    const progress_percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    let status: 'pending' | 'in_progress' | 'completed' = 'pending';
    if (progress_percent === 100) {
      status = 'completed';
    } else if (progress_percent > 0) {
      status = 'in_progress';
    }

    return {
      ...c,
      status,
      progress_percent,
    };
  });
}

export async function toggleChecklistItem(
  itemId: string,
  staffName: string
): Promise<{ success: boolean; item?: ChecklistItem; error?: string }> {
  for (const checklist of checklistsStore) {
    const item = checklist.items.find((i) => i.id === itemId);
    if (item) {
      item.is_completed = !item.is_completed;
      if (item.is_completed) {
        item.completed_by = staffName;
        item.completed_at = new Date().toISOString();
      } else {
        item.completed_by = undefined;
        item.completed_at = undefined;
      }
      return { success: true, item: { ...item } };
    }
  }

  return { success: false, error: 'Checklist item not found' };
}
