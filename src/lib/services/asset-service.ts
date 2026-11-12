import { Asset, AssetStatus, BorrowLog } from '@/types/database';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

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

  // --- 19 Notebooks from DFDEquipment Database (.bak) ---
  // 11 เครื่องประจำแผนกสนับสนุนทางเทคนิค (สถานะ available พร้อมให้บริการยืม-คืน)
  {
    id: 'asset-nb-0034',
    asset_code: '7440.001.0003.0034',
    name: 'Asus ROG Strix G614J (Core i7/16GB/1TB)',
    category: 'Laptop',
    status: 'available',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0033',
    asset_code: '7440.001.0003.0033',
    name: 'Asus ROG Strix G614J (Core i7/16GB/1TB)',
    category: 'Laptop',
    status: 'available',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0027',
    asset_code: '7440.001.0003.0027.7',
    name: 'ASUS Vivobook 15 X1502Z',
    category: 'Laptop',
    status: 'available',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0028',
    asset_code: '7440.001.0003.0028.7',
    name: 'ASUS Vivobook 15 X1502Z',
    category: 'Laptop',
    status: 'available',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0029',
    asset_code: '7440.001.0003.0029.7',
    name: 'ASUS Vivobook 15 X1502Z',
    category: 'Laptop',
    status: 'available',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0030',
    asset_code: '7440.001.0003.0030.7',
    name: 'ASUS Vivobook 15 X1502Z',
    category: 'Laptop',
    status: 'available',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0031',
    asset_code: '7440.001.0003.0031.7',
    name: 'ASUS Vivobook 15 X1502Z',
    category: 'Laptop',
    status: 'available',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0032',
    asset_code: '7440.001.0003.0032.7',
    name: 'ASUS Vivobook 15 X1502Z',
    category: 'Laptop',
    status: 'available',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0037',
    asset_code: '7440.001.0003.0037',
    name: 'Dell Pro 15 Essential 3520',
    category: 'Laptop',
    status: 'available',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0038',
    asset_code: '7440.001.0003.0038',
    name: 'Dell Pro 15 Essential 3520',
    category: 'Laptop',
    status: 'available',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0039',
    asset_code: '7440.001.0003.0039',
    name: 'Dell Pro 15 Essential 3520',
    category: 'Laptop',
    status: 'available',
    created_at: '2026-01-01T00:00:00.000Z',
  },

  // 8 เครื่องประจำตำแหน่ง/แผนกอื่น (สถานะ borrowed มีผู้ถือครองแล้ว)
  {
    id: 'asset-nb-0012',
    asset_code: '7440.001.0003.0012.7',
    name: 'Lenovo ThinkPad L430 (ผอ.กกมง.กง.กห.)',
    category: 'Laptop',
    status: 'borrowed',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0021',
    asset_code: '7440.001.0003.0021.7',
    name: 'Acer Aspire E5-471-32GS (จก.กง.กห.)',
    category: 'Laptop',
    status: 'borrowed',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0001',
    asset_code: '7440.001.0003.0001',
    name: 'DELL Vostro 14 3000 series',
    category: 'Laptop',
    status: 'borrowed',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0002',
    asset_code: '7440.001.0003.0002',
    name: 'DELL Vostro 14 3000 series (กบช.ทม.รอ.)',
    category: 'Laptop',
    status: 'borrowed',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0025',
    asset_code: '7440.001.0003.0025',
    name: 'DELL Latitude 3400',
    category: 'Laptop',
    status: 'borrowed',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0026',
    asset_code: '7440.001.0003.0026',
    name: 'DELL Latitude 3400',
    category: 'Laptop',
    status: 'borrowed',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0035',
    asset_code: '7440.001.0003.0035',
    name: 'Dell Pro 15 Essential (หน.กำลังพล กลาง.กง.กห.)',
    category: 'Laptop',
    status: 'borrowed',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset-nb-0036',
    asset_code: '7440.001.0003.0036',
    name: 'Dell Pro 15 Essential (หน.แผน กจก.กง.กห.)',
    category: 'Laptop',
    status: 'borrowed',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

export const INITIAL_BORROW_LOGS: BorrowLog[] = [
  {
    id: 'loan-dfd-nb-0012',
    asset_id: 'asset-nb-0012',
    asset_code: '7440.001.0003.0012.7',
    asset_name: 'Lenovo ThinkPad L430 (ผอ.กกมง.กง.กห.)',
    borrower_name: 'ผอ.กกมง.กง.กห.',
    borrower_division_name: 'กกมง. ฯ',
    borrower_dept_name: 'ผอ.กกมง.กง.กห.',
    borrow_date: '2026-01-15T08:30:00.000Z',
    expected_return_date: '2026-12-31T16:30:00.000Z',
    staff_name: 'แผนกสนับสนุนทางเทคนิค',
    condition_out: 'ปกติ พร้อมใช้งาน',
    notes: 'เครื่องประจำตำแหน่ง ผอ.กกมง.กง.กห. (ทสอ.ฯ)',
  },
  {
    id: 'loan-dfd-nb-0021',
    asset_id: 'asset-nb-0021',
    asset_code: '7440.001.0003.0021.7',
    asset_name: 'Acer Aspire E5-471-32GS (จก.กง.กห.)',
    borrower_name: 'จก.กง.กห.',
    borrower_division_name: 'สำนักงานผู้บังคับบัญชา',
    borrower_dept_name: 'จก.กง.กห.',
    borrow_date: '2026-01-15T08:30:00.000Z',
    expected_return_date: '2026-12-31T16:30:00.000Z',
    staff_name: 'แผนกสนับสนุนทางเทคนิค',
    condition_out: 'ปกติ พร้อมใช้งาน',
    notes: 'เครื่องประจำสำนักงาน จก.กง.กห.',
  },
  {
    id: 'loan-dfd-nb-0001',
    asset_id: 'asset-nb-0001',
    asset_code: '7440.001.0003.0001',
    asset_name: 'DELL Vostro 14 3000 series',
    borrower_name: 'เจ้าหน้าที่แผนกสารสนเทศพิเศษ',
    borrower_division_name: 'กกมง. ฯ',
    borrower_dept_name: 'แผนกสารสนเทศพิเศษ กกมง.กง.กห.',
    borrow_date: '2026-01-15T08:30:00.000Z',
    expected_return_date: '2026-12-31T16:30:00.000Z',
    staff_name: 'แผนกสนับสนุนทางเทคนิค',
    condition_out: 'ปกติ พร้อมใช้งาน',
    notes: 'ใช้งานประจำแผนกสารสนเทศพิเศษ',
  },
  {
    id: 'loan-dfd-nb-0002',
    asset_id: 'asset-nb-0002',
    asset_code: '7440.001.0003.0002',
    asset_name: 'DELL Vostro 14 3000 series (กบช.ทม.รอ.)',
    borrower_name: 'เจ้าหน้าที่ กบช.ทม.รอ.',
    borrower_division_name: 'นถปภ.รอ.',
    borrower_dept_name: 'กบช.ทม.รอ.',
    borrow_date: '2026-01-15T08:30:00.000Z',
    expected_return_date: '2026-12-31T16:30:00.000Z',
    staff_name: 'แผนกสนับสนุนทางเทคนิค',
    condition_out: 'ปกติ พร้อมใช้งาน',
    notes: 'โครงการ นถปภ.รอ.',
  },
  {
    id: 'loan-dfd-nb-0025',
    asset_id: 'asset-nb-0025',
    asset_code: '7440.001.0003.0025',
    asset_name: 'DELL Latitude 3400',
    borrower_name: 'เจ้าหน้าที่แผนกสารสนเทศพิเศษ',
    borrower_division_name: 'กกมง. ฯ',
    borrower_dept_name: 'แผนกสารสนเทศพิเศษ กกมง.กง.กห.',
    borrow_date: '2026-01-15T08:30:00.000Z',
    expected_return_date: '2026-12-31T16:30:00.000Z',
    staff_name: 'แผนกสนับสนุนทางเทคนิค',
    condition_out: 'ปกติ พร้อมใช้งาน',
    notes: 'ใช้งานประจำแผนกสารสนเทศพิเศษ',
  },
  {
    id: 'loan-dfd-nb-0026',
    asset_id: 'asset-nb-0026',
    asset_code: '7440.001.0003.0026',
    asset_name: 'DELL Latitude 3400',
    borrower_name: 'เจ้าหน้าที่แผนกสารสนเทศพิเศษ',
    borrower_division_name: 'กกมง. ฯ',
    borrower_dept_name: 'แผนกสารสนเทศพิเศษ กกมง.กง.กห.',
    borrow_date: '2026-01-15T08:30:00.000Z',
    expected_return_date: '2026-12-31T16:30:00.000Z',
    staff_name: 'แผนกสนับสนุนทางเทคนิค',
    condition_out: 'ปกติ พร้อมใช้งาน',
    notes: 'ใช้งานประจำแผนกสารสนเทศพิเศษ',
  },
  {
    id: 'loan-dfd-nb-0035',
    asset_id: 'asset-nb-0035',
    asset_code: '7440.001.0003.0035',
    asset_name: 'Dell Pro 15 Essential (หน.กำลังพล กลาง.กง.กห.)',
    borrower_name: 'หน.กำลังพล กลาง.กง.กห.',
    borrower_division_name: 'กลาง. ฯ',
    borrower_dept_name: 'หน.กำลังพล กลาง.กง.กห.',
    borrow_date: '2026-01-15T08:30:00.000Z',
    expected_return_date: '2026-12-31T16:30:00.000Z',
    staff_name: 'แผนกสนับสนุนทางเทคนิค',
    condition_out: 'ปกติ พร้อมใช้งาน',
    notes: 'เครื่องประจำแผนกกำลังพล กลาง.กง.กห.',
  },
  {
    id: 'loan-dfd-nb-0036',
    asset_id: 'asset-nb-0036',
    asset_code: '7440.001.0003.0036',
    asset_name: 'Dell Pro 15 Essential (หน.แผน กจก.กง.กห.)',
    borrower_name: 'หน.แผน กจก.กง.กห.',
    borrower_division_name: 'กจก. ฯ',
    borrower_dept_name: 'หน.แผน กจก.กง.กห.',
    borrow_date: '2026-01-15T08:30:00.000Z',
    expected_return_date: '2026-12-31T16:30:00.000Z',
    staff_name: 'แผนกสนับสนุนทางเทคนิค',
    condition_out: 'ปกติ พร้อมใช้งาน',
    notes: 'เครื่องประจำแผนกแผน กจก.กง.กห.',
  },
];

let assetsStore: Asset[] = [...INITIAL_ASSETS];
let borrowLogsStore: BorrowLog[] = [...INITIAL_BORROW_LOGS];

export function resetAssetStore() {
  assetsStore = INITIAL_ASSETS.map((a) => ({ ...a }));
  borrowLogsStore = INITIAL_BORROW_LOGS.map((b) => ({ ...b }));
}

export interface GetAssetsFilter {
  status?: AssetStatus | 'all';
  category?: string;
  search?: string;
}

export async function getAssets(filter?: GetAssetsFilter): Promise<Asset[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('assets').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        assetsStore = data as Asset[];
      }
    } catch (e) {
      console.warn('Supabase getAssets warning:', e);
    }
  }

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
  if (asset) return { ...asset };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('assets').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        return data as Asset;
      }
    } catch (e) {
      console.warn('Supabase getAssetById warning:', e);
    }
  }

  return null;
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

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('assets').insert({
        asset_code: newAsset.asset_code,
        name: newAsset.name,
        category: newAsset.category,
        status: newAsset.status,
      }).select().single();
      if (!error && data) {
        newAsset.id = data.id;
        newAsset.created_at = data.created_at;
      }
    } catch (e) {
      console.warn('Supabase createAsset warning:', e);
    }
  }

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

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('assets').update({
        asset_code: asset.asset_code,
        name: asset.name,
        category: asset.category,
        status: asset.status,
      }).eq('id', input.assetId);
    } catch (e) {
      console.warn('Supabase updateAsset warning:', e);
    }
  }

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
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('assets').update({ status: 'maintenance' }).eq('id', assetId);
      } catch (e) {
        console.warn('Supabase soft deleteAsset warning:', e);
      }
    }
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

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('assets').delete().eq('id', assetId);
    } catch (e) {
      console.warn('Supabase deleteAsset warning:', e);
    }
  }

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

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('assets').update({ status: 'borrowed' }).eq('id', asset.id);
      const { data: dbLog, error } = await supabase.from('borrow_logs').insert({
        id: newLog.id,
        asset_id: newLog.asset_id,
        asset_code: newLog.asset_code,
        asset_name: newLog.asset_name,
        borrower_name: newLog.borrower_name,
        borrower_division_id: newLog.borrower_division_id,
        borrower_division_name: newLog.borrower_division_name,
        borrower_dept_id: newLog.borrower_dept_id,
        borrower_dept_name: newLog.borrower_dept_name,
        borrow_date: newLog.borrow_date,
        expected_return_date: newLog.expected_return_date,
        staff_id: newLog.staff_id,
        staff_name: newLog.staff_name,
        condition_out: newLog.condition_out,
        notes: newLog.notes,
      }).select().single();
      if (!error && dbLog) {
        newLog.id = dbLog.id;
      }
    } catch (e) {
      console.warn('Supabase borrowAsset warning:', e);
    }
  }

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

  if (isSupabaseConfigured()) {
    try {
      if (asset) {
        await supabase.from('assets').update({ status: 'available' }).eq('id', asset.id);
      }
      await supabase.from('borrow_logs').update({
        actual_return_date: log.actual_return_date,
        condition_in: log.condition_in,
        notes: log.notes,
      }).eq('id', input.logId);
    } catch (e) {
      console.warn('Supabase returnAsset warning:', e);
    }
  }

  return { success: true, data: { ...log } };
}

export async function getActiveLoans(): Promise<BorrowLog[]> {
  await getAllBorrowLogs();
  const now = Date.now();
  return borrowLogsStore
    .filter((l) => !l.actual_return_date)
    .map((l) => ({
      ...l,
      is_overdue: new Date(l.expected_return_date).getTime() < now,
    }));
}

export async function getOverdueLoans(): Promise<BorrowLog[]> {
  await getAllBorrowLogs();
  const now = Date.now();
  return borrowLogsStore
    .filter((l) => !l.actual_return_date && new Date(l.expected_return_date).getTime() < now)
    .map((l) => ({
      ...l,
      is_overdue: true,
    }));
}

export async function getAllBorrowLogs(): Promise<BorrowLog[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('borrow_logs').select('*').order('borrow_date', { ascending: false });
      if (!error && data) {
        borrowLogsStore = data as BorrowLog[];
      }
    } catch (e) {
      console.warn('Supabase getAllBorrowLogs warning:', e);
    }
  }

  const now = Date.now();
  return borrowLogsStore.map((l) => ({
    ...l,
    is_overdue: !l.actual_return_date && new Date(l.expected_return_date).getTime() < now,
  }));
}
