import { SupplyItem, SupplyRequisition, SupplyStatus } from '@/types/database';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const INITIAL_SUPPLIES: SupplyItem[] = [
  {
    id: 'mat-1',
    item_code: 'MAT-LAN-001',
    name: 'สาย LAN Cat6 UTP 3 เมตร (เข้าหัวสำเร็จรูปพร้อมใช้งาน)',
    category: 'สายสัญญาณและเน็ตเวิร์ก',
    unit: 'เส้น',
    quantity: 45,
    min_quantity: 10,
    unit_price: 65,
    location: 'ตู้ A ชั้น 1 (Network Cab)',
    status: 'in_stock',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mat-2',
    item_code: 'MAT-RJ45-001',
    name: 'หัวต่อ RJ45 Modular Plug Cat6 (กล่อง 100 ชิ้น)',
    category: 'อุปกรณ์เน็ตเวิร์ก',
    unit: 'กล่อง',
    quantity: 12,
    min_quantity: 3,
    unit_price: 350,
    location: 'ตู้ A ชั้น 2 (Tool Box)',
    status: 'in_stock',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mat-3',
    item_code: 'MAT-MSE-001',
    name: 'เมาส์ออปติคัล USB Optical Mouse (Logitech B100)',
    category: 'อุปกรณ์ต่อพ่วง',
    unit: 'ตัว',
    quantity: 28,
    min_quantity: 5,
    unit_price: 190,
    location: 'ตู้ B ชั้น 1 (Peripherals)',
    status: 'in_stock',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mat-4',
    item_code: 'MAT-KBD-001',
    name: 'แป้นพิมพ์ USB Keyboard (ภาษาไทย/อังกฤษ กันละอองน้ำ)',
    category: 'อุปกรณ์ต่อพ่วง',
    unit: 'ตัว',
    quantity: 18,
    min_quantity: 5,
    unit_price: 290,
    location: 'ตู้ B ชั้น 2 (Keyboards)',
    status: 'in_stock',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mat-5',
    item_code: 'MAT-BAT-001',
    name: 'ถ่านชาร์จ AA Rechargeable Battery 2000mAh (แพ็ค 4 ก้อน)',
    category: 'พลังงานและแบตเตอรี่',
    unit: 'แพ็ค',
    quantity: 15,
    min_quantity: 4,
    unit_price: 320,
    location: 'ตู้ C ชั้น 1 (Batteries)',
    status: 'in_stock',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mat-6',
    item_code: 'MAT-HDMI-001',
    name: 'สาย HDMI 2.0 4K Ultra HD ยาว 2 เมตร',
    category: 'สายสัญญาณและเน็ตเวิร์ก',
    unit: 'เส้น',
    quantity: 22,
    min_quantity: 5,
    unit_price: 150,
    location: 'ตู้ A ชั้น 3 (AV Cables)',
    status: 'in_stock',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mat-7',
    item_code: 'MAT-TNR-001',
    name: 'ตลับหมึกพิมพ์ HP LaserJet Toner Cartridge 107A',
    category: 'หมึกพิมพ์และเครื่องพิมพ์',
    unit: 'กล่อง',
    quantity: 6,
    min_quantity: 2,
    unit_price: 1450,
    location: 'ตู้ D ชั้น 1 (Toners)',
    status: 'in_stock',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

export const INITIAL_REQUISITIONS: SupplyRequisition[] = [
  {
    id: 'req-1',
    requisition_number: 'REQ-2610-001',
    item_id: 'mat-1',
    item_code: 'MAT-LAN-001',
    item_name: 'สาย LAN Cat6 UTP 3 เมตร (เข้าหัวสำเร็จรูปพร้อมใช้งาน)',
    quantity: 2,
    unit: 'เส้น',
    recipient_name: 'สมชาย รักงาน',
    recipient_employee_id: 'EMP-012',
    division_name: 'กองพัฒนาระบบราชการ',
    department_name: 'ฝ่ายสารสนเทศและแผนงาน',
    purpose: 'เดินสายสัญญาณเพิ่มจุดติดตั้งคอมพิวเตอร์โต๊ะทำงานใหม่',
    ticket_id: 'TK-100205',
    issuer_staff_name: 'ภูรินทร์ ไอที',
    requisition_date: '2026-10-15T09:30:00.000Z',
    created_at: '2026-10-15T09:30:00.000Z',
  },
  {
    id: 'req-2',
    requisition_number: 'REQ-2610-002',
    item_id: 'mat-3',
    item_code: 'MAT-MSE-001',
    item_name: 'เมาส์ออปติคัล USB Optical Mouse (Logitech B100)',
    quantity: 1,
    unit: 'ตัว',
    recipient_name: 'วิภาดา มั่นคง',
    recipient_employee_id: 'EMP-088',
    division_name: 'สำนักบริหารกลาง',
    department_name: 'กลุ่มงานการเงินและบัญชี',
    purpose: 'เปลี่ยนแทนเมาส์เดิมที่ลูกกลิ้งไม่ทำงาน',
    ticket_id: 'TK-100208',
    issuer_staff_name: 'ภูรินทร์ ไอที',
    requisition_date: '2026-10-20T14:15:00.000Z',
    created_at: '2026-10-20T14:15:00.000Z',
  },
];

let suppliesStore: SupplyItem[] = JSON.parse(JSON.stringify(INITIAL_SUPPLIES));
let requisitionsStore: SupplyRequisition[] = JSON.parse(JSON.stringify(INITIAL_REQUISITIONS));

export function resetSupplyStore() {
  suppliesStore = JSON.parse(JSON.stringify(INITIAL_SUPPLIES));
  requisitionsStore = JSON.parse(JSON.stringify(INITIAL_REQUISITIONS));
}

function computeSupplyStatus(quantity: number, minQuantity: number): SupplyStatus {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= minQuantity) return 'low_stock';
  return 'in_stock';
}

export interface GetSuppliesFilter {
  category?: string;
  status?: SupplyStatus | 'all';
  search?: string;
}

export async function getSupplies(filter?: GetSuppliesFilter): Promise<SupplyItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('supplies').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        suppliesStore = data as SupplyItem[];
      }
    } catch (e) {
      console.warn('Supabase getSupplies warning:', e);
    }
  }

  let result = [...suppliesStore];

  if (filter?.category && filter.category !== 'all') {
    result = result.filter((s) => s.category === filter.category);
  }

  if (filter?.status && filter.status !== 'all') {
    result = result.filter((s) => s.status === filter.status);
  }

  if (filter?.search?.trim()) {
    const q = filter.search.toLowerCase().trim();
    result = result.filter(
      (s) =>
        s.item_code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.location && s.location.toLowerCase().includes(q))
    );
  }

  return result;
}

export async function getSupplyById(id: string): Promise<SupplyItem | null> {
  const found = suppliesStore.find((s) => s.id === id);
  if (found) return { ...found };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('supplies').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        return data as SupplyItem;
      }
    } catch (e) {
      console.warn('Supabase getSupplyById warning:', e);
    }
  }

  return null;
}

export interface CreateSupplyInput {
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minQuantity?: number;
  unitPrice?: number;
  location?: string;
  actor?: { id: string; name: string; email?: string; role: string };
}

export async function createSupply(
  input: CreateSupplyInput
): Promise<{ success: boolean; data?: SupplyItem; error?: string }> {
  if (!input.name?.trim()) {
    return { success: false, error: 'กรุณาระบุชื่อพัสดุ/วัสดุ' };
  }
  if (!input.itemCode?.trim()) {
    return { success: false, error: 'กรุณาระบุรหัสพัสดุ' };
  }

  const existing = suppliesStore.find(
    (s) => s.item_code.toLowerCase() === input.itemCode.trim().toLowerCase()
  );
  if (existing) {
    return { success: false, error: `รหัสพัสดุ "${input.itemCode}" มีอยู่ในระบบแล้ว` };
  }

  const quantity = Math.max(0, input.quantity || 0);
  const minQuantity = Math.max(0, input.minQuantity ?? 5);
  const status = computeSupplyStatus(quantity, minQuantity);

  const newSupply: SupplyItem = {
    id: `mat-${Date.now().toString().slice(-6)}`,
    item_code: input.itemCode.trim().toUpperCase(),
    name: input.name.trim(),
    category: input.category?.trim() || 'ทั่วไป',
    unit: input.unit?.trim() || 'ชิ้น',
    quantity,
    min_quantity: minQuantity,
    unit_price: input.unitPrice,
    location: input.location?.trim() || undefined,
    status,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('supplies').insert(newSupply).select().single();
      if (!error && data) {
        newSupply.id = data.id;
        newSupply.created_at = data.created_at;
      }
    } catch (e) {
      console.warn('Supabase createSupply warning:', e);
    }
  }

  suppliesStore.unshift(newSupply);

  if (input.actor) {
    try {
      const { recordAuditLog } = await import('./audit-log-service');
      await recordAuditLog({
        actorId: input.actor.id,
        actorName: input.actor.name,
        actorEmail: input.actor.email,
        actorRole: input.actor.role,
        action: 'CREATE',
        module: 'SUPPLY',
        targetId: newSupply.id,
        targetName: newSupply.name,
        details: `เพิ่มพัสดุใหม่ในคลัง: ${newSupply.item_code} - ${newSupply.name} จำนวน ${newSupply.quantity} ${newSupply.unit}`,
      });
    } catch (auditErr) {
      console.warn('Audit log error in createSupply:', auditErr);
    }
  }

  return { success: true, data: newSupply };
}

export interface UpdateSupplyInput {
  name?: string;
  category?: string;
  unit?: string;
  minQuantity?: number;
  unitPrice?: number;
  location?: string;
  actor?: { id: string; name: string; email?: string; role: string };
}

export async function updateSupply(
  id: string,
  input: UpdateSupplyInput
): Promise<{ success: boolean; data?: SupplyItem; error?: string }> {
  const target = suppliesStore.find((s) => s.id === id);
  if (!target) {
    return { success: false, error: 'ไม่พบพัสดุที่ต้องการแก้ไข' };
  }

  if (input.name) target.name = input.name.trim();
  if (input.category) target.category = input.category.trim();
  if (input.unit) target.unit = input.unit.trim();
  if (input.minQuantity !== undefined) target.min_quantity = Math.max(0, input.minQuantity);
  if (input.unitPrice !== undefined) target.unit_price = input.unitPrice;
  if (input.location !== undefined) target.location = input.location.trim() || undefined;

  target.status = computeSupplyStatus(target.quantity, target.min_quantity);
  target.updated_at = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('supplies').upsert(target, { onConflict: 'id' });
    } catch (e) {
      console.warn('Supabase updateSupply warning:', e);
    }
  }

  if (input.actor) {
    try {
      const { recordAuditLog } = await import('./audit-log-service');
      await recordAuditLog({
        actorId: input.actor.id,
        actorName: input.actor.name,
        actorEmail: input.actor.email,
        actorRole: input.actor.role,
        action: 'UPDATE',
        module: 'SUPPLY',
        targetId: target.id,
        targetName: target.name,
        details: `แก้ไขข้อมูลพัสดุ: ${target.item_code} - ${target.name}`,
      });
    } catch (auditErr) {
      console.warn('Audit log error in updateSupply:', auditErr);
    }
  }

  return { success: true, data: { ...target } };
}

export async function deleteSupply(
  id: string,
  actor?: { id: string; name: string; email?: string; role: string }
): Promise<{ success: boolean; error?: string }> {
  const index = suppliesStore.findIndex((s) => s.id === id);
  if (index === -1) {
    return { success: false, error: 'ไม่พบพัสดุที่ต้องการลบ' };
  }

  const target = suppliesStore[index];
  suppliesStore.splice(index, 1);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('supplies').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase deleteSupply warning:', e);
    }
  }

  if (actor) {
    try {
      const { recordAuditLog } = await import('./audit-log-service');
      await recordAuditLog({
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'DELETE',
        module: 'SUPPLY',
        targetId: target.id,
        targetName: target.name,
        details: `ลบพัสดุออกจากคลัง: ${target.item_code} - ${target.name}`,
      });
    } catch (auditErr) {
      console.warn('Audit log error in deleteSupply:', auditErr);
    }
  }

  return { success: true };
}

export async function restockSupply(
  id: string,
  quantityToAdd: number,
  notes?: string,
  actor?: { id: string; name: string; email?: string; role: string }
): Promise<{ success: boolean; data?: SupplyItem; error?: string }> {
  const target = suppliesStore.find((s) => s.id === id);
  if (!target) {
    return { success: false, error: 'ไม่พบพัสดุที่ต้องการรับเข้า' };
  }

  if (quantityToAdd <= 0) {
    return { success: false, error: 'จำนวนที่รับเข้าต้องมากกว่า 0' };
  }

  target.quantity += quantityToAdd;
  target.status = computeSupplyStatus(target.quantity, target.min_quantity);
  target.updated_at = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('supplies').upsert(target, { onConflict: 'id' });
    } catch (e) {
      console.warn('Supabase restockSupply warning:', e);
    }
  }

  if (actor) {
    try {
      const { recordAuditLog } = await import('./audit-log-service');
      await recordAuditLog({
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'RESTOCK',
        module: 'SUPPLY',
        targetId: target.id,
        targetName: target.name,
        details: `รับพัสดุเข้าคลัง: ${target.item_code} - ${target.name} +${quantityToAdd} ${target.unit} (คงเหลือ: ${target.quantity}) ${notes ? `หมายเหตุ: ${notes}` : ''}`,
      });
    } catch (auditErr) {
      console.warn('Audit log error in restockSupply:', auditErr);
    }
  }

  return { success: true, data: { ...target } };
}

export interface CreateRequisitionInput {
  itemId: string;
  quantity: number;
  recipientName: string;
  recipientEmployeeId?: string;
  divisionId?: string;
  divisionName?: string;
  departmentId?: string;
  departmentName?: string;
  purpose: string;
  ticketId?: string;
  issuerStaffId?: string;
  issuerStaffName?: string;
  requisitionDate?: string;
  notes?: string;
  actor?: { id: string; name: string; email?: string; role: string };
}

export async function createRequisition(
  input: CreateRequisitionInput
): Promise<{ success: boolean; data?: SupplyRequisition; error?: string }> {
  const targetSupply = suppliesStore.find((s) => s.id === input.itemId);
  if (!targetSupply) {
    return { success: false, error: 'ไม่พบพัสดุที่ต้องการเบิก' };
  }

  if (!input.quantity || input.quantity <= 0) {
    return { success: false, error: 'จำนวนที่เบิกต้องมากกว่า 0' };
  }

  if (targetSupply.quantity < input.quantity) {
    return {
      success: false,
      error: `ยอดพัสดุในคลังไม่เพียงพอ (คงเหลือ ${targetSupply.quantity} ${targetSupply.unit}, ต้องการเบิก ${input.quantity} ${targetSupply.unit})`,
    };
  }

  if (!input.recipientName?.trim()) {
    return { success: false, error: 'กรุณาระบุชื่อผู้ขอเบิก' };
  }

  if (!input.purpose?.trim()) {
    return { success: false, error: 'กรุณาระบุวัตถุประสงค์การเบิก' };
  }

  // Deduct stock
  targetSupply.quantity -= input.quantity;
  targetSupply.status = computeSupplyStatus(targetSupply.quantity, targetSupply.min_quantity);
  targetSupply.updated_at = new Date().toISOString();

  const reqDate = input.requisitionDate || new Date().toISOString();
  const d = new Date(reqDate);
  const yy = d.getFullYear().toString().slice(-2);
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const randNum = Math.floor(100 + Math.random() * 900);
  const reqNumber = `REQ-${yy}${mm}-${randNum}`;

  const newRequisition: SupplyRequisition = {
    id: `req-${Date.now().toString().slice(-6)}`,
    requisition_number: reqNumber,
    item_id: targetSupply.id,
    item_code: targetSupply.item_code,
    item_name: targetSupply.name,
    quantity: input.quantity,
    unit: targetSupply.unit,
    recipient_name: input.recipientName.trim(),
    recipient_employee_id: input.recipientEmployeeId?.trim() || undefined,
    division_id: input.divisionId,
    division_name: input.divisionName,
    department_id: input.departmentId,
    department_name: input.departmentName,
    purpose: input.purpose.trim(),
    ticket_id: input.ticketId?.trim() || undefined,
    issuer_staff_id: input.issuerStaffId,
    issuer_staff_name: input.issuerStaffName || input.actor?.name || 'IT Staff',
    requisition_date: reqDate,
    notes: input.notes?.trim() || undefined,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('supplies').upsert(targetSupply, { onConflict: 'id' });
      const { data, error } = await supabase.from('supply_requisitions').insert(newRequisition).select().single();
      if (!error && data) {
        newRequisition.id = data.id;
        newRequisition.created_at = data.created_at;
      }
    } catch (e) {
      console.warn('Supabase createRequisition warning:', e);
    }
  }

  requisitionsStore.unshift(newRequisition);

  if (input.actor) {
    try {
      const { recordAuditLog } = await import('./audit-log-service');
      await recordAuditLog({
        actorId: input.actor.id,
        actorName: input.actor.name,
        actorEmail: input.actor.email,
        actorRole: input.actor.role,
        action: 'DISPENSE',
        module: 'SUPPLY',
        targetId: newRequisition.id,
        targetName: newRequisition.requisition_number,
        details: `เบิกพัสดุ: ${newRequisition.item_name} จำนวน ${newRequisition.quantity} ${newRequisition.unit} ให้แก่ ${newRequisition.recipient_name} (${newRequisition.purpose})`,
      });
    } catch (auditErr) {
      console.warn('Audit log error in createRequisition:', auditErr);
    }
  }

  return { success: true, data: newRequisition };
}

export interface GetRequisitionsFilter {
  itemId?: string;
  month?: number;
  year?: number;
  search?: string;
}

export async function getRequisitions(filter?: GetRequisitionsFilter): Promise<SupplyRequisition[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('supply_requisitions')
        .select('*')
        .order('requisition_date', { ascending: false });
      if (!error && data && data.length > 0) {
        requisitionsStore = data as SupplyRequisition[];
      }
    } catch (e) {
      console.warn('Supabase getRequisitions warning:', e);
    }
  }

  let result = [...requisitionsStore];

  if (filter?.itemId && filter.itemId !== 'all') {
    result = result.filter((r) => r.item_id === filter.itemId);
  }

  if (filter?.month !== undefined && filter?.year !== undefined) {
    result = result.filter((r) => {
      const d = new Date(r.requisition_date);
      return d.getMonth() + 1 === filter.month && d.getFullYear() === filter.year;
    });
  }

  if (filter?.search?.trim()) {
    const q = filter.search.toLowerCase().trim();
    result = result.filter(
      (r) =>
        r.requisition_number.toLowerCase().includes(q) ||
        r.recipient_name.toLowerCase().includes(q) ||
        (r.item_name && r.item_name.toLowerCase().includes(q)) ||
        (r.department_name && r.department_name.toLowerCase().includes(q)) ||
        (r.purpose && r.purpose.toLowerCase().includes(q)) ||
        (r.ticket_id && r.ticket_id.toLowerCase().includes(q))
    );
  }

  return result;
}

