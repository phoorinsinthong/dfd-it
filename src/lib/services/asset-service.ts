import { Asset, AssetStatus, BorrowLog } from '@/types/database';

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'asset-1',
    asset_code: 'NB-IT-001',
    name: 'Dell Latitude 5430 (Core i5/16GB/512GB)',
    category: 'Laptop',
    status: 'available',
    created_at: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'asset-2',
    asset_code: 'NB-IT-002',
    name: 'Lenovo ThinkPad L14 Gen 3',
    category: 'Laptop',
    status: 'available',
    created_at: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'asset-3',
    asset_code: 'PRJ-IT-001',
    name: 'Epson EB-X51 Portable 3LCD Projector',
    category: 'Projector',
    status: 'available',
    created_at: '2026-02-15T08:00:00.000Z',
  },
  {
    id: 'asset-4',
    asset_code: 'ADPT-IT-001',
    name: 'USB-C to HDMI / VGA Multiport Adapter',
    category: 'Adapter',
    status: 'available',
    created_at: '2026-03-01T08:00:00.000Z',
  },
  {
    id: 'asset-5',
    asset_code: 'MIC-IT-001',
    name: 'Wireless Dual Lavalier Microphone Kit',
    category: 'Microphone',
    status: 'available',
    created_at: '2026-03-10T08:00:00.000Z',
  },
];

let assetsStore: Asset[] = [...INITIAL_ASSETS];
let borrowLogsStore: BorrowLog[] = [];

export function resetAssetStore() {
  assetsStore = INITIAL_ASSETS.map((a) => ({ ...a }));
  borrowLogsStore = [];
}

export interface GetAssetsFilter {
  status?: AssetStatus | 'all';
  category?: string;
  search?: string;
}

export async function getAssets(filter?: GetAssetsFilter): Promise<Asset[]> {
  return assetsStore.filter((a) => {
    if (filter?.status && filter.status !== 'all' && a.status !== filter.status) {
      return false;
    }
    if (filter?.category && a.category !== filter.category) {
      return false;
    }
    if (filter?.search?.trim()) {
      const q = filter.search.toLowerCase();
      const matchCode = a.asset_code.toLowerCase().includes(q);
      const matchName = a.name.toLowerCase().includes(q);
      const matchCat = a.category.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchCat) return false;
    }
    return true;
  });
}

export async function getAssetById(id: string): Promise<Asset | null> {
  const asset = assetsStore.find((a) => a.id === id);
  return asset ? { ...asset } : null;
}

export interface CreateAssetInput {
  assetCode: string;
  name: string;
  category: string;
  actor?: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
}

export async function createAsset(
  input: CreateAssetInput
): Promise<{ success: boolean; data?: Asset; error?: string }> {
  if (!input.assetCode?.trim() || !input.name?.trim()) {
    return { success: false, error: 'Asset code and name are required' };
  }

  const codeNormalized = input.assetCode.trim().toUpperCase();
  const exists = assetsStore.some((a) => a.asset_code.toUpperCase() === codeNormalized);
  if (exists) {
    return { success: false, error: `Asset code ${codeNormalized} already exists` };
  }

  const newAsset: Asset = {
    id: `asset-${Date.now().toString().slice(-6)}`,
    asset_code: codeNormalized,
    name: input.name.trim(),
    category: input.category.trim() || 'General',
    status: 'available',
    created_at: new Date().toISOString(),
  };

  assetsStore.push(newAsset);

  if (input.actor) {
    const { recordAuditLog } = await import('./audit-log-service');
    await recordAuditLog({
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorEmail: input.actor.email,
      actorRole: input.actor.role,
      action: 'CREATE',
      module: 'ASSET',
      targetId: newAsset.id,
      targetName: `${newAsset.asset_code} - ${newAsset.name}`,
      details: `เพิ่มครุภัณฑ์ใหม่: ${newAsset.asset_code} (${newAsset.name}) หมวดหมู่: ${newAsset.category}`,
    });
  }

  return { success: true, data: newAsset };
}

export interface UpdateAssetInput {
  assetId: string;
  assetCode?: string;
  name?: string;
  category?: string;
  status?: AssetStatus;
  actor?: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
}

export async function updateAsset(
  input: UpdateAssetInput
): Promise<{ success: boolean; data?: Asset; error?: string }> {
  const asset = assetsStore.find((a) => a.id === input.assetId);
  if (!asset) {
    return { success: false, error: 'ไม่พบครุภัณฑ์ที่ต้องการแก้ไข' };
  }

  if (input.assetCode) {
    const codeNorm = input.assetCode.trim().toUpperCase();
    const collision = assetsStore.some(
      (a) => a.id !== input.assetId && a.asset_code.toUpperCase() === codeNorm
    );
    if (collision) {
      return { success: false, error: `รหัสครุภัณฑ์ ${codeNorm} ซ้ำกับรายการอื่น` };
    }
    asset.asset_code = codeNorm;
  }

  if (input.name) asset.name = input.name.trim();
  if (input.category) asset.category = input.category.trim();
  if (input.status) asset.status = input.status;

  if (input.actor) {
    const { recordAuditLog } = await import('./audit-log-service');
    await recordAuditLog({
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorEmail: input.actor.email,
      actorRole: input.actor.role,
      action: 'UPDATE',
      module: 'ASSET',
      targetId: asset.id,
      targetName: `${asset.asset_code} - ${asset.name}`,
      details: `แก้ไขข้อมูลครุภัณฑ์: ${asset.asset_code} (${asset.name}) หมวด: ${asset.category} สถานะ: ${asset.status}`,
    });
  }

  return { success: true, data: { ...asset } };
}

export async function deleteAsset(
  assetId: string,
  actor?: { id: string; name: string; email?: string; role: string },
  options?: { force?: boolean }
): Promise<{ success: boolean; softDeleted?: boolean; message?: string; error?: string }> {
  const assetIdx = assetsStore.findIndex((a) => a.id === assetId);
  if (assetIdx === -1) {
    return { success: false, error: 'ไม่พบครุภัณฑ์ที่ต้องการลบ' };
  }

  const asset = assetsStore[assetIdx];

  // Check if currently borrowed
  if (asset.status === 'borrowed') {
    return {
      success: false,
      error: 'ไม่สามารถลบครุภัณฑ์ที่กำลังถูกยืมอยู่ได้ กรุณารับคืนอุปกรณ์ก่อนดำเนินการ',
    };
  }

  // Check if has borrow logs in history
  const hasHistory = borrowLogsStore.some((l) => l.asset_id === assetId);

  if (hasHistory && !options?.force) {
    // Soft decommission: mark as maintenance or inactive
    asset.status = 'maintenance';
    if (actor) {
      const { recordAuditLog } = await import('./audit-log-service');
      await recordAuditLog({
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'STATUS_CHANGE',
        module: 'ASSET',
        targetId: asset.id,
        targetName: `${asset.asset_code} - ${asset.name}`,
        details: `ปลดระวาง/ระงับใช้งานครุภัณฑ์ (Soft Delete): ${asset.asset_code} (${asset.name})`,
      });
    }

    return {
      success: true,
      softDeleted: true,
      message: 'ครุภัณฑ์มีประวัติการยืม-คืนในระบบ จึงทำการระงับใช้งาน (Soft Delete) เพื่อคงประวัติไว้',
    };
  }

  assetsStore.splice(assetIdx, 1);

  if (actor) {
    const { recordAuditLog } = await import('./audit-log-service');
    await recordAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'DELETE',
      module: 'ASSET',
      targetId: asset.id,
      targetName: `${asset.asset_code} - ${asset.name}`,
      details: `ลบครุภัณฑ์ออกจากคลัง: ${asset.asset_code} (${asset.name})`,
    });
  }

  return { success: true, softDeleted: false };
}

export interface BorrowAssetInput {
  assetId: string;
  borrowerName: string;
  borrowerDivisionId?: string;
  borrowerDivisionName?: string;
  borrowerDeptId?: string;
  borrowerDeptName?: string;
  expectedReturnDate: string; // ISO
  staffId: string;
  staffName?: string;
  conditionOut?: string;
  notes?: string;
}

export async function borrowAsset(
  input: BorrowAssetInput
): Promise<{ success: boolean; data?: BorrowLog; error?: string }> {
  const asset = assetsStore.find((a) => a.id === input.assetId);
  if (!asset) {
    return { success: false, error: 'Asset not found' };
  }

  if (asset.status !== 'available') {
    return { success: false, error: `Asset is currently ${asset.status} and not available for loan` };
  }

  if (!input.borrowerName?.trim()) {
    return { success: false, error: 'Borrower name is required' };
  }

  // Update asset status
  asset.status = 'borrowed';

  const newLog: BorrowLog = {
    id: `LOAN-${Date.now().toString().slice(-6)}`,
    asset_id: asset.id,
    asset_code: asset.asset_code,
    asset_name: asset.name,
    borrower_name: input.borrowerName.trim(),
    borrower_division_id: input.borrowerDivisionId,
    borrower_division_name: input.borrowerDivisionName,
    borrower_dept_id: input.borrowerDeptId,
    borrower_dept_name: input.borrowerDeptName,
    borrow_date: new Date().toISOString(),
    expected_return_date: new Date(input.expectedReturnDate).toISOString(),
    staff_id: input.staffId,
    staff_name: input.staffName,
    condition_out: input.conditionOut || 'ปกติ พร้อมใช้งาน',
    notes: input.notes?.trim(),
  };

  borrowLogsStore.unshift(newLog);
  return { success: true, data: newLog };
}

export interface ReturnAssetInput {
  logId: string;
  conditionIn?: string;
  notes?: string;
}

export async function returnAsset(
  input: ReturnAssetInput
): Promise<{ success: boolean; data?: BorrowLog; error?: string }> {
  const log = borrowLogsStore.find((l) => l.id === input.logId);
  if (!log) {
    return { success: false, error: 'Loan record not found' };
  }

  if (log.actual_return_date) {
    return { success: false, error: 'Asset already returned' };
  }

  log.actual_return_date = new Date().toISOString();
  if (input.conditionIn) log.condition_in = input.conditionIn;
  if (input.notes) log.notes = (log.notes ? log.notes + ' | ' : '') + input.notes;

  // Set asset status back to available
  const asset = assetsStore.find((a) => a.id === log.asset_id);
  if (asset) {
    asset.status = 'available';
  }

  return { success: true, data: { ...log } };
}

export async function getActiveLoans(): Promise<BorrowLog[]> {
  const now = Date.now();
  return borrowLogsStore
    .filter((l) => !l.actual_return_date)
    .map((l) => ({
      ...l,
      is_overdue: new Date(l.expected_return_date).getTime() < now,
    }));
}

export async function getOverdueLoans(): Promise<BorrowLog[]> {
  const now = Date.now();
  return borrowLogsStore
    .filter((l) => !l.actual_return_date && new Date(l.expected_return_date).getTime() < now)
    .map((l) => ({
      ...l,
      is_overdue: true,
    }));
}

export async function getAllBorrowLogs(): Promise<BorrowLog[]> {
  const now = Date.now();
  return borrowLogsStore.map((l) => ({
    ...l,
    is_overdue: !l.actual_return_date && new Date(l.expected_return_date).getTime() < now,
  }));
}
