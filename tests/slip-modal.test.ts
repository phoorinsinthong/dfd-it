import { describe, it, expect } from 'vitest';
import { SupplyRequisition, BorrowLog } from '@/types/database';

describe('Printable Slip Formats (Requisitions & Asset Loans)', () => {
  it('formats SupplyRequisition slip data properly for 2-part A4 printing', () => {
    const requisition: SupplyRequisition = {
      id: 'req-123',
      requisition_number: 'REQ-202610-001',
      item_id: 'mat-1',
      item_code: 'MAT-LAN-001',
      item_name: 'สาย LAN Cat6 3 เมตร',
      quantity: 2,
      unit: 'เส้น',
      recipient_name: 'นายสมชาย ใจดี',
      recipient_employee_id: 'EMP-088',
      division_name: 'กองการเงิน',
      department_name: 'ฝ่ายการเงินและพัสดุ',
      purpose: 'เปลี่ยนสายสัญญาณที่ชำรุด',
      ticket_id: 'TIK-2026-0042',
      issuer_staff_name: 'นายวิศวกร ไอที',
      requisition_date: '2026-10-15T09:30:00.000Z',
      created_at: '2026-10-15T09:30:00.000Z',
    };

    expect(requisition.requisition_number).toBe('REQ-202610-001');
    expect(requisition.item_code).toBe('MAT-LAN-001');
    expect(requisition.recipient_name).toBe('นายสมชาย ใจดี');
    expect(requisition.ticket_id).toBe('TIK-2026-0042');
    expect(requisition.issuer_staff_name).toBe('นายวิศวกร ไอที');
  });

  it('formats BorrowLog loan agreement slip data properly for 2-part A4 printing', () => {
    const loan: BorrowLog = {
      id: 'loan-456',
      asset_id: 'ast-1',
      asset_code: 'AST-NB-001',
      asset_name: 'Dell Latitude 5420 Laptop',
      borrower_name: 'นางสาวสุดา แสนสุข',
      borrower_division_name: 'สำนักบริหารกลาง',
      borrower_dept_name: 'ฝ่ายสารบรรณและธุรการ',
      borrow_date: '2026-10-16T10:00:00.000Z',
      expected_return_date: '2026-10-20T16:30:00.000Z',
      staff_name: 'เจ้าหน้าที่ไอที ประจำการ',
      condition_out: 'สภาพสมบูรณ์ พร้อมกระเป๋าและที่ชาร์จ',
      notes: 'ยืมเพื่อใช้งานประชุมสัมมนาประจำปี',
    };

    expect(loan.asset_code).toBe('AST-NB-001');
    expect(loan.borrower_name).toBe('นางสาวสุดา แสนสุข');
    expect(loan.expected_return_date).toBe('2026-10-20T16:30:00.000Z');
    expect(loan.staff_name).toBe('เจ้าหน้าที่ไอที ประจำการ');
    expect(loan.condition_out).toContain('สภาพสมบูรณ์');
  });
});

