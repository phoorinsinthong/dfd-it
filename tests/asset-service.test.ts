import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAssets,
  createAsset,
  borrowAsset,
  returnAsset,
  getActiveLoans,
  getOverdueLoans,
  resetAssetStore,
} from '@/lib/services/asset-service';

describe('Ticket 06: IT Asset Inventory & Walk-in Loan Management Seam', () => {
  beforeEach(() => {
    resetAssetStore();
  });

  describe('Asset Registration & Inventory Query', () => {
    it('retrieves default catalog of assets with available status', async () => {
      const assets = await getAssets();
      expect(assets.length).toBeGreaterThanOrEqual(4);

      const laptops = assets.filter((a) => a.category === 'Laptop');
      expect(laptops.length).toBeGreaterThan(0);
      expect(laptops[0].status).toBe('available');
    });

    it('creates new asset and prevents duplicate asset_code', async () => {
      const res = await createAsset({
        assetCode: 'NB-IT-999',
        name: 'Dell Latitude 5430',
        category: 'Laptop',
      });

      expect(res.success).toBe(true);
      expect(res.data?.asset_code).toBe('NB-IT-999');
      expect(res.data?.status).toBe('available');

      // Duplicate attempt
      const dupRes = await createAsset({
        assetCode: 'NB-IT-999',
        name: 'Duplicate Laptop',
        category: 'Laptop',
      });
      expect(dupRes.success).toBe(false);
      expect(dupRes.error).toMatch(/already exists/i);
    });
  });

  describe('Walk-in Loan & Return Lifecycle', () => {
    it('checks out available asset, updates status to borrowed, and records borrower details', async () => {
      const assets = await getAssets({ status: 'available' });
      const asset = assets[0];

      const checkoutRes = await borrowAsset({
        assetId: asset.id,
        borrowerName: 'มานพ ช่างคิด',
        borrowerDeptName: 'ฝ่ายการตลาด',
        expectedReturnDate: '2026-11-10T17:00:00.000Z',
        staffId: 'staff_it01',
        staffName: 'วิชัย ช่างไอที',
        conditionOut: 'สมบูรณ์ ไม่มีรอย แบตเตอรี่ 100%',
      });

      expect(checkoutRes.success).toBe(true);
      expect(checkoutRes.data?.asset_id).toBe(asset.id);
      expect(checkoutRes.data?.borrower_name).toBe('มานพ ช่างคิด');
      expect(checkoutRes.data?.condition_out).toBe('สมบูรณ์ ไม่มีรอย แบตเตอรี่ 100%');

      // Verify asset status is now 'borrowed'
      const updatedAssets = await getAssets();
      const borrowedAsset = updatedAssets.find((a) => a.id === asset.id);
      expect(borrowedAsset?.status).toBe('borrowed');

      // Cannot borrow already borrowed asset
      const doubleBorrow = await borrowAsset({
        assetId: asset.id,
        borrowerName: 'สมใจ',
        expectedReturnDate: '2026-11-12T17:00:00.000Z',
        staffId: 'staff_it01',
      });
      expect(doubleBorrow.success).toBe(false);
      expect(doubleBorrow.error).toMatch(/not available for loan/i);
    });

    it('returns borrowed asset, sets return date, and flips status back to available', async () => {
      const assets = await getAssets({ status: 'available' });
      const asset = assets[0];

      const checkout = await borrowAsset({
        assetId: asset.id,
        borrowerName: 'สมเกียรติ',
        expectedReturnDate: '2026-11-05T17:00:00.000Z',
        staffId: 'staff_it01',
      });

      const logId = checkout.data!.id;

      // Check-in return
      const returnRes = await returnAsset({
        logId,
        conditionIn: 'สภาพสมบูรณ์ พร้อมอุปกรณ์สายชาร์จครบ',
        notes: 'คืนตรงเวลา',
      });

      expect(returnRes.success).toBe(true);
      expect(returnRes.data?.actual_return_date).toBeDefined();
      expect(returnRes.data?.condition_in).toBe('สภาพสมบูรณ์ พร้อมอุปกรณ์สายชาร์จครบ');

      // Asset is now available again
      const refreshedAssets = await getAssets();
      const returnedAsset = refreshedAssets.find((a) => a.id === asset.id);
      expect(returnedAsset?.status).toBe('available');
    });
  });

  describe('Overdue Loan Computation', () => {
    it('detects loans that have passed expected_return_date without being returned', async () => {
      const assets = await getAssets({ status: 'available' });
      const asset = assets[0];

      // Create an overdue loan (expected date in the past)
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // yesterday

      await borrowAsset({
        assetId: asset.id,
        borrowerName: 'อนุชา เกินกำหนด',
        expectedReturnDate: pastDate,
        staffId: 'staff_it01',
      });

      const overdueLoans = await getOverdueLoans();
      expect(overdueLoans.length).toBe(1);
      expect(overdueLoans[0].borrower_name).toBe('อนุชา เกินกำหนด');
      expect(overdueLoans[0].is_overdue).toBe(true);
    });
  });
});
