-- ==========================================================
-- IT Support & Resource Management System
-- Migration 002: Enable Full Application Access & Schema Align
-- ==========================================================

-- 1. Enable btree_gist extension for booking concurrency
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Ensure all tables exist with flexible column types

-- 2.1 Divisions
CREATE TABLE IF NOT EXISTS public.divisions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.2 Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  division_id TEXT,
  division_name TEXT,
  building TEXT,
  floor TEXT,
  room TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.3 Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.4 Users
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  email TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  division_id TEXT,
  division_name TEXT,
  department_id TEXT,
  department_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.5 Admin Users
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

-- 2.6 Tickets
CREATE TABLE IF NOT EXISTS public.tickets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_employee_id TEXT,
  division_id TEXT,
  division_name TEXT,
  department_id TEXT,
  department_name TEXT,
  building TEXT,
  floor TEXT,
  room TEXT,
  location_note TEXT,
  category_id TEXT,
  category_name TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  image_url TEXT,
  urgency TEXT NOT NULL DEFAULT 'low',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to TEXT,
  assigned_to_name TEXT,
  solution_note TEXT,
  root_cause TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMPTZ
);

-- Safely remove foreign key constraints on tickets if they existed from migration 001
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tickets_user_id_fkey') THEN
    ALTER TABLE public.tickets DROP CONSTRAINT tickets_user_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tickets_division_id_fkey') THEN
    ALTER TABLE public.tickets DROP CONSTRAINT tickets_division_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tickets_department_id_fkey') THEN
    ALTER TABLE public.tickets DROP CONSTRAINT tickets_department_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tickets_category_id_fkey') THEN
    ALTER TABLE public.tickets DROP CONSTRAINT tickets_category_id_fkey;
  END IF;
END $$;

-- Add any missing columns to tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS user_employee_id TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS division_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS department_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;

-- 2.7 Rooms & Bookings
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'onsite',
  capacity INTEGER,
  location TEXT,
  static_url TEXT,
  passcode TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_department TEXT,
  room_id TEXT NOT NULL,
  room_name TEXT,
  room_type TEXT,
  room_static_url TEXT,
  room_passcode TEXT,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  required_equipment TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Safely remove room foreign key constraints if existed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bookings_room_id_fkey') THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_room_id_fkey;
  END IF;
END $$;

-- 2.8 Assets & Borrow Logs
CREATE TABLE IF NOT EXISTS public.assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  asset_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.borrow_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  asset_id TEXT NOT NULL,
  asset_code TEXT,
  asset_name TEXT,
  borrower_name TEXT NOT NULL,
  borrower_division_id TEXT,
  borrower_division_name TEXT,
  borrower_dept_id TEXT,
  borrower_dept_name TEXT,
  borrow_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expected_return_date TIMESTAMPTZ NOT NULL,
  actual_return_date TIMESTAMPTZ,
  staff_id TEXT,
  staff_name TEXT,
  condition_out TEXT NOT NULL DEFAULT 'Good',
  condition_in TEXT,
  notes TEXT
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'borrow_logs_asset_id_fkey') THEN
    ALTER TABLE public.borrow_logs DROP CONSTRAINT borrow_logs_asset_id_fkey;
  END IF;
END $$;

-- 2.9 PM Roadmap & Checklists
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT,
  scheduled_months INTEGER[] DEFAULT '{}',
  period_label TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.checklists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  target_month INTEGER,
  target_month_end INTEGER,
  period_label TEXT,
  scheduled_months INTEGER[] DEFAULT '{}',
  type TEXT NOT NULL DEFAULT 'annual',
  status TEXT NOT NULL DEFAULT 'in_progress',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.10 Reports & Signatures
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

-- Add any missing columns to reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS staff_name TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS staff_title TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS staff_signature_type TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS supervisor_name TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS supervisor_title TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS supervisor_signature_type TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- 2.11 Audit Logs
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
-- 3. Configure Row Level Security (RLS) - Allow Web App Access
-- ==========================================================

-- Enable RLS and grant full policies for the web client
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
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon all on %I" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow anon all on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

-- ==========================================================
-- 4. Seed Initial Essential Master Data (Safe - ON CONFLICT DO NOTHING)
-- ==========================================================

INSERT INTO public.divisions (name) VALUES
  ('กองการเงิน (Financial Division)'),
  ('สำนักบริหารกลาง (Central Administration Bureau)'),
  ('กองการเจ้าหน้าที่ (Human Resources Division)'),
  ('ศูนย์เทคโนโลยีสารสนเทศ (IT & Digital Center)'),
  ('กองยุทธศาสตร์และแผนงาน (Strategy & Planning Division)')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.departments (name, building, floor, room) VALUES
  ('ฝ่ายสนับสนุนเทคนิค (IT Support)', 'อาคาร 1', 'ชั้น 2', 'ห้อง 204'),
  ('ฝ่ายทรัพยากรบุคคล (HR)', 'อาคาร 2', 'ชั้น 2', 'ห้อง 201'),
  ('ฝ่ายบัญชีและการเงิน (Accounting & Finance)', 'อาคาร 1', 'ชั้น 3', 'ห้อง 301'),
  ('ฝ่ายการตลาดและประชาสัมพันธ์ (Marketing & PR)', 'อาคาร 2', 'ชั้น 1', 'ห้อง 102'),
  ('ฝ่ายปฏิบัติการ (Operations)', 'อาคาร 1', 'ชั้น 1', 'ห้อง 105'),
  ('ฝ่ายบริหาร (Executive)', 'อาคาร 1', 'ชั้น 4', 'ห้อง 401')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.categories (name) VALUES
  ('Hardware (คอมพิวเตอร์/จอ/อุปกรณ์ต่อพ่วง)'),
  ('Software (โปรแกรม/Windows/Office)'),
  ('Network (อินเทอร์เน็ต/Wi-Fi/LAN)'),
  ('Printer & Scanner (เครื่องพิมพ์/หมึก)'),
  ('CCTV & Access Control (กล้องวงจรปิด/ประตูคีย์การ์ด)'),
  ('อื่นๆ (Other)')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.rooms (name, type, capacity, static_url, passcode) VALUES
  ('ห้องประชุมใหญ่ ชั้น 4 (Executive Boardroom)', 'onsite', 25, NULL, NULL),
  ('ห้องประชุมย่อย 1 (Meeting Room 1)', 'onsite', 10, NULL, NULL),
  ('ห้องประชุมย่อย 2 (Meeting Room 2)', 'onsite', 8, NULL, NULL),
  ('Zoom Corporate Account #1 (Pro Pool)', 'online', 300, 'https://zoom.us/j/8899001122', 'IT7890'),
  ('MS Teams Corporate Account #1', 'online', 250, 'https://teams.microsoft.com/l/meetup-join/corp-it-01', 'TEAM99')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.assets (asset_code, name, category, status) VALUES
  ('AST-NB-001', 'Dell Latitude 5420 (Core i5/16GB)', 'Notebook', 'available'),
  ('AST-NB-002', 'Lenovo ThinkPad E14 Gen 4', 'Notebook', 'available'),
  ('AST-PJ-001', 'Epson EB-X06 XGA Projector (3,600 lm)', 'Projector', 'available'),
  ('AST-SP-001', 'Jabra Speak 710 Wireless Speakerphone', 'Audio/Conference', 'available'),
  ('AST-AP-001', 'Presenter Wireless Clicker Logitech R500s', 'Accessory', 'available')
ON CONFLICT (asset_code) DO NOTHING;

INSERT INTO public.admin_users (name, email, role, title) VALUES
  ('ผู้ดูแลระบบสูงสุด (Super Administrator)', 'superadmin@company.local', 'superadmin', 'Super Administrator'),
  ('เจ้าหน้าที่ไอที (IT Support Administrator)', 'admin@company.local', 'admin', 'นักวิชาการคอมพิวเตอร์ปฏิบัติการ')
ON CONFLICT (email) DO NOTHING;
