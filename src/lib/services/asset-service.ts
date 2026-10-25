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
  return { success: true, data: newAsset };
}

export interface BorrowAssetInput {
  assetId: string;
  borrowerName: string;
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
