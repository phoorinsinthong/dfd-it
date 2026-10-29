-- ==========================================================
-- IT Support & Resource Management System
-- Migration 003: Fix Schema Align, Column Types & Missing Columns
-- ==========================================================

-- 1. Enable btree_gist extension for PostgreSQL exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ==========================================================
-- 2. Safely Remove All Strict Foreign Keys
-- (Allows flexible IDs like TK-123456, tpl-xxx, cat-xxx, div-xxx without UUID type mismatch)
-- ==========================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Automatically drop all foreign key constraints in public schema
  FOR r IN (
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints AS tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  ) LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;', r.table_name, r.constraint_name);
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;

  -- Drop exclusion constraint on bookings if present so room_id can be converted
  BEGIN
    ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlapping_room_bookings;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- ==========================================================
-- 3. Convert Primary and Foreign Key Columns to TEXT & Add Missing Columns
-- ==========================================================

-- 3.1 Divisions (กองงาน / สำนัก)
DO $$
BEGIN
  ALTER TABLE public.divisions ALTER COLUMN id TYPE TEXT USING id::text;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3.2 Departments (แผนก / ฝ่าย)
DO $$
BEGIN
  ALTER TABLE public.departments ALTER COLUMN id TYPE TEXT USING id::text;
  ALTER TABLE public.departments ALTER COLUMN division_id TYPE TEXT USING division_id::text;
EXCEPTION WHEN others THEN NULL;
END $$;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS division_name TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS building TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS floor TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS room TEXT;

-- 3.3 Users & Admin Users
DO $$
BEGIN
  ALTER TABLE public.users ALTER COLUMN id TYPE TEXT USING id::text;
  ALTER TABLE public.users ALTER COLUMN division_id TYPE TEXT USING division_id::text;
  ALTER TABLE public.users ALTER COLUMN department_id TYPE TEXT USING department_id::text;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.4 Categories (หมวดหมู่งานแจ้งซ่อม)
DO $$
BEGIN
  ALTER TABLE public.categories ALTER COLUMN id TYPE TEXT USING id::text;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3.5 Tickets (งานแจ้งซ่อม)
DO $$
BEGIN
  ALTER TABLE public.tickets ALTER COLUMN id TYPE TEXT USING id::text;
  ALTER TABLE public.tickets ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  ALTER TABLE public.tickets ALTER COLUMN division_id TYPE TEXT USING division_id::text;
  ALTER TABLE public.tickets ALTER COLUMN department_id TYPE TEXT USING department_id::text;
  ALTER TABLE public.tickets ALTER COLUMN category_id TYPE TEXT USING category_id::text;
  ALTER TABLE public.tickets ALTER COLUMN assigned_to TYPE TEXT USING assigned_to::text;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS user_employee_id TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS division_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS department_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;

-- 3.6 Rooms & Bookings (ห้องประชุมและการจอง Walk-in)
DO $$
BEGIN
  ALTER TABLE public.rooms ALTER COLUMN id TYPE TEXT USING id::text;
  ALTER TABLE public.bookings ALTER COLUMN id TYPE TEXT USING id::text;
  ALTER TABLE public.bookings ALTER COLUMN room_id TYPE TEXT USING room_id::text;
  ALTER TABLE public.bookings ALTER COLUMN user_id TYPE TEXT USING user_id::text;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_walkin BOOLEAN DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booked_by_staff_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booked_by_staff_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_type TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_static_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_passcode TEXT;

-- Re-enable exclusion constraint on bookings with btree_gist
DO $$
BEGIN
  ALTER TABLE public.bookings ADD CONSTRAINT no_overlapping_room_bookings EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  );
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3.7 Assets & Borrow Logs
DO $$
BEGIN
  ALTER TABLE public.assets ALTER COLUMN id TYPE TEXT USING id::text;
  ALTER TABLE public.borrow_logs ALTER COLUMN id TYPE TEXT USING id::text;
  ALTER TABLE public.borrow_logs ALTER COLUMN asset_id TYPE TEXT USING asset_id::text;
  ALTER TABLE public.borrow_logs ALTER COLUMN borrower_dept_id TYPE TEXT USING borrower_dept_id::text;
  ALTER TABLE public.borrow_logs ALTER COLUMN staff_id TYPE TEXT USING staff_id::text;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3.8 PM Roadmap (Checklists & Templates)
DO $$
BEGIN
  ALTER TABLE public.checklists ALTER COLUMN id TYPE TEXT USING id::text;
  ALTER TABLE public.checklist_templates ALTER COLUMN id TYPE TEXT USING id::text;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS target_month_end INTEGER;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS period_label TEXT;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS scheduled_months INTEGER[] DEFAULT '{}';
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;

ALTER TABLE public.checklist_templates ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'monthly';
ALTER TABLE public.checklist_templates ADD COLUMN IF NOT EXISTS scheduled_months INTEGER[] DEFAULT '{}';
ALTER TABLE public.checklist_templates ADD COLUMN IF NOT EXISTS period_label TEXT;
ALTER TABLE public.checklist_templates ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3.9 Reports & Signatures
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  staff_signature TEXT,
  staff_name TEXT,
  staff_title TEXT,
  staff_signature_type TEXT,
  supervisor_signature TEXT,
  supervisor_name TEXT,
  supervisor_title TEXT,
  supervisor_signature_type TEXT,
  signed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (month, year)
);

DO $$
BEGIN
  ALTER TABLE public.reports ALTER COLUMN id TYPE TEXT USING id::text;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS staff_name TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS staff_title TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS staff_signature_type TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS supervisor_name TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS supervisor_title TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS supervisor_signature_type TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- 3.10 Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_email TEXT,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  target_id TEXT,
  target_name TEXT,
  details TEXT NOT NULL
);

-- ==========================================================
-- 4. Configure Row Level Security (RLS) - Allow Web App Access
-- ==========================================================

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'divisions', 'departments', 'users', 'admin_users', 'categories',
    'tickets', 'rooms', 'bookings', 'assets', 'borrow_logs',
    'checklist_templates', 'checklists', 'reports', 'audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Allow anon all on %I" ON public.%I;', tbl, tbl);
      EXECUTE format('CREATE POLICY "Allow anon all on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
END $$;

-- ==========================================================
-- 5. Seed Starter Checklist Templates & Master Data
-- ==========================================================

INSERT INTO public.checklist_templates (id, title, description, frequency, items)
SELECT 'tpl-server-ups', 'แผนบำรุงรักษา Server, Network & UPS ประจำเดือน', 'มาตรฐานการตรวจเช็คระบบแม่ข่าย เครือข่าย และระบบสำรองไฟของบริษัท', 'monthly', '[
  "ตรวจเช็คอุณหภูมิห้อง Server และสถานะเครื่องปรับอากาศ (ไม่เกิน 22°C)",
  "ตรวจสอบไฟสถานะและทำความสะอาดฝุ่น Server Rack & Core Switch",
  "ทดสอบระบบสำรองไฟ UPS และแบตเตอรี่ฉุกเฉิน (UPS Self-Test)",
  "ตรวจสอบผลการสำรองข้อมูลรายวันและรายสัปดาห์ (Backup Log Verification)",
  "ตรวจสอบการอัปเดตระบบปฏิบัติการและ Security Patch ที่สำคัญ"
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.checklist_templates WHERE id = 'tpl-server-ups');

INSERT INTO public.checklist_templates (id, title, description, frequency, scheduled_months, period_label, items)
SELECT 'tpl-meeting-room-av', 'แผนตรวจเช็คอุปกรณ์ห้องประชุมและระบบ AV ประจำไตรมาส', 'ตรวจเช็คจอภาพ โปรเจคเตอร์ และระบบไมโครโฟนไร้สายทุกห้อง', 'quarterly', '{3,6,9,12}', 'รายไตรมาส (มี.ค., มิ.ย., ก.ย., ธ.ค.)', '[
  "ทดสอบสัญญาณภาพ HDMI / Type-C ทุกจุดเชื่อมต่อในห้องประชุม",
  "ทำความสะอาดตัวกรองฝุ่นและเลนส์โปรเจคเตอร์",
  "ตรวจเช็คระดับแบตเตอรี่ไมโครโฟนไร้สายและทำความสะอาดหัวไมค์",
  "ทดสอบความคมชัดของกล้องและไมค์ห้องประชุม Zoom/Teams Room"
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.checklist_templates WHERE id = 'tpl-meeting-room-av');

INSERT INTO public.checklist_templates (id, title, description, frequency, scheduled_months, period_label, items)
SELECT 'tpl-q4-preventive', 'แผนบำรุงรักษาและตรวจนับครุภัณฑ์ประจำช่วงสิ้นปี (ต.ค. - ธ.ค.)', 'ตรวจนับสภาพครุภัณฑ์ไอที ทำความสะอาดใหญ่ และจัดทำแผนทดแทนประจำไตรมาส 4', 'custom_range', '{10,11,12}', 'ต.ค. - ธ.ค.', '[
  "ตรวจนับและติดแท็ก QR Code ครุภัณฑ์ไอทีทุกแผนก",
  "ตรวจเช็คสภาพเครื่องสำรองไฟและแบตเตอรี่ฉุกเฉินประจำปี",
  "ทำความสะอาดเป่าฝุ่น PC/Workstation และห้อง Server ประจำปี",
  "สรุปรายการอุปกรณ์ที่ชำรุดและเตรียมแผนจัดซื้อทดแทนปีถัดไป"
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.checklist_templates WHERE id = 'tpl-q4-preventive');
