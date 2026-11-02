-- ====================================================================
-- IT Support & Resource Management System
-- Migration: 006_create_supplies_and_pm_date.sql
-- Description: ซิงค์ฐานข้อมูลทั้งหมดให้สมบูรณ์ 100% 
--              1. สร้างตาราง supplies (คลังวัสดุสิ้นเปลือง)
--              2. สร้างตาราง supply_requisitions (ประวัติการเบิกจ่ายวัสดุ)
--              3. อัปเดตตาราง reports ให้รองรับลายเซ็นอิเล็กทรอนิกส์
--              4. ปรับจูน constraint ตาราง tickets และ bookings ให้ยืดหยุ่น ป้องกัน error
--              5. ตั้งค่า RLS (Row Level Security) และ Realtime
--              6. นำเข้าข้อมูลวัสดุตั้งต้นพร้อมใช้งาน (Pre-seed Supplies)
--
-- วิธีใช้: คัดลอกโค้ดทั้งหมดนี้ไปวางในหน้า Supabase SQL Editor แล้วกด "Run"
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. ตารางคลังพัสดุและวัสดุสิ้นเปลือง (Supplies Inventory)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplies (
  id TEXT PRIMARY KEY,
  item_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'ทั่วไป',
  unit TEXT NOT NULL DEFAULT 'ชิ้น',
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 5,
  unit_price NUMERIC(10, 2) DEFAULT 0,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.supplies ALTER COLUMN id TYPE TEXT USING id::text;

-- --------------------------------------------------------------------
-- 2. ตารางประวัติการเบิกจ่ายพัสดุ/วัสดุ (Supply Requisitions)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supply_requisitions (
  id TEXT PRIMARY KEY,
  requisition_number TEXT NOT NULL UNIQUE,
  item_id TEXT NOT NULL,
  item_code TEXT,
  item_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT,
  recipient_name TEXT NOT NULL,
  recipient_employee_id TEXT,
  division_id TEXT,
  division_name TEXT,
  department_id TEXT,
  department_name TEXT,
  purpose TEXT NOT NULL,
  ticket_id TEXT,
  issuer_staff_id TEXT,
  issuer_staff_name TEXT,
  requisition_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.supply_requisitions ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.supply_requisitions ALTER COLUMN item_id TYPE TEXT USING item_id::text;

-- --------------------------------------------------------------------
-- 3. อัปเดตตาราง reports (เพิ่มคอลัมน์ลายเซ็น staff_signature & supervisor_signature)
-- --------------------------------------------------------------------
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS staff_name TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS staff_title TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS staff_signature TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS staff_signature_type TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS staff_signature_url TEXT;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS supervisor_name TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS supervisor_title TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS supervisor_signature TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS supervisor_signature_type TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS manager_signature_url TEXT;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- ให้มั่นใจว่ามี Unique Constraint (month, year) สำหรับ UPSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname IN ('reports_month_year_unique', 'reports_month_year_key')
  ) THEN
    ALTER TABLE public.reports ADD CONSTRAINT reports_month_year_unique UNIQUE (month, year);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- --------------------------------------------------------------------
-- 4. ปรับจูน constraint ตาราง tickets และ bookings ป้องกัน error
-- --------------------------------------------------------------------
ALTER TABLE public.tickets ALTER COLUMN location SET DEFAULT 'ภายในสำนักงาน';
ALTER TABLE public.tickets ALTER COLUMN location DROP NOT NULL;

ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;

-- --------------------------------------------------------------------
-- 5. เปิดระบบ Row Level Security (RLS) และสร้าง Policies แบบเปิด
-- --------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY['supplies', 'supply_requisitions'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'public_read_' || t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'public_insert_' || t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'public_update_' || t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'public_delete_' || t, t);

      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true);', 'public_read_' || t, t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true);', 'public_insert_' || t, t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);', 'public_update_' || t, t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO anon, authenticated USING (true);', 'public_delete_' || t, t);
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
END $$;

-- --------------------------------------------------------------------
-- 6. Realtime publication สำหรับ Live Sync
-- --------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'supplies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.supplies;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'supply_requisitions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.supply_requisitions;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- --------------------------------------------------------------------
-- 7. ข้อมูลพัสดุตั้งต้น (Pre-seed Supplies)
-- --------------------------------------------------------------------
INSERT INTO public.supplies (
  id, item_code, name, category, unit, quantity, min_quantity, unit_price, location, status
) VALUES
('mat-1', 'MAT-LAN-001', 'สาย LAN Cat6 UTP 3 เมตร (เข้าหัวสำเร็จรูปพร้อมใช้งาน)', 'สายสัญญาณและเน็ตเวิร์ก', 'เส้น', 45, 10, 65, 'ตู้ A ชั้น 1 (Network Cab)', 'in_stock'),
('mat-2', 'MAT-RJ45-001', 'หัวต่อ RJ45 Modular Plug Cat6 (กล่อง 100 ชิ้น)', 'อุปกรณ์เน็ตเวิร์ก', 'กล่อง', 12, 3, 350, 'ตู้ A ชั้น 2 (Tool Box)', 'in_stock'),
('mat-3', 'MAT-MSE-001', 'เมาส์ออปติคัล USB Optical Mouse (Logitech B100)', 'อุปกรณ์ต่อพ่วง', 'ตัว', 28, 5, 190, 'ตู้ B ชั้น 1 (Peripherals)', 'in_stock'),
('mat-4', 'MAT-KBD-001', 'แป้นพิมพ์ USB Keyboard (ภาษาไทย/อังกฤษ กันละอองน้ำ)', 'อุปกรณ์ต่อพ่วง', 'ตัว', 18, 5, 290, 'ตู้ B ชั้น 2 (Keyboards)', 'in_stock'),
('mat-5', 'MAT-BAT-001', 'ถ่านชาร์จ AA Rechargeable Battery 2000mAh (แพ็ค 4 ก้อน)', 'พลังงานและแบตเตอรี่', 'แพ็ค', 15, 4, 320, 'ตู้ C ชั้น 1 (Batteries)', 'in_stock'),
('mat-6', 'MAT-HDMI-001', 'สาย HDMI 2.0 4K Ultra HD ยาว 2 เมตร', 'สายสัญญาณและเน็ตเวิร์ก', 'เส้น', 22, 5, 150, 'ตู้ A ชั้น 3 (AV Cables)', 'in_stock'),
('mat-7', 'MAT-TNR-001', 'ตลับหมึกพิมพ์ HP LaserJet Toner Cartridge 107A', 'หมึกพิมพ์และเครื่องพิมพ์', 'กล่อง', 6, 2, 1450, 'ตู้ D ชั้น 1 (Toners)', 'in_stock')
ON CONFLICT (id) DO UPDATE SET
  item_code = EXCLUDED.item_code,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  quantity = EXCLUDED.quantity,
  min_quantity = EXCLUDED.min_quantity,
  unit_price = EXCLUDED.unit_price,
  location = EXCLUDED.location,
  status = EXCLUDED.status,
  updated_at = NOW();

-- --------------------------------------------------------------------
-- 8. ข้อมูลตัวอย่างการเบิกจ่าย (Pre-seed Requisitions)
-- --------------------------------------------------------------------
INSERT INTO public.supply_requisitions (
  id, requisition_number, item_id, item_code, item_name, quantity, unit,
  recipient_name, recipient_employee_id, division_name, department_name,
  purpose, ticket_id, issuer_staff_name, requisition_date
) VALUES
('req-1', 'REQ-2610-001', 'mat-1', 'MAT-LAN-001', 'สาย LAN Cat6 UTP 3 เมตร (เข้าหัวสำเร็จรูปพร้อมใช้งาน)', 2, 'เส้น', 'สมชาย รักงาน', 'EMP-012', 'กองพัฒนาระบบราชการ', 'ฝ่ายสารสนเทศและแผนงาน', 'เดินสายสัญญาณเพิ่มจุดติดตั้งคอมพิวเตอร์โต๊ะทำงานใหม่', 'TK-100205', 'ภูรินทร์ ไอที', '2026-10-15T09:30:00.000Z'),
('req-2', 'REQ-2610-002', 'mat-3', 'MAT-MSE-001', 'เมาส์ออปติคัล USB Optical Mouse (Logitech B100)', 1, 'ตัว', 'วิภาดา มั่นคง', 'EMP-088', 'สำนักบริหารกลาง', 'กลุ่มงานการเงินและบัญชี', 'เปลี่ยนแทนเมาส์เดิมที่ลูกกลิ้งไม่ทำงาน', 'TK-100208', 'ภูรินทร์ ไอที', '2026-10-20T14:15:00.000Z')
ON CONFLICT (id) DO UPDATE SET
  requisition_number = EXCLUDED.requisition_number,
  quantity = EXCLUDED.quantity,
  recipient_name = EXCLUDED.recipient_name,
  purpose = EXCLUDED.purpose;
