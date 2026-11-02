import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSupplies,
  getSupplyById,
  createSupply,
  updateSupply,
  deleteSupply,
  restockSupply,
  createRequisition,
  getRequisitions,
  resetSupplyStore,
} from '@/lib/services/supply-service';

describe('Supplies & Requisition Service (Seam 1)', () => {
  beforeEach(() => {
    resetSupplyStore();
  });

  describe('Inventory Management', () => {
    it('loads initial pre-seeded inventory of IT supplies', async () => {
      const supplies = await getSupplies();
      expect(supplies.length).toBeGreaterThanOrEqual(6);

      const lanCable = supplies.find((s) => s.item_code === 'MAT-LAN-001');
      expect(lanCable).toBeDefined();
      expect(lanCable?.name).toContain('สาย LAN Cat6');
      expect(lanCable?.quantity).toBeGreaterThan(0);
      expect(lanCable?.status).toBe('in_stock');
    });

    it('creates a new supply item and computes stock status correctly', async () => {
      const res = await createSupply({
        itemCode: 'MAT-TEST-001',
        name: 'ถ่าน 9V สำหรับเครื่องวัด',
        category: 'อุปกรณ์เสริม',
        unit: 'ก้อน',
        quantity: 2,
        minQuantity: 5,
        unitPrice: 85,
        location: 'ตู้ A ชั้น 1',
      });

      expect(res.success).toBe(true);
      expect(res.data?.id).toBeDefined();
      expect(res.data?.status).toBe('low_stock'); // 2 <= 5

      const saved = await getSupplyById(res.data!.id);
      expect(saved?.name).toBe('ถ่าน 9V สำหรับเครื่องวัด');
    });

    it('updates existing supply details and recalculates status', async () => {
      const supplies = await getSupplies();
      const target = supplies[0];

      const res = await updateSupply(target.id, {
        name: 'สาย LAN Cat6 UTP 3M (เกรดพรีเมียม)',
        minQuantity: 20,
      });

      expect(res.success).toBe(true);
      expect(res.data?.name).toBe('สาย LAN Cat6 UTP 3M (เกรดพรีเมียม)');
    });

    it('restocks supply quantity and adjusts status', async () => {
      // Create item with 0 stock
      const created = await createSupply({
        itemCode: 'MAT-ZERO-001',
        name: 'Flash Drive 32GB',
        category: 'อุปกรณ์สำรองข้อมูล',
        unit: 'อัน',
        quantity: 0,
        minQuantity: 5,
      });
      expect(created.data?.status).toBe('out_of_stock');

      // Restock 10 items
      const res = await restockSupply(created.data!.id, 10, 'รับพัสดุเข้าจากใบสั่งซื้อ PO-6901');
      expect(res.success).toBe(true);
      expect(res.data?.quantity).toBe(10);
      expect(res.data?.status).toBe('in_stock');
    });

    it('deletes a supply item from inventory', async () => {
      const created = await createSupply({
        itemCode: 'MAT-DEL-001',
        name: 'พัสดุสำหรับทดสอบลบ',
        category: 'ทั่วไป',
        unit: 'ชิ้น',
        quantity: 5,
        minQuantity: 1,
      });

      const delRes = await deleteSupply(created.data!.id);
      expect(delRes.success).toBe(true);

      const found = await getSupplyById(created.data!.id);
      expect(found).toBeNull();
    });
  });

  describe('Requisition Operations (เบิกวัสดุ)', () => {
    it('successfully processes requisition, deducts stock, and logs record', async () => {
      const supplies = await getSupplies();
      const target = supplies.find((s) => s.quantity >= 5)!;
      const initialQty = target.quantity;

      const reqRes = await createRequisition({
        itemId: target.id,
        quantity: 3,
        recipientName: 'นายประสิทธิ์ การช่าง',
        recipientEmployeeId: 'EMP-9021',
        departmentName: 'กลุ่มงานซ่อมบำรุง',
        purpose: 'ใช้เดินสายสัญญาณห้องประชุม 2',
        ticketId: 'TK-100201',
        issuerStaffName: 'ภูรินทร์ ไอที',
      });

      expect(reqRes.success).toBe(true);
      expect(reqRes.data?.id).toBeDefined();
      expect(reqRes.data?.requisition_number).toMatch(/^REQ-/);
      expect(reqRes.data?.quantity).toBe(3);

      // Verify stock deducted
      const updatedSupply = await getSupplyById(target.id);
      expect(updatedSupply?.quantity).toBe(initialQty - 3);

      // Verify requisition in list
      const reqList = await getRequisitions();
      const found = reqList.find((r) => r.id === reqRes.data?.id);
      expect(found).toBeDefined();
      expect(found?.recipient_name).toBe('นายประสิทธิ์ การช่าง');
    });

    it('rejects requisition if requested quantity exceeds available stock', async () => {
      const created = await createSupply({
        itemCode: 'MAT-LOW-001',
        name: 'หัวแปลง Type-C',
        category: 'อะแดปเตอร์',
        unit: 'อัน',
        quantity: 2,
        minQuantity: 1,
      });

      const res = await createRequisition({
        itemId: created.data!.id,
        quantity: 5, // Exceeds 2
        recipientName: 'สมศรี มีสุข',
        purpose: 'เบิกไปใช้งานด่วน',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('ยอดพัสดุในคลังไม่เพียงพอ');
    });
  });
});
