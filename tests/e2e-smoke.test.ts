import { describe, it, expect, beforeEach } from 'vitest';
import { authenticateGeneralUser, authenticateStaff } from '@/lib/auth/auth-service';
import {
  createTicket,
  acceptTicket,
  resolveTicket,
  cancelTicket,
  resetTicketStore,
} from '@/lib/services/ticket-service';
import {
  getRooms,
  createBooking,
  resetBookingStore,
} from '@/lib/services/booking-service';
import {
  getAssets,
  borrowAsset,
  returnAsset,
  getOverdueLoans,
  resetAssetStore,
} from '@/lib/services/asset-service';
import {
  getChecklistTemplates,
  generateAnnualRoadmap,
  toggleChecklistItem,
  getChecklists,
  resetRoadmapStore,
} from '@/lib/services/roadmap-service';
import {
  generateMonthlyReport,
  generateReportCsv,
  saveReportSignature,
  resetReportStore,
} from '@/lib/services/report-service';
import { sendLineTicketNotification } from '@/lib/services/line-notification-service';

describe('Ticket 09: End-to-End System Smoke Test', () => {
  beforeEach(() => {
    resetTicketStore();
    resetBookingStore();
    resetAssetStore();
    resetRoadmapStore();
    resetReportStore();
  });

  it('runs complete lifecycle: User Dual Auth -> Ticket -> Booking Concurrency -> Loan -> PM -> Report', async () => {
    // 1. Dual Authentication: General User Login (Employee ID + PIN)
    const userAuth = await authenticateGeneralUser({
      employeeId: 'EMP001',
      phoneOrPin: '1234',
      name: 'สมชาย สดใส',
    });
    expect(userAuth.success).toBe(true);
    expect(userAuth.user?.role).toBe('user');
    expect(userAuth.user?.employeeId).toBe('EMP001');

    // Dual Authentication: IT Staff Login (Email + Password)
    const staffAuth = await authenticateStaff({
      email: 'it-admin@company.local',
      password: 'AdminPassword123!',
    });
    expect(staffAuth.success).toBe(true);
    expect(staffAuth.user?.role).toBe('admin');

    // 2. Helpdesk Ticket Creation with WebP compressed attachment & LINE notification
    const ticketRes = await createTicket({
      userId: userAuth.user!.id,
      userName: userAuth.user!.name,
      userEmployeeId: userAuth.user!.employeeId,
      departmentName: 'ฝ่ายทรัพยากรบุคคล (HR)',
      categoryName: 'Hardware',
      title: 'หน้าจอคอมพิวเตอร์เปิดไม่ติด',
      description: 'ไฟปุ่ม Power กะพริบ หน้าจอดำ',
      location: 'อาคาร 2 ชั้น 3 โต๊ะ 05',
      urgency: 'high',
      imageUrl: 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAgA0JaQAA3AA/vuUAAA=',
    });
    expect(ticketRes.success).toBe(true);
    const ticket = ticketRes.data!;
    expect(ticket.status).toBe('pending');

    // Verify LINE notification adapter payload & delivery
    const lineRes = await sendLineTicketNotification(ticket, {
      baseUrl: 'https://itsupport.company.com',
    });
    expect(lineRes.success).toBe(true);
    expect(lineRes.payload?.altText).toContain(ticket.id);

    // 3. IT Staff accepts ticket (Pending -> In Progress)
    const acceptRes = await acceptTicket({
      ticketId: ticket.id,
      staffId: staffAuth.user!.id,
      staffName: staffAuth.user!.name,
    });
    expect(acceptRes.success).toBe(true);
    expect(acceptRes.data?.status).toBe('in_progress');

    // User is blocked from cancelling once In Progress
    const cancelAttempt = await cancelTicket(ticket.id, userAuth.user!.id);
    expect(cancelAttempt.success).toBe(false);

    // IT Staff resolves ticket (In Progress -> Resolved)
    const resolveRes = await resolveTicket({
      ticketId: ticket.id,
      solutionNote: 'เปลี่ยนสายเคเบิล DisplayPort ใหม่และทดสอบเปิดเครื่องติดปกติ',
      rootCause: 'สายสัญญาณภาพชำรุด',
    });
    expect(resolveRes.success).toBe(true);
    expect(resolveRes.data?.status).toBe('resolved');

    // 4. Meeting Room Booking & Concurrency Lock
    const rooms = await getRooms();
    const boardroom = rooms.find((r) => r.type === 'onsite')!;

    // Initial booking
    const booking1 = await createBooking({
      userId: userAuth.user!.id,
      userName: userAuth.user!.name,
      roomId: boardroom.id,
      title: 'ประชุมวางแผนประจำไตรมาส',
      startTime: '2026-11-15T09:00:00.000Z',
      endTime: '2026-11-15T11:00:00.000Z',
      requiredEquipment: ['Projector', 'Wireless Mic'],
    });
    expect(booking1.success).toBe(true);

    // Overlapping attempt (10:00 - 12:00) -> 409 Conflict
    const booking2 = await createBooking({
      userId: 'other_user',
      userName: 'ผู้ใช้ท่านอื่น',
      roomId: boardroom.id,
      title: 'ประชุมด่วน',
      startTime: '2026-11-15T10:00:00.000Z',
      endTime: '2026-11-15T12:00:00.000Z',
    });
    expect(booking2.success).toBe(false);
    expect(booking2.conflict).toBe(true);

    // 5. IT Asset Walk-in Loan & Return
    const assets = await getAssets({ status: 'available' });
    const laptop = assets.find((a) => a.category === 'Laptop')!;

    const checkout = await borrowAsset({
      assetId: laptop.id,
      borrowerName: userAuth.user!.name,
      expectedReturnDate: '2026-11-20T17:00:00.000Z',
      staffId: staffAuth.user!.id,
      conditionOut: 'สมบูรณ์ แบตเตอรี่ 100%',
    });
    expect(checkout.success).toBe(true);

    // Return check-in
    const checkin = await returnAsset({
      logId: checkout.data!.id,
      conditionIn: 'สภาพปกติ สายชาร์จครบ',
    });
    expect(checkin.success).toBe(true);
    expect(checkin.data?.actual_return_date).toBeDefined();

    // 6. Preventive Maintenance 12-Month Annual Roadmap
    const templates = await getChecklistTemplates();
    const annualGen = await generateAnnualRoadmap(templates[0].id, 2026);
    expect(annualGen.success).toBe(true);
    expect(annualGen.createdCount).toBe(12);

    // Toggle task in Month 1
    const checklists = await getChecklists(2026);
    const month1Checklist = checklists.find((c) => c.target_month === 1)!;
    const taskToggle = await toggleChecklistItem(month1Checklist.items[0].id, staffAuth.user!.name);
    expect(taskToggle.success).toBe(true);
    expect(taskToggle.item?.is_completed).toBe(true);

    // 7. Monthly Summary Report & Dual Signature
    const reportMonth = new Date().getMonth() + 1;
    const reportYear = new Date().getFullYear();
    const report = await generateMonthlyReport(reportMonth, reportYear);

    expect(report.ticketStats.total).toBeGreaterThanOrEqual(1);
    expect(report.ticketStats.resolved).toBeGreaterThanOrEqual(1);

    // Save Dual Signature
    const sigRes = await saveReportSignature({
      month: reportMonth,
      year: reportYear,
      staffSignature: 'data:image/png;base64,mockStaffSig',
      staffName: staffAuth.user!.name,
      supervisorSignature: 'data:image/png;base64,mockSupervisorSig',
      supervisorName: 'ดร.สมชาย ผู้จัดการไอที',
    });
    expect(sigRes.success).toBe(true);

    // Generate CSV
    const csv = generateReportCsv(report);
    expect(csv).toContain('IT Support Monthly Executive Summary');
  });
});
