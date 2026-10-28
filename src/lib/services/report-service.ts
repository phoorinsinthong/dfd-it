import { MonthlyReportSummary, ReportSignature } from '@/types/database';
import { getAllTickets } from './ticket-service';
import { getAllBookings } from './booking-service';
import { getAllBorrowLogs } from './asset-service';
import { getChecklists, THAI_MONTH_NAMES } from './roadmap-service';

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
    const rName = b.room_name || 'ห้องประชุม';
    byRoom[rName] = (byRoom[rName] || 0) + 1;
  });

  // 3. Filter Asset Loans in target month/year
  const monthLoans = loans.filter((l) => {
    const d = new Date(l.borrow_date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const totalLoans = monthLoans.length;
  const returnedLoans = monthLoans.filter((l) => Boolean(l.actual_return_date)).length;
  const activeLoans = monthLoans.filter((l) => !l.actual_return_date && !l.is_overdue).length;
  const overdueLoans = monthLoans.filter((l) => l.is_overdue).length;

  // 4. Filter PM Checklists for target month
  const monthChecklists = checklists.filter(
    (c) => c.year === year && (c.target_month === month || (!c.target_month && c.type === 'adhoc'))
  );

  const totalChecklists = monthChecklists.length;
  const completedChecklists = monthChecklists.filter((c) => c.status === 'completed').length;
  const completionRate =
    totalChecklists === 0 ? 100 : Math.round((completedChecklists / totalChecklists) * 100);

  // 5. Check if signature exists
  const existingSig = signaturesStore.find((s) => s.month === month && s.year === year);

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
      completionRate,
    },
    signature: existingSig,
  };
}

export interface SaveReportSignatureInput {
  month: number;
  year: number;
  staffSignature?: string;
  staffName?: string;
  staffTitle?: string;
  staffSignatureType?: 'drawn' | 'typed';
  supervisorSignature?: string;
  supervisorName?: string;
  supervisorTitle?: string;
  supervisorSignatureType?: 'drawn' | 'typed';
}

export async function saveReportSignature(
  input: SaveReportSignatureInput
): Promise<{ success: boolean; data?: ReportSignature; error?: string }> {
  const existing = signaturesStore.find((s) => s.month === input.month && s.year === input.year);

  const updatedSig: ReportSignature = existing
    ? {
        ...existing,
        staff_signature: input.staffSignature !== undefined ? input.staffSignature : existing.staff_signature,
        staff_name: input.staffName !== undefined ? input.staffName : existing.staff_name,
        staff_title: input.staffTitle !== undefined ? input.staffTitle : existing.staff_title,
        staff_signature_type: input.staffSignatureType !== undefined ? input.staffSignatureType : existing.staff_signature_type,
        supervisor_signature: input.supervisorSignature !== undefined ? input.supervisorSignature : existing.supervisor_signature,
        supervisor_name: input.supervisorName !== undefined ? input.supervisorName : existing.supervisor_name,
        supervisor_title: input.supervisorTitle !== undefined ? input.supervisorTitle : existing.supervisor_title,
        supervisor_signature_type: input.supervisorSignatureType !== undefined ? input.supervisorSignatureType : existing.supervisor_signature_type,
        signed_at: new Date().toISOString(),
      }
    : {
        id: `sig-${input.year}-${input.month}`,
        month: input.month,
        year: input.year,
        staff_signature: input.staffSignature,
        staff_name: input.staffName,
        staff_title: input.staffTitle,
        staff_signature_type: input.staffSignatureType || 'drawn',
        supervisor_signature: input.supervisorSignature,
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

  return { success: true, data: updatedSig };
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
  lines.push('--- สถิติการใช้งานห้องประชุม (Meeting Room Usage) ---');
  lines.push('ห้องประชุม/บัญชี,จำนวนครั้ง');
  Object.entries(report.bookingStats.byRoom).forEach(([room, count]) => {
    lines.push(`"${room}",${count}`);
  });

  return bom + lines.join('\n');
}

export async function getMonthlyTickets(month: number, year: number): Promise<import('@/types/database').Ticket[]> {
  const tickets = await getAllTickets();
  return tickets.filter((t) => {
    const d = new Date(t.created_at);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });
}

export function generateDetailedTicketsCsv(
  tickets: import('@/types/database').Ticket[],
  month: number,
  year: number
): string {
  const monthName = THAI_MONTH_NAMES[month - 1] || `Month ${month}`;
  const bom = '\uFEFF';
  const lines: string[] = [];

  lines.push(`รายงานรายละเอียดรายการแจ้งซ่อมประจำเดือน (IT Support Incident Detail Report)`);
  lines.push(`ประจำเดือน: ${monthName} ${year}`);
  lines.push(`จำนวนงานทั้งหมด: ${tickets.length} รายการ`);
  lines.push(`ออกรายงานเมื่อ: ${new Date().toLocaleDateString('th-TH')}`);
  lines.push('');

  const headers = [
    'ลำดับ',
    'รหัสใบแจ้งซ่อม',
    'วันที่แจ้ง',
    'ผู้แจ้ง',
    'รหัสพนักงาน',
    'กองงาน',
    'แผนก',
    'อาคาร',
    'ชั้น',
    'ห้อง',
    'สถานที่/จุดระบุ',
    'หมวดหมู่ปัญหา',
    'หัวข้อปัญหา',
    'รายละเอียดอาการ',
    'ความเร่งด่วน',
    'สถานะ',
    'เจ้าหน้าที่ผู้รับผิดชอบ',
    'วิธีแก้ไข/บันทึกผลงาน',
  ];
  lines.push(headers.join(','));

  const statusLabelMap: Record<string, string> = {
    pending: 'รอรับเรื่อง (Pending)',
    in_progress: 'กำลังดำเนินการ (In Progress)',
    resolved: 'เสร็จสิ้น (Resolved)',
    cancelled: 'ยกเลิกแล้ว (Cancelled)',
  };

  const urgencyLabelMap: Record<string, string> = {
    low: 'ต่ำ',
    medium: 'ปานกลาง',
    high: 'สูง',
    urgent: 'ด่วนที่สุด',
  };

  tickets.forEach((t, idx) => {
    const dateFormatted = new Date(t.created_at).toLocaleString('th-TH');
    const safeCol = (str?: string) => `"${(str || '-').replace(/"/g, '""')}"`;

    lines.push(
      [
        idx + 1,
        safeCol(t.id),
        safeCol(dateFormatted),
        safeCol(t.user_name),
        safeCol(t.user_employee_id),
        safeCol(t.division_name),
        safeCol(t.department_name),
        safeCol(t.building),
        safeCol(t.floor),
        safeCol(t.room),
        safeCol(t.location),
        safeCol(t.category_name),
        safeCol(t.title),
        safeCol(t.description),
        safeCol(t.urgency ? (urgencyLabelMap[t.urgency] || t.urgency) : 'ปกติ'),
        safeCol(statusLabelMap[t.status] || t.status),
        safeCol(t.assigned_to_name),
        safeCol(t.solution_note || t.root_cause),
      ].join(',')
    );
  });

  return bom + lines.join('\n');
}
