import { MonthlyReportSummary, ReportSignature } from '@/types/database';
import { getAllTickets } from './ticket-service';
import { getAllBookings } from './booking-service';
import { getAllBorrowLogs } from './asset-service';
import { getChecklists, THAI_MONTH_NAMES } from './roadmap-service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

let signaturesStore: ReportSignature[] = [];

export function resetReportStore() {
  signaturesStore = [];
}

export async function generateMonthlyReport(
  month: number,
  year: number
): Promise<MonthlyReportSummary> {
  const [tickets, bookings, loans, checklists] = await Promise.all([
    getAllTickets(),
    getAllBookings(),
    getAllBorrowLogs(),
    getChecklists(year),
  ]);

  // 1. Filter Tickets in target month/year
  const monthTickets = tickets.filter((t) => {
    const d = new Date(t.created_at);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const totalTickets = monthTickets.length;
  const resolvedTickets = monthTickets.filter((t) => t.status === 'resolved').length;
  const pendingTickets = monthTickets.filter((t) => t.status === 'pending').length;
  const inProgressTickets = monthTickets.filter((t) => t.status === 'in_progress').length;
  const cancelledTickets = monthTickets.filter((t) => t.status === 'cancelled').length;
  const resolutionRate = totalTickets === 0 ? 100 : Math.round((resolvedTickets / totalTickets) * 100);

  const byCategory: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};

  monthTickets.forEach((t) => {
    const cat = t.category_name || 'ทั่วไป';
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    const dept = t.department_name || 'ไม่ระบุแผนก';
    byDepartment[dept] = (byDepartment[dept] || 0) + 1;
  });

  // 2. Filter Bookings in target month/year
  const monthBookings = bookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    const d = new Date(b.start_time);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const totalBookings = monthBookings.length;
  const onsiteBookings = monthBookings.filter((b) => b.room_type === 'onsite').length;
  const onlineBookings = monthBookings.filter((b) => b.room_type === 'online').length;

  const byRoom: Record<string, number> = {};
  monthBookings.forEach((b) => {
    const roomName = b.room_name || 'ห้องประชุม';
    byRoom[roomName] = (byRoom[roomName] || 0) + 1;
  });

  // 3. Filter Asset Loans in target month/year
  const monthLoans = loans.filter((l) => {
    const d = new Date(l.borrow_date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const totalLoans = monthLoans.length;
  const returnedLoans = monthLoans.filter((l) => Boolean(l.actual_return_date)).length;
  const activeLoans = monthLoans.filter((l) => !l.actual_return_date && !l.is_overdue).length;
  const overdueLoans = monthLoans.filter((l) => !l.actual_return_date && l.is_overdue).length;

  // 4. Filter PM Checklists for target month/year
  const monthChecklists = checklists.filter((c) => {
    if (c.year !== year) return false;
    if (c.target_month && c.target_month === month) return true;
    if (c.scheduled_months && c.scheduled_months.includes(month)) return true;
    return false;
  });

  const totalChecklists = monthChecklists.length;
  const completedChecklists = monthChecklists.filter((c) => c.status === 'completed').length;
  const pmCompletionRate = totalChecklists === 0 ? 100 : Math.round((completedChecklists / totalChecklists) * 100);

  // 5. Signature for target month
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();
      if (!error && data) {
        const idx = signaturesStore.findIndex((s) => s.month === month && s.year === year);
        const sig: ReportSignature = {
          id: data.id,
          month: data.month,
          year: data.year,
          staff_signature: data.staff_signature || undefined,
          staff_name: data.staff_name || undefined,
          staff_title: data.staff_title || undefined,
          staff_signature_type: data.staff_signature_type || undefined,
          supervisor_signature: data.supervisor_signature || undefined,
          supervisor_name: data.supervisor_name || undefined,
          supervisor_title: data.supervisor_title || undefined,
          supervisor_signature_type: data.supervisor_signature_type || undefined,
          signed_at: data.signed_at || data.created_at,
        };
        if (idx !== -1) {
          signaturesStore[idx] = sig;
        } else {
          signaturesStore.push(sig);
        }
      }
    } catch (e) {
      console.warn('Supabase get report signature warning:', e);
    }
  }

  const signature = signaturesStore.find((s) => s.month === month && s.year === year);

  return {
    month,
    year,
    ticketStats: {
      total: totalTickets,
      resolved: resolvedTickets,
      pending: pendingTickets,
      inProgress: inProgressTickets,
      cancelled: cancelledTickets,
      resolutionRate,
      byCategory,
      byDepartment,
    },
    bookingStats: {
      total: totalBookings,
      onsite: onsiteBookings,
      online: onlineBookings,
      byRoom,
    },
    assetStats: {
      totalLoans,
      returned: returnedLoans,
      active: activeLoans,
      overdue: overdueLoans,
    },
    pmStats: {
      totalChecklists,
      completedChecklists,
      completionRate: pmCompletionRate,
    },
    signature,
  };
}

export interface SaveReportSignatureInput {
  month: number;
  year: number;
  staffSignature?: string;
  staffName?: string;
  staffTitle?: string;
  staffSignatureType?: 'drawn' | 'typed' | 'physical';
  supervisorSignature?: string;
  supervisorName?: string;
  supervisorTitle?: string;
  supervisorSignatureType?: 'drawn' | 'typed' | 'physical';
  actor?: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
}

export async function saveReportSignature(
  input: SaveReportSignatureInput
): Promise<{ success: boolean; data?: ReportSignature; error?: string }> {
  const existing = signaturesStore.find((s) => s.month === input.month && s.year === input.year);

  const staffSig = input.staffSignature !== undefined
    ? input.staffSignature
    : (input.staffSignatureType === 'physical' ? 'PHYSICAL_SIGN' : existing?.staff_signature);

  const supervisorSig = input.supervisorSignature !== undefined
    ? input.supervisorSignature
    : (input.supervisorSignatureType === 'physical' ? 'PHYSICAL_SIGN' : existing?.supervisor_signature);

  const updatedSig: ReportSignature = existing
    ? {
        ...existing,
        staff_signature: staffSig,
        staff_name: input.staffName !== undefined ? input.staffName : existing.staff_name,
        staff_title: input.staffTitle !== undefined ? input.staffTitle : existing.staff_title,
        staff_signature_type: input.staffSignatureType !== undefined ? input.staffSignatureType : existing.staff_signature_type,
        supervisor_signature: supervisorSig,
        supervisor_name: input.supervisorName !== undefined ? input.supervisorName : existing.supervisor_name,
        supervisor_title: input.supervisorTitle !== undefined ? input.supervisorTitle : existing.supervisor_title,
        supervisor_signature_type: input.supervisorSignatureType !== undefined ? input.supervisorSignatureType : existing.supervisor_signature_type,
        signed_at: new Date().toISOString(),
      }
    : {
        id: `sig-${input.year}-${input.month}`,
        month: input.month,
        year: input.year,
        staff_signature: staffSig,
        staff_name: input.staffName,
        staff_title: input.staffTitle,
        staff_signature_type: input.staffSignatureType || 'drawn',
        supervisor_signature: supervisorSig,
        supervisor_name: input.supervisorName,
        supervisor_title: input.supervisorTitle,
        supervisor_signature_type: input.supervisorSignatureType || 'drawn',
        signed_at: new Date().toISOString(),
      };

  if (existing) {
    const idx = signaturesStore.findIndex((s) => s.month === input.month && s.year === input.year);
    signaturesStore[idx] = updatedSig;
  } else {
    signaturesStore.push(updatedSig);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('reports').upsert({
        month: updatedSig.month,
        year: updatedSig.year,
        staff_signature: updatedSig.staff_signature,
        staff_name: updatedSig.staff_name,
        staff_title: updatedSig.staff_title,
        staff_signature_type: updatedSig.staff_signature_type,
        supervisor_signature: updatedSig.supervisor_signature,
        supervisor_name: updatedSig.supervisor_name,
        supervisor_title: updatedSig.supervisor_title,
        supervisor_signature_type: updatedSig.supervisor_signature_type,
        signed_at: updatedSig.signed_at,
      }, { onConflict: 'month,year' });
    } catch (e) {
      console.warn('Supabase saveReportSignature warning:', e);
    }
  }

  // Audit Log
  if (input.actor) {
    const { recordAuditLog } = await import('./audit-log-service');
    await recordAuditLog({
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorEmail: input.actor.email,
      actorRole: input.actor.role,
      action: 'SIGN',
      module: 'REPORT',
      targetId: updatedSig.id,
      targetName: `รายงานประจำเดือน ${input.month}/${input.year}`,
      details: `ลงนามรับรองรายงานประจำเดือน ${input.month}/${input.year}`,
    });
  }

  return { success: true, data: updatedSig };
}

export interface ClearReportSignatureInput {
  month: number;
  year: number;
  role: 'staff' | 'supervisor' | 'all';
  actor?: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
}

export async function clearReportSignature(
  input: ClearReportSignatureInput
): Promise<{ success: boolean; data?: ReportSignature; error?: string }> {
  const existing = signaturesStore.find((s) => s.month === input.month && s.year === input.year);
  if (!existing) {
    return { success: false, error: 'ไม่พบข้อมูลลายเซ็นในรายงานเดือนที่ระบุ' };
  }

  if (input.role === 'staff' || input.role === 'all') {
    existing.staff_signature = undefined;
    existing.staff_name = undefined;
    existing.staff_title = undefined;
    existing.staff_signature_type = undefined;
  }

  if (input.role === 'supervisor' || input.role === 'all') {
    existing.supervisor_signature = undefined;
    existing.supervisor_name = undefined;
    existing.supervisor_title = undefined;
    existing.supervisor_signature_type = undefined;
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('reports').update({
        staff_signature: existing.staff_signature || null,
        staff_name: existing.staff_name || null,
        staff_title: existing.staff_title || null,
        staff_signature_type: existing.staff_signature_type || null,
        supervisor_signature: existing.supervisor_signature || null,
        supervisor_name: existing.supervisor_name || null,
        supervisor_title: existing.supervisor_title || null,
        supervisor_signature_type: existing.supervisor_signature_type || null,
      }).eq('month', input.month).eq('year', input.year);
    } catch (e) {
      console.warn('Supabase clearReportSignature warning:', e);
    }
  }

  // Audit Log
  if (input.actor) {
    const { recordAuditLog } = await import('./audit-log-service');
    await recordAuditLog({
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorEmail: input.actor.email,
      actorRole: input.actor.role,
      action: 'CLEAR_SIGN',
      module: 'REPORT',
      targetId: existing.id,
      targetName: `รายงานประจำเดือน ${input.month}/${input.year}`,
      details: `ลบลายเซ็นรับรอง (${input.role}) ออกจากรายงานประจำเดือน ${input.month}/${input.year}`,
    });
  }

  return { success: true, data: { ...existing } };
}

export function generateReportCsv(report: MonthlyReportSummary): string {
  const monthName = THAI_MONTH_NAMES[report.month - 1] || `Month ${report.month}`;
  const lines: string[] = [];

  // UTF-8 BOM
  const bom = '\uFEFF';

  lines.push(`IT Support Monthly Executive Summary - รายงานสรุปผลงานแผนกสนับสนุนเทคนิค`);
  lines.push(`ประจำเดือน: ${monthName} ${report.year}`);
  lines.push(`วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}`);
  lines.push('');

  // Section 1: KPI
  lines.push('--- ตัวชี้วัดสำคัญ (Key Performance Indicators) ---');
  lines.push('ตัวชี้วัด,จำนวน,หน่วย');
  lines.push(`งานแจ้งซ่อมทั้งหมด,${report.ticketStats.total},รายการ`);
  lines.push(`แก้ไขสำเร็จแล้ว,${report.ticketStats.resolved},รายการ`);
  lines.push(`อัตราการแก้ไขปัญหาสำเร็จ,${report.ticketStats.resolutionRate},%`);
  lines.push(`การจองห้องประชุมและบัญชีออนไลน์,${report.bookingStats.total},ครั้ง`);
  lines.push(`การยืม-คืนอุปกรณ์และครุภัณฑ์,${report.assetStats.totalLoans},รายการ`);
  lines.push(`อัตราความสำเร็จแผนบำรุงรักษา PM,${report.pmStats.completionRate},%`);
  lines.push('');

  // Section 2: Ticket Categories
  lines.push('--- สถิติงานแจ้งซ่อมตามประเภทปัญหา (Tickets by Category) ---');
  lines.push('ประเภทปัญหา,จำนวนงาน (รายการ)');
  Object.entries(report.ticketStats.byCategory).forEach(([cat, count]) => {
    lines.push(`"${cat}",${count}`);
  });
  lines.push('');

  // Section 3: Ticket Departments
  lines.push('--- สถิติงานแจ้งซ่อมตามแผนก (Tickets by Department) ---');
  lines.push('แผนกผู้แจ้ง,จำนวนงาน (รายการ)');
  Object.entries(report.ticketStats.byDepartment).forEach(([dept, count]) => {
    lines.push(`"${dept}",${count}`);
  });
  lines.push('');

  // Section 4: Meeting Rooms
  lines.push('--- สถิติการใช้งานห้องประชุมและบัญชีออนไลน์ (Booking by Room) ---');
  lines.push('ห้องประชุม / บัญชีออนไลน์,จำนวนครั้งที่ใช้งาน');
  Object.entries(report.bookingStats.byRoom).forEach(([room, count]) => {
    lines.push(`"${room}",${count}`);
  });
  lines.push('');

  // Section 5: Signatures
  lines.push('--- การลงนามรับรองรายงาน (Signatures) ---');
  lines.push(`เจ้าหน้าที่ไอทีผู้จัดทำ,${report.signature?.staff_name || 'ยังไม่ลงนาม'},ตำแหน่ง,${report.signature?.staff_title || '-'}`);
  lines.push(`ผู้ตรวจรับรองรายงาน,${report.signature?.supervisor_name || 'ยังไม่ลงนาม'},ตำแหน่ง,${report.signature?.supervisor_title || '-'}`);
  lines.push(`วัน-เวลาที่ลงนาม,${report.signature?.signed_at ? new Date(report.signature.signed_at).toLocaleString('th-TH') : '-'}`);

  return bom + lines.join('\n');
}

export async function getMonthlyTickets(month: number, year: number) {
  const all = await getAllTickets();
  return all.filter((t) => {
    const d = new Date(t.created_at);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });
}

export function generateDetailedTicketsCsv(tickets: import('@/types/database').Ticket[], month: number, year: number): string {
  const monthName = THAI_MONTH_NAMES[month - 1] || `Month ${month}`;
  const bom = '\uFEFF';
  const lines: string[] = [];

  lines.push(`รายงานรายละเอียดรายการแจ้งซ่อมประจำเดือน ${monthName} ${year}`);
  lines.push(`วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}`);
  lines.push('');
  lines.push('ลำดับ,รหัสตั๋ว,วันที่แจ้ง,ผู้แจ้ง,รหัสพนักงาน,กองงาน,แผนก,อาคาร/ชั้น/ห้อง,จุดระบุตำแหน่ง,หมวดหมู่ปัญหา,หัวข้อปัญหา,รายละเอียดอาการ,ความเร่งด่วน,สถานะ,ผู้รับผิดชอบ,วิธีแก้ไขปัญหา');

  const filtered = tickets.filter((t) => {
    const d = new Date(t.created_at);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  filtered.forEach((t, index) => {
    const locParts = [t.building, t.floor, t.room].filter(Boolean).join(' ');
    const urgencyMap: Record<string, string> = { low: 'ปกติ', medium: 'ปานกลาง', high: 'สูง', urgent: 'เร่งด่วนที่สุด' };
    const statusMap: Record<string, string> = { pending: 'รอดำเนินการ', in_progress: 'กำลังดำเนินการ', resolved: 'แก้ไขเสร็จสิ้น', cancelled: 'ยกเลิก' };

    lines.push([
      index + 1,
      `"${t.id}"`,
      `"${new Date(t.created_at).toLocaleString('th-TH')}"`,
      `"${t.user_name || '-'}"`,
      `"${t.user_employee_id || '-'}"`,
      `"${t.division_name || '-'}"`,
      `"${t.department_name || '-'}"`,
      `"${locParts || t.location || '-'}"`,
      `"${t.location_note || '-'}"`,
      `"${t.category_name || '-'}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${urgencyMap[t.urgency || 'low'] || t.urgency}"`,
      `"${statusMap[t.status] || t.status}"`,
      `"${t.assigned_to_name || '-'}"`,
      `"${(t.solution_note || '-').replace(/"/g, '""')}"`
    ].join(','));
  });

  return bom + lines.join('\n');
}

export const generateIncidentDetailCsv = generateDetailedTicketsCsv;
