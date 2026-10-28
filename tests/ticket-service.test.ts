import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTicket,
  getUserTickets,
  getTicketById,
  cancelTicket,
  updateTicketStatus,
  resetTicketStore,
} from '@/lib/services/ticket-service';

describe('Helpdesk Ticket Service Seam', () => {
  const mockUser = {
    id: 'usr_emp001',
    employeeId: 'EMP001',
    name: 'สมศรี มีสุข',
    departmentId: 'dept-2',
    departmentName: 'ฝ่ายทรัพยากรบุคคล (HR)',
  };

  beforeEach(() => {
    resetTicketStore();
  });

  describe('Ticket Creation & Retrieval', () => {
    it('creates a new ticket with pending status and image attachment', async () => {
      const result = await createTicket({
        userId: mockUser.id,
        userName: mockUser.name,
        userEmployeeId: mockUser.employeeId,
        departmentId: mockUser.departmentId,
        departmentName: mockUser.departmentName,
        categoryId: 'cat-1',
        categoryName: 'Hardware',
        title: 'หน้าจอคอมพิวเตอร์เปิดไม่ติด',
        description: 'กดปุ่มเปิดแล้วไฟสีส้มกะพริบ หน้าจอดำสนิท',
        location: 'อาคาร 2 ชั้น 3 โต๊ะ HR-05',
        imageUrl: 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAgA0JaQAA3AA/vuUAAA=',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.status).toBe('pending');
      expect(result.data?.title).toBe('หน้าจอคอมพิวเตอร์เปิดไม่ติด');
      expect(result.data?.location).toBe('อาคาร 2 ชั้น 3 โต๊ะ HR-05');
      expect(result.data?.image_url).toBeDefined();

      const userTickets = await getUserTickets(mockUser.id);
      expect(userTickets.length).toBe(1);
      expect(userTickets[0].id).toBe(result.data?.id);
    });

    it('rejects ticket creation with missing required fields', async () => {
      const result = await createTicket({
        userId: mockUser.id,
        userName: mockUser.name,
        userEmployeeId: mockUser.employeeId,
        title: '',
        description: '',
        location: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Description and location are required/i);
    });
  });

  describe('Ticket Cancellation Rules', () => {
    it('allows user to cancel ticket while status is pending', async () => {
      const created = await createTicket({
        userId: mockUser.id,
        userName: mockUser.name,
        userEmployeeId: mockUser.employeeId,
        title: 'ขอเปลี่ยนเมาส์',
        description: 'สายเมาส์ขาด',
        location: 'โต๊ะ 01',
      });

      const cancelRes = await cancelTicket(created.data!.id, mockUser.id);
      expect(cancelRes.success).toBe(true);

      const ticket = await getTicketById(created.data!.id);
      expect(ticket?.status).toBe('cancelled');
    });

    it('blocks user from cancelling ticket once IT staff sets it to in_progress', async () => {
      const created = await createTicket({
        userId: mockUser.id,
        userName: mockUser.name,
        userEmployeeId: mockUser.employeeId,
        title: 'โน้ตบุ๊กต่อ Wi-Fi ไม่ได้',
        description: 'หาชื่อ SSID บริษัทไม่เจอ',
        location: 'ห้องประชุม 2',
      });

      // IT Staff accepts the ticket
      await updateTicketStatus({
        ticketId: created.data!.id,
        status: 'in_progress',
        staffId: 'staff_admin',
        staffName: 'IT Staff สมศักดิ์',
      });

      // User attempts to cancel
      const cancelAttempt = await cancelTicket(created.data!.id, mockUser.id);
      expect(cancelAttempt.success).toBe(false);
      expect(cancelAttempt.error).toMatch(/cannot be cancelled once in progress/i);

      // Verify status remains in_progress
      const ticket = await getTicketById(created.data!.id);
      expect(ticket?.status).toBe('in_progress');
    });

    it('creates ticket with division and location hierarchy, and filters by division', async () => {
      const { filterTickets } = await import('@/lib/services/ticket-service');
      const res = await createTicket({
        userId: 'usr_fin01',
        userName: 'วิภาดา การเงิน',
        divisionId: 'div-1',
        divisionName: 'กองการเงิน (Financial Division)',
        departmentId: 'dept-1',
        departmentName: 'ฝ่ายบัญชี (Accounting Section)',
        building: 'อาคาร 1',
        floor: 'ชั้น 3',
        room: 'ห้อง 301',
        locationNote: 'โต๊ะ 02',
        title: 'ปริ้นใบเสร็จไม่ออก',
        description: 'เครื่องพิมพ์ขึ้นไฟแดง',
        location: 'อาคาร 1 ชั้น 3 ห้อง 301 (โต๊ะ 02)',
      });

      expect(res.success).toBe(true);
      expect(res.data?.division_id).toBe('div-1');
      expect(res.data?.division_name).toBe('กองการเงิน (Financial Division)');
      expect(res.data?.building).toBe('อาคาร 1');
      expect(res.data?.floor).toBe('ชั้น 3');
      expect(res.data?.room).toBe('ห้อง 301');
      expect(res.data?.location_note).toBe('โต๊ะ 02');

      const finTickets = await filterTickets({ divisionId: 'div-1' });
      expect(finTickets.length).toBeGreaterThanOrEqual(1);
      expect(finTickets.some((t) => t.id === res.data?.id)).toBe(true);

      const otherTickets = await filterTickets({ divisionId: 'div-non-existent' });
      expect(otherTickets.length).toBe(0);
    });
  });
});
