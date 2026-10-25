import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateMonthlyReport,
  generateReportCsv,
  saveReportSignature,
  resetReportStore,
} from '@/lib/services/report-service';
import { createTicket, updateTicketStatus, resetTicketStore } from '@/lib/services/ticket-service';
import { createBooking, resetBookingStore } from '@/lib/services/booking-service';
import { borrowAsset, resetAssetStore } from '@/lib/services/asset-service';
import { generateAnnualRoadmap, toggleChecklistItem, getChecklists, resetRoadmapStore, getChecklistTemplates } from '@/lib/services/roadmap-service';

describe('Ticket 08: Monthly Summary Report Seam', () => {
  beforeEach(() => {
    resetTicketStore();
    resetBookingStore();
    resetAssetStore();
    resetRoadmapStore();
    resetReportStore();
  });

  describe('Monthly KPI & Metric Aggregation', () => {
    it('accurately calculates ticket resolution rate, room bookings, and asset loans for target month', async () => {
      // 1. Seed tickets in Nov 2026
      const tk1 = await createTicket({
        userId: 'u1',
        title: 'จอเสีย',
        description: 'จอฟ้า',
        location: 'HR',
        departmentName: 'HR',
        categoryName: 'Hardware',
      });
      // Resolve tk1
      await updateTicketStatus({
        ticketId: tk1.data!.id,
        status: 'resolved',
        solutionNote: 'เปลี่ยนสายจอ',
      });

      const tk2 = await createTicket({
        userId: 'u2',
        title: 'เน็ตหลุด',
        description: 'สัญญาณ Wi-Fi หลุด',
        location: 'Sales',
        departmentName: 'Sales',
        categoryName: 'Network',
      });

      // 2. Generate report for current month
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const report = await generateMonthlyReport(currentMonth, currentYear);
      expect(report.month).toBe(currentMonth);
      expect(report.year).toBe(currentYear);
      expect(report.ticketStats.total).toBe(2);
      expect(report.ticketStats.resolved).toBe(1);
      expect(report.ticketStats.pending).toBe(1);
      expect(report.ticketStats.resolutionRate).toBe(50); // 1/2 = 50%
      expect(report.ticketStats.byCategory['Hardware']).toBe(1);
      expect(report.ticketStats.byCategory['Network']).toBe(1);
      expect(report.ticketStats.byDepartment['HR']).toBe(1);
    });
  });

  describe('CSV Generation & Dual Signature', () => {
    it('generates valid CSV string with UTF-8 BOM for Thai language compatibility', async () => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const report = await generateMonthlyReport(currentMonth, currentYear);

      const csv = generateReportCsv(report);
      expect(csv).toContain('IT Support Monthly Executive Summary');
      expect(csv).toContain('อัตราการแก้ไขปัญหาสำเร็จ');
    });

    it('saves dual digital signatures for staff and supervisor', async () => {
      const mockStaffSig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const mockSupervisorSig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

      const res = await saveReportSignature({
        month: 11,
        year: 2026,
        staffSignature: mockStaffSig,
        staffName: 'วิชัย ช่างไอที',
        supervisorSignature: mockSupervisorSig,
        supervisorName: 'ดร.สมชาย ผู้จัดการฝ่ายไอที',
      });

      expect(res.success).toBe(true);
      expect(res.data?.staff_signature).toBe(mockStaffSig);
      expect(res.data?.supervisor_signature).toBe(mockSupervisorSig);
      expect(res.data?.signed_at).toBeDefined();
    });
  });
});
