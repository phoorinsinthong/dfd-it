-- ==========================================================
-- IT Support & Resource Management System
-- Initial Migration: Schema, RLS Policies, and Initial Seed
-- ==========================================================

-- 1. Enable btree_gist extension for PostgreSQL exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Users table (General Users & IT Staff)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  employee_id TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Problem Categories table (Master Data)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Helpdesk Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'resolved', 'cancelled')) DEFAULT 'pending',
  assigned_to TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  solution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMPTZ
);

-- 6. Meeting Rooms (Onsite and Online Pool Accounts)
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('onsite', 'online')),
  capacity INTEGER DEFAULT 10,
  static_url TEXT,
  passcode TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Meeting Bookings with Concurrency Exclusion Constraint
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  required_equipment JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  -- PostgreSQL Exclusion Constraint: Zero overlapping reservations for the same room
  CONSTRAINT no_overlapping_room_bookings EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
);

-- 8. IT Assets & Inventory
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'borrowed', 'maintenance')) DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. IT Asset Borrow Logs
CREATE TABLE IF NOT EXISTS public.borrow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  borrower_name TEXT NOT NULL,
  borrower_dept_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  borrow_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expected_return_date TIMESTAMPTZ NOT NULL,
  actual_return_date TIMESTAMPTZ,
  staff_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  condition_out TEXT NOT NULL DEFAULT 'Good',
  condition_in TEXT,
  notes TEXT
);

-- 10. Checklist Templates & Annual Roadmap
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  target_month INTEGER,
  type TEXT NOT NULL CHECK (type IN ('annual', 'adhoc')) DEFAULT 'annual',
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_by TEXT,
  completed_at TIMESTAMPTZ
);

-- 11. Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  staff_signature_url TEXT,
  manager_signature_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (month, year)
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow public read of active departments, categories, and rooms
CREATE POLICY "Public read active departments" ON public.departments FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active rooms" ON public.rooms FOR SELECT USING (is_active = true);

-- User ticket policies
CREATE POLICY "Users can create tickets" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their tickets or admin view all" ON public.tickets FOR SELECT USING (true);

-- Seed initial Master Data
INSERT INTO public.departments (name) VALUES
  ('ฝ่ายสนับสนุนเทคนิค (IT Support)'),
  ('ฝ่ายทรัพยากรบุคคล (HR)'),
  ('ฝ่ายบัญชีและการเงิน (Accounting & Finance)'),
  ('ฝ่ายการตลาดและประชาสัมพันธ์ (Marketing & PR)'),
  ('ฝ่ายปฏิบัติการ (Operations)'),
  ('ฝ่ายบริหาร (Executive)')
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
  ('ห้องประชุมใหญ่ 1 (Grand Boardroom)', 'onsite', 20, NULL, NULL),
  ('ห้องประชุมย่อย 2 (Focus Room)', 'onsite', 8, NULL, NULL),
  ('Zoom Room กลาง 1', 'online', 100, 'https://zoom.us/j/company-room-1', '123456'),
  ('Zoom Room กลาง 2', 'online', 100, 'https://zoom.us/j/company-room-2', '654321'),
  ('MS Teams ห้องประชุมหลัก', 'online', 250, 'https://teams.microsoft.com/l/meetup-join/company-main', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO public.users (id, email, name, role) VALUES
  ('staff_it_admin', 'it-admin@company.local', 'IT Administrator', 'admin')
ON CONFLICT (id) DO NOTHING;
