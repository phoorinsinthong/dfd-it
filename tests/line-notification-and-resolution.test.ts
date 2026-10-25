import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTicket,
  getTicketById,
  cancelTicket,
  acceptTicket,
  resolveTicket,
  filterTickets,
  resetTicketStore,
} from '@/lib/services/ticket-service';
import {
  buildTicketFlexMessage,
  sendLineTicketNotification,
} from '@/lib/services/line-notification-service';
import { Ticket } from '@/types/database';

describe('Ticket 04: IT Ticket Resolution & LINE Notification Adapter', () => {
  beforeEach(() => {
    resetTicketStore();
  });

  describe('LINE Flex Message Builder & Notification Adapter', () => {
    const mockTicket: Ticket = {
      id: 'TK-100200',
      user_id: 'usr_1',
      user_name: 'สมศรี มั่งมี',
      user_employee_id: 'EMP042',
      department_id: 'dept-hr',
      department_name: 'ฝ่ายทรัพยากรบุคคล (HR)',
      category_id: 'cat-network',
      category_name: 'Network',
      title: 'อินเทอร์เน็ตใช้งานไม่ได้ทั้งชั้น',
      description: 'ไฟ Router สีแดงกะพริบ เครื่องคอมพิวเตอร์ตัดการเชื่อมต่อทั้งหมด',
      location: 'อาคารสำนักงานใหญ่ ชั้น 4',
      urgency: 'urgent',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    it('builds a valid LINE Flex Message payload with deep link and urgency badge', () => {
      const flexPayload = buildTicketFlexMessage(mockTicket, 'https://it-support.company.com');

      expect(flexPayload.type).toBe('flex');
      expect(flexPayload.altText).toContain('TK-100200');
      expect(flexPayload.altText).toContain('อินเทอร์เน็ตใช้งานไม่ได้ทั้งชั้น');

      const bubble = flexPayload.contents;
      expect(bubble.type).toBe('bubble');
      // Urgency badge styling
      expect(bubble.header?.contents[0].text).toContain('ด่วนที่สุด (URGENT)');
      // Body content checks
      const bodyText = JSON.stringify(bubble.body);
      expect(bodyText).toContain('TK-100200');
      expect(bodyText).toContain('สมศรี มั่งมี');
      expect(bodyText).toContain('ฝ่ายทรัพยากรบุคคล (HR)');
      expect(bodyText).toContain('อาคารสำนักงานใหญ่ ชั้น 4');

      // Footer action deep link
      const footerJson = JSON.stringify(bubble.footer);
      expect(footerJson).toContain('https://it-support.company.com/admin/tickets?id=TK-100200');
    });

    it('handles LINE push notification dispatch and graceful quota fallback', async () => {
      // Normal dispatch
      const successResult = await sendLineTicketNotification(mockTicket, {
        baseUrl: 'https://it-support.company.com',
      });
      expect(successResult.success).toBe(true);
      expect(successResult.delivered).toBe(true);

      // Quota exhausted scenario triggers fallback without throwing
      const quotaFallbackResult = await sendLineTicketNotification(mockTicket, {
        baseUrl: 'https://it-support.company.com',
        mockQuotaExhausted: true,
      });
      expect(quotaFallbackResult.success).toBe(true);
      expect(quotaFallbackResult.delivered).toBe(false);
      expect(quotaFallbackResult.fallbackTriggered).toBe(true);
      expect(quotaFallbackResult.message).toMatch(/quota/i);
    });
  });

  describe('IT Staff Ticket Acceptance & Resolution Lifecycle', () => {
    it('allows IT staff to accept pending ticket and transition to in_progress', async () => {
      const created = await createTicket({
        userId: 'usr_emp001',
        userName: 'สมปอง',
        userEmployeeId: 'EMP001',
        departmentName: 'บัญชี',
        title: 'เครื่องพิมพ์กระดาษติด',
        description: 'พิมพ์ใบเสร็จแล้วติดข้างใน',
        location: 'แผนกบัญชี โต๊ะ 3',
        urgency: 'high',
      });

      expect(created.success).toBe(true);
      const ticketId = created.data!.id;

      // IT staff accepts
      const acceptRes = await acceptTicket({
        ticketId,
        staffId: 'staff_it01',
        staffName: 'วิชัย ช่างไอที',
      });

      expect(acceptRes.success).toBe(true);
      expect(acceptRes.data?.status).toBe('in_progress');
      expect(acceptRes.data?.assigned_to).toBe('staff_it01');
      expect(acceptRes.data?.assigned_to_name).toBe('วิชัย ช่างไอที');

      // User cannot cancel once in_progress
      const cancelAttempt = await cancelTicket(ticketId, 'usr_emp001');
      expect(cancelAttempt.success).toBe(false);
      expect(cancelAttempt.error).toMatch(/cannot be cancelled once in progress/i);
    });

    it('allows IT staff to resolve ticket with solution notes and root cause', async () => {
      const created = await createTicket({
        userId: 'usr_emp002',
        userName: 'มานี',
        userEmployeeId: 'EMP002',
        title: 'เปิดโปรแกรมไม่ได้',
        description: 'ขึ้น Error 500',
        location: 'โต๊ะ 12',
      });

      const ticketId = created.data!.id;
      await acceptTicket({
        ticketId,
        staffId: 'staff_it01',
        staffName: 'วิชัย ช่างไอที',
      });

      const resolveRes = await resolveTicket({
        ticketId,
        solutionNote: 'ทำการรีสตาร์ทเซอร์วิสและเคลียร์แคชระบบ',
        rootCause: 'หน่วยความจำเครื่องแม่ข่ายเต็มชั่วคราว',
      });

      expect(resolveRes.success).toBe(true);
      expect(resolveRes.data?.status).toBe('resolved');
      expect(resolveRes.data?.solution_note).toBe('ทำการรีสตาร์ทเซอร์วิสและเคลียร์แคชระบบ');
      expect(resolveRes.data?.root_cause).toBe('หน่วยความจำเครื่องแม่ข่ายเต็มชั่วคราว');
      expect(resolveRes.data?.resolved_at).toBeDefined();

      const updated = await getTicketById(ticketId);
      expect(updated?.status).toBe('resolved');
      expect(updated?.resolved_at).toBeDefined();
    });

    it('filters tickets by status, department, and search keyword', async () => {
      await createTicket({
        userId: 'usr_1',
        userName: 'กานดา',
        departmentId: 'dept-hr',
        departmentName: 'HR',
        title: 'ขอเมาส์ใหม่',
        description: 'เมาส์คลิกซ้ายไม่ติด',
        location: 'ห้อง HR',
      });

      await createTicket({
        userId: 'usr_2',
        userName: 'ชาติชาย',
        departmentId: 'dept-sales',
        departmentName: 'Sales',
        title: 'หน้าจอฟ้า BSOD',
        description: 'เครื่องโน้ตบุ๊กขึ้นจอฟ้าขณะเปิดเครื่อง',
        location: 'ห้อง Sales',
      });

      const all = await filterTickets({});
      expect(all.length).toBe(2);

      const hrTickets = await filterTickets({ departmentId: 'dept-hr' });
      expect(hrTickets.length).toBe(1);
      expect(hrTickets[0].department_name).toBe('HR');

      const searchResults = await filterTickets({ searchQuery: 'BSOD' });
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].title).toContain('BSOD');
    });
  });
});
