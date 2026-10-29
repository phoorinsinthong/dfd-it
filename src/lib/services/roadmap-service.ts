import { ChecklistTemplate, ChecklistItem, Checklist } from '@/types/database';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const INITIAL_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'tpl-server-ups',
    title: 'แผนบำรุงรักษา Server, Network & UPS ประจำเดือน',
    description: 'มาตรฐานการตรวจเช็คระบบแม่ข่าย เครือข่าย และระบบสำรองไฟของบริษัท',
    frequency: 'monthly',
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
    frequency: 'quarterly',
    scheduled_months: [3, 6, 9, 12],
    period_label: 'รายไตรมาส (มี.ค., มิ.ย., ก.ย., ธ.ค.)',
    items: [
      'ทดสอบสัญญาณภาพ HDMI / Type-C ทุกจุดเชื่อมต่อในห้องประชุม',
      'ทำความสะอาดตัวกรองฝุ่นและเลนส์โปรเจคเตอร์',
      'ตรวจเช็คระดับแบตเตอรี่ไมโครโฟนไร้สายและทำความสะอาดหัวไมค์',
      'ทดสอบความคมชัดของกล้องและไมค์ห้องประชุม Zoom/Teams Room',
    ],
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-q4-preventive',
    title: 'แผนบำรุงรักษาและตรวจนับครุภัณฑ์ประจำช่วงสิ้นปี (ต.ค. - ธ.ค.)',
    description: 'ตรวจนับสภาพครุภัณฑ์ไอที ทำความสะอาดใหญ่ และจัดทำแผนทดแทนประจำไตรมาส 4',
    frequency: 'custom_range',
    scheduled_months: [10, 11, 12],
    period_label: 'ต.ค. - ธ.ค.',
    items: [
      'ตรวจนับและติดแท็ก QR Code ครุภัณฑ์ไอทีทุกแผนก',
      'ตรวจเช็คสภาพเครื่องสำรองไฟและแบตเตอรี่ฉุกเฉินประจำปี',
      'ทำความสะอาดเป่าฝุ่น PC/Workstation และห้อง Server ประจำปี',
      'สรุปรายการอุปกรณ์ที่ชำรุดและเตรียมแผนจัดซื้อทดแทนปีถัดไป',
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
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) {
        if (data.length > 0) {
          templatesStore = data as ChecklistTemplate[];
        } else {
          // If Supabase table has 0 templates, seed initial templates so they persist and are editable/deletable
          for (const t of INITIAL_TEMPLATES) {
            await supabase.from('checklist_templates').upsert({
              id: t.id,
              title: t.title,
              description: t.description,
              frequency: t.frequency,
              scheduled_months: t.scheduled_months,
              period_label: t.period_label,
              items: t.items,
            }, { onConflict: 'id' });
          }
        }
      }
    } catch (e) {
      console.warn('Supabase getChecklistTemplates warning:', e);
    }
  }
  return [...templatesStore];
}

export async function getChecklistTemplateById(id: string): Promise<ChecklistTemplate | null> {
  const found = templatesStore.find((t) => t.id === id);
  if (found) return { ...found };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) {
        return data as ChecklistTemplate;
      }
    } catch (e) {
      console.warn('Supabase getChecklistTemplateById warning:', e);
    }
  }

  return null;
}

export interface CreateChecklistTemplateInput {
  title: string;
  description?: string;
  frequency?: 'monthly' | 'quarterly' | 'annually' | 'custom_range';
  scheduledMonths?: number[];
  periodLabel?: string;
  items: string[];
  actor?: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
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
    frequency: input.frequency || 'monthly',
    scheduled_months: input.scheduledMonths,
    period_label: input.periodLabel,
    items: input.items.map((i) => i.trim()).filter(Boolean),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('checklist_templates').insert({
        id: newTemplate.id,
        title: newTemplate.title,
        description: newTemplate.description,
        frequency: newTemplate.frequency,
        scheduled_months: newTemplate.scheduled_months,
        period_label: newTemplate.period_label,
        items: newTemplate.items,
      }).select().single();
      if (!error && data) {
        newTemplate.id = data.id;
        newTemplate.created_at = data.created_at;
      }
    } catch (e) {
      console.warn('Supabase createChecklistTemplate warning:', e);
    }
  }

  templatesStore.push(newTemplate);

  if (input.actor) {
    const { recordAuditLog } = await import('./audit-log-service');
    await recordAuditLog({
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorEmail: input.actor.email,
      actorRole: input.actor.role,
      action: 'CREATE',
      module: 'PM',
      targetId: newTemplate.id,
      targetName: newTemplate.title,
      details: `สร้างแม่แบบแผนบำรุงรักษา PM: ${newTemplate.title}`,
    });
  }

  return { success: true, data: newTemplate };
}

export interface UpdateChecklistTemplateInput {
  id: string;
  title?: string;
  description?: string;
  frequency?: 'monthly' | 'quarterly' | 'annually' | 'custom_range';
  scheduledMonths?: number[];
  periodLabel?: string;
  items?: string[];
  actor?: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
}

export async function updateChecklistTemplate(
  inputOrId: string | UpdateChecklistTemplateInput,
  maybeInput?: Omit<UpdateChecklistTemplateInput, 'id'>
): Promise<{ success: boolean; data?: ChecklistTemplate; error?: string }> {
  const input: UpdateChecklistTemplateInput =
    typeof inputOrId === 'string'
      ? { id: inputOrId, ...(maybeInput || {}) }
      : inputOrId;

  const target = templatesStore.find((t) => t.id === input.id);
  if (!target) {
    return { success: false, error: 'ไม่พบแม่แบบแผนงานที่ต้องการแก้ไข' };
  }

  if (input.title) target.title = input.title.trim();
  if (input.description !== undefined) target.description = input.description.trim();
  if (input.frequency) target.frequency = input.frequency;
  if (input.scheduledMonths !== undefined) target.scheduled_months = input.scheduledMonths;
  if (input.periodLabel !== undefined) target.period_label = input.periodLabel;
  if (input.items && input.items.length > 0) {
    target.items = input.items.map((i) => i.trim()).filter(Boolean);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('checklist_templates').upsert({
        id: target.id,
        title: target.title,
        description: target.description,
        frequency: target.frequency,
        scheduled_months: target.scheduled_months,
        period_label: target.period_label,
        items: target.items,
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('Supabase updateChecklistTemplate warning:', e);
    }
  }

  if (input.actor) {
    const { recordAuditLog } = await import('./audit-log-service');
    await recordAuditLog({
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorEmail: input.actor.email,
      actorRole: input.actor.role,
      action: 'UPDATE',
      module: 'PM',
      targetId: target.id,
      targetName: target.title,
      details: `แก้ไขแม่แบบแผนงาน PM: ${target.title}`,
    });
  }

  return { success: true, data: { ...target } };
}

export async function deleteChecklistTemplate(
  templateId: string,
  actor?: { id: string; name: string; email?: string; role: string }
): Promise<{ success: boolean; error?: string }> {
  const targetIdx = templatesStore.findIndex((t) => t.id === templateId);
  if (targetIdx === -1) {
    return { success: false, error: 'ไม่พบแม่แบบแผนงานที่ต้องการลบ' };
  }

  const target = templatesStore[targetIdx];
  templatesStore.splice(targetIdx, 1);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('checklist_templates').delete().eq('id', templateId);
    } catch (e) {
      console.warn('Supabase deleteChecklistTemplate warning:', e);
    }
  }

  if (actor) {
    const { recordAuditLog } = await import('./audit-log-service');
    await recordAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'DELETE',
      module: 'PM',
      targetId: target.id,
      targetName: target.title,
      details: `ลบแม่แบบแผนงาน PM: ${target.title}`,
    });
  }

  return { success: true };
}

export interface GenerateAnnualRoadmapOptions {
  months?: number[];
  startMonth?: number;
  endMonth?: number;
  periodLabel?: string;
}

export async function generateAnnualRoadmap(
  templateId: string,
  year: number,
  options?: GenerateAnnualRoadmapOptions
): Promise<{ success: boolean; createdCount: number; data?: Checklist[]; error?: string }> {
  const template = await getChecklistTemplateById(templateId);
  if (!template) {
    return { success: false, createdCount: 0, error: 'Template not found' };
  }

  let targetMonths: number[] = [];

  if (options?.months && options.months.length > 0) {
    targetMonths = options.months;
  } else if (options?.startMonth && options?.endMonth) {
    const start = Math.min(options.startMonth, options.endMonth);
    const end = Math.max(options.startMonth, options.endMonth);
    for (let m = start; m <= end; m++) {
      targetMonths.push(m);
    }
  } else if (template.scheduled_months && template.scheduled_months.length > 0) {
    targetMonths = template.scheduled_months;
  } else if (template.frequency === 'quarterly') {
    targetMonths = [3, 6, 9, 12];
  } else {
    targetMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }

  const periodLabel = options?.periodLabel || template.period_label;
  const createdChecklists: Checklist[] = [];

  for (const month of targetMonths) {
    const monthName = THAI_MONTH_NAMES[month - 1] || `เดือน ${month}`;
    const checklistId = `chk-${year}-${month.toString().padStart(2, '0')}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).slice(2, 5)}`;

    const items: ChecklistItem[] = template.items.map((taskName, idx) => ({
      id: `${checklistId}-item-${idx + 1}`,
      checklist_id: checklistId,
      task_name: taskName,
      is_completed: false,
    }));

    const titleSuffix = periodLabel ? ` (${periodLabel})` : '';

    const checklist: Checklist = {
      id: checklistId,
      title: `[${monthName} ${year}] ${template.title}${titleSuffix}`,
      year,
      target_month: month,
      period_label: periodLabel,
      type: 'annual',
      status: 'pending',
      items,
      progress_percent: 0,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('checklists').insert({
          id: checklist.id,
          title: checklist.title,
          year: checklist.year,
          target_month: checklist.target_month,
          period_label: checklist.period_label,
          type: checklist.type,
          status: checklist.status,
          items: checklist.items,
          progress_percent: checklist.progress_percent,
        });
      } catch (e) {
        console.warn('Supabase generateAnnualRoadmap item warning:', e);
      }
    }

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

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('checklists').insert({
        id: newChecklist.id,
        title: newChecklist.title,
        year: newChecklist.year,
        target_month: newChecklist.target_month,
        type: newChecklist.type,
        status: newChecklist.status,
        items: newChecklist.items,
        progress_percent: newChecklist.progress_percent,
      });
    } catch (e) {
      console.warn('Supabase createAdhocChecklist warning:', e);
    }
  }

  checklistsStore.unshift(newChecklist);
  return { success: true, data: newChecklist };
}

export async function getChecklists(year?: number): Promise<Checklist[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('checklists').select('*').order('created_at', { ascending: true });
      if (year) {
        query = query.eq('year', year);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        checklistsStore = data as Checklist[];
      }
    } catch (e) {
      console.warn('Supabase getChecklists warning:', e);
    }
  }

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

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('checklists').update({
            items: checklist.items,
          }).eq('id', checklist.id);
        } catch (e) {
          console.warn('Supabase toggleChecklistItem warning:', e);
        }
      }

      return { success: true, item: { ...item } };
    }
  }

  return { success: false, error: 'Checklist item not found' };
}

export interface UpdateMonthlyChecklistInput {
  checklistId: string;
  title?: string;
  targetMonth?: number;
  periodLabel?: string;
  items?: string[];
  actor?: { id: string; name: string; email?: string; role: string };
}

export async function updateMonthlyChecklist(
  input: UpdateMonthlyChecklistInput
): Promise<{ success: boolean; data?: Checklist; error?: string }> {
  const target = checklistsStore.find((c) => c.id === input.checklistId);
  if (!target) {
    return { success: false, error: 'ไม่พบรายการแผนงานที่ต้องการแก้ไข' };
  }

  if (input.title !== undefined && input.title.trim()) {
    target.title = input.title.trim();
  }
  if (input.targetMonth !== undefined) {
    target.target_month = input.targetMonth;
  }
  if (input.periodLabel !== undefined) {
    target.period_label = input.periodLabel;
  }

  if (input.items && input.items.length > 0) {
    const cleanItems = input.items.map((i) => i.trim()).filter(Boolean);
    target.items = cleanItems.map((taskName, idx) => {
      const existing = target.items.find((i) => i.task_name === taskName);
      if (existing) {
        return existing;
      }
      return {
        id: `${target.id}-item-${Date.now().toString().slice(-4)}-${idx + 1}`,
        checklist_id: target.id,
        task_name: taskName,
        is_completed: false,
      };
    });
  }

  const total = target.items.length;
  const completed = target.items.filter((i) => i.is_completed).length;
  target.progress_percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  if (target.progress_percent === 100) {
    target.status = 'completed';
  } else if (target.progress_percent > 0) {
    target.status = 'in_progress';
  } else {
    target.status = 'pending';
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('checklists').update({
        title: target.title,
        target_month: target.target_month,
        period_label: target.period_label,
        items: target.items,
        status: target.status,
        progress_percent: target.progress_percent,
      }).eq('id', input.checklistId);
    } catch (e) {
      console.warn('Supabase updateMonthlyChecklist warning:', e);
    }
  }

  if (input.actor) {
    const { recordAuditLog } = await import('./audit-log-service');
    await recordAuditLog({
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorEmail: input.actor.email,
      actorRole: input.actor.role,
      action: 'UPDATE',
      module: 'PM',
      targetId: target.id,
      targetName: target.title,
      details: `แก้ไขรายการแผนงาน PM ประจำเดือน: ${target.title}`,
    });
  }

  return { success: true, data: { ...target } };
}

export async function deleteMonthlyChecklist(
  checklistId: string,
  actor?: { id: string; name: string; email?: string; role: string }
): Promise<{ success: boolean; error?: string }> {
  const targetIdx = checklistsStore.findIndex((c) => c.id === checklistId);
  if (targetIdx === -1) {
    return { success: false, error: 'ไม่พบรายการแผนงานที่ต้องการลบ' };
  }

  const target = checklistsStore[targetIdx];
  checklistsStore.splice(targetIdx, 1);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('checklists').delete().eq('id', checklistId);
    } catch (e) {
      console.warn('Supabase deleteMonthlyChecklist warning:', e);
    }
  }

  if (actor) {
    const { recordAuditLog } = await import('./audit-log-service');
    await recordAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'DELETE',
      module: 'PM',
      targetId: target.id,
      targetName: target.title,
      details: `ลบรายการแผนงาน PM ประจำเดือน: ${target.title}`,
    });
  }

  return { success: true };
}
