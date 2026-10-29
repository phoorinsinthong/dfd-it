-- ====================================================================
-- IT Support & Resource Management System
-- Migration: 005_complete_sync_all_modules.sql
-- Description: รวบยอดอัปเดตโครงสร้างฐานข้อมูลทุกโมดูลให้เชื่อมต่อ 100%
-- วิธีใช้: คัดลอกโค้ดทั้งหมดนี้ไปวางในหน้า Supabase SQL Editor แล้วกด "Run"
-- ====================================================================

-- 1. เปิด Extensions ที่จำเป็น
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 2. ปลด Foreign Key Constraints เพื่อความยืดหยุ่นในการบันทึกข้อมูล
-- ====================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
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
END $$;

-- ====================================================================
-- 3. ตรวจสอบและสร้าง/อัปเดตตารางข้อมูลหลัก (Master Data & Users)
-- ====================================================================

-- 3.1 Divisions (กองงาน / สำนัก)
CREATE TABLE IF NOT EXISTS public.divisions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.divisions ALTER COLUMN id TYPE TEXT USING id::text;

-- 3.2 Departments (แผนก / ฝ่าย)
CREATE TABLE IF NOT EXISTS public.departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  division_id TEXT,
  division_name TEXT,
  building TEXT,
  floor TEXT,
  room TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.departments ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.departments ALTER COLUMN division_id TYPE TEXT USING division_id::text;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS division_name TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS building TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS floor TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS room TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 3.3 Categories (หมวดหมู่งานแจ้งซ่อม)
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.categories ALTER COLUMN id TYPE TEXT USING id::text;

-- 3.4 Users (ผู้ใช้งานทั่วไป / พนักงาน)
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
ALTER TABLE public.users ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.users ALTER COLUMN division_id TYPE TEXT USING division_id::text;
ALTER TABLE public.users ALTER COLUMN department_id TYPE TEXT USING department_id::text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS division_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department_name TEXT;

-- 3.5 Admin Users (เจ้าหน้าที่ไอที / Superadmin)
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
ALTER TABLE public.admin_users ALTER COLUMN id TYPE TEXT USING id::text;

-- 3.6 Audit Logs (ประวัติการกระทำของระบบ)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  actor_id TEXT,
  actor_name TEXT NOT NULL,
  actor_email TEXT,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  target_id TEXT,
  target_name TEXT,
  details TEXT
);
ALTER TABLE public.audit_logs ALTER COLUMN id TYPE TEXT USING id::text;

-- ====================================================================
-- 4. ตารางงานแจ้งซ่อม (Helpdesk Tickets)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT,
  user_id TEXT,
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
  description TEXT,
  location TEXT,
  image_url TEXT,
  urgency TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to TEXT,
  assigned_to_name TEXT,
  solution_note TEXT,
  root_cause TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMPTZ
);

DO $$
BEGIN
  ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_assigned_to_fkey;
  ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_user_id_fkey;
  ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_division_id_fkey;
  ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_department_id_fkey;
  ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_category_id_fkey;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE public.tickets ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.tickets ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.tickets ALTER COLUMN division_id TYPE TEXT USING division_id::text;
ALTER TABLE public.tickets ALTER COLUMN department_id TYPE TEXT USING department_id::text;
ALTER TABLE public.tickets ALTER COLUMN category_id TYPE TEXT USING category_id::text;
ALTER TABLE public.tickets ALTER COLUMN assigned_to TYPE TEXT USING assigned_to::text;

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_number TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS user_employee_id TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS division_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS department_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS solution_note TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS root_cause TEXT;

-- ====================================================================
-- 5. ตารางห้องประชุมและการจอง (Meeting Rooms & Bookings)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'room',
  capacity INTEGER,
  static_url TEXT,
  passcode TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.rooms ALTER COLUMN id TYPE TEXT USING id::text;

CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  user_department TEXT,
  user_employee_id TEXT,
  user_phone TEXT,
  room_name TEXT,
  room_type TEXT,
  room_static_url TEXT,
  room_passcode TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  required_equipment JSONB DEFAULT '[]'::jsonb,
  is_walkin BOOLEAN DEFAULT false,
  booked_by_staff_id TEXT,
  booked_by_staff_name TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.bookings ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.bookings ALTER COLUMN room_id TYPE TEXT USING room_id::text;
ALTER TABLE public.bookings ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- เพิ่มคอลัมน์ที่ขาดใน bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_department TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_employee_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_type TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_static_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_passcode TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS required_equipment JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_walkin BOOLEAN DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booked_by_staff_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booked_by_staff_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS description TEXT;

-- Exclusion Constraint สำหรับป้องกันการจองชนกัน (Exclusion Constraint on gist)
DO $$
BEGIN
  ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlapping_room_bookings;
  ALTER TABLE public.bookings ADD CONSTRAINT no_overlapping_room_bookings EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  );
EXCEPTION WHEN others THEN NULL;
END $$;

-- ====================================================================
-- 6. ตารางครุภัณฑ์และการยืม-คืน (Assets & Borrow Logs)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.assets (
  id TEXT PRIMARY KEY,
  asset_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.assets ALTER COLUMN id TYPE TEXT USING id::text;

CREATE TABLE IF NOT EXISTS public.borrow_logs (
  id TEXT PRIMARY KEY,
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
  staff_id TEXT NOT NULL,
  staff_name TEXT,
  condition_out TEXT,
  condition_in TEXT,
  notes TEXT
);

ALTER TABLE public.borrow_logs ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.borrow_logs ALTER COLUMN asset_id TYPE TEXT USING asset_id::text;
ALTER TABLE public.borrow_logs ADD COLUMN IF NOT EXISTS asset_code TEXT;
ALTER TABLE public.borrow_logs ADD COLUMN IF NOT EXISTS asset_name TEXT;
ALTER TABLE public.borrow_logs ADD COLUMN IF NOT EXISTS borrower_division_id TEXT;
ALTER TABLE public.borrow_logs ADD COLUMN IF NOT EXISTS borrower_division_name TEXT;
ALTER TABLE public.borrow_logs ADD COLUMN IF NOT EXISTS borrower_dept_id TEXT;
ALTER TABLE public.borrow_logs ADD COLUMN IF NOT EXISTS borrower_dept_name TEXT;
ALTER TABLE public.borrow_logs ADD COLUMN IF NOT EXISTS staff_name TEXT;
ALTER TABLE public.borrow_logs ADD COLUMN IF NOT EXISTS condition_out TEXT;
ALTER TABLE public.borrow_logs ADD COLUMN IF NOT EXISTS condition_in TEXT;
ALTER TABLE public.borrow_logs ADD COLUMN IF NOT EXISTS notes TEXT;

-- ====================================================================
-- 7. ตารางแผนงานบำรุงรักษาเชิงป้องกัน (PM Roadmap & Templates)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.checklists (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  target_month INTEGER,
  target_month_end INTEGER,
  period_label TEXT,
  scheduled_months INTEGER[] DEFAULT '{}',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.checklists ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS target_month_end INTEGER;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS period_label TEXT;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS scheduled_months INTEGER[] DEFAULT '{}';
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT DEFAULT 'monthly',
  scheduled_months INTEGER[] DEFAULT '{}',
  period_label TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.checklist_templates ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.checklist_templates ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'monthly';
ALTER TABLE public.checklist_templates ADD COLUMN IF NOT EXISTS scheduled_months INTEGER[] DEFAULT '{}';
ALTER TABLE public.checklist_templates ADD COLUMN IF NOT EXISTS period_label TEXT;
ALTER TABLE public.checklist_templates ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ====================================================================
-- 8. ตารางรายงานประจำเดือนและลายเซ็น (Monthly Reports & Signatures)
-- ====================================================================
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
ALTER TABLE public.reports ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS staff_name TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS staff_title TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS staff_signature_type TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS supervisor_name TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS supervisor_title TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS supervisor_signature_type TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- ====================================================================
-- 9. ตารางเซิร์ฟเวอร์และตู้แร็ค 3D (Servers & 3D Cabinets)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'internal',
  rack_id TEXT,
  rack_name TEXT,
  unit_position INTEGER,
  unit_size INTEGER DEFAULT 1,
  ip_address TEXT NOT NULL,
  ilo_ip TEXT,
  public_ip TEXT,
  domain_name TEXT,
  cloud_provider TEXT,
  cloud_region TEXT,
  specs JSONB NOT NULL DEFAULT '{"cpu": "-", "ram": "-", "storage": "-"}'::jsonb,
  username TEXT DEFAULT 'admin',
  password TEXT,
  role_purpose TEXT,
  status TEXT NOT NULL DEFAULT 'online',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.servers ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.servers ALTER COLUMN unit_size DROP NOT NULL;
ALTER TABLE public.servers ALTER COLUMN unit_size SET DEFAULT 1;

-- ปลด Check Constraints เดิมจาก migration 004 (ที่บังคับตัวพิมพ์ใหญ่หรือ _) เพื่อป้องกันข้อผิดพลาด
DO $$
BEGIN
  ALTER TABLE public.servers DROP CONSTRAINT IF EXISTS servers_environment_check;
  ALTER TABLE public.servers DROP CONSTRAINT IF EXISTS servers_status_check;
  ALTER TABLE public.servers DROP CONSTRAINT IF EXISTS servers_rack_id_check;
EXCEPTION WHEN others THEN NULL;
END $$;

-- เพิ่มคอลัมน์ทั้งหมดของระบบเซิร์ฟเวอร์ (หากตารางถูกสร้างมาก่อนจาก 004 จะได้คอลัมน์ครบ 100%)
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS rack_name TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS public_ip TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS domain_name TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS cloud_provider TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS cloud_region TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS role_purpose TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- คอลัมน์รองรับ Backward Compatibility
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Sync ข้อมูลระหว่างคอลัมน์เดิม (004) และคอลัมน์ใหม่ (005)
UPDATE public.servers SET is_active = true WHERE is_active IS NULL;
UPDATE public.servers SET role_purpose = role WHERE role_purpose IS NULL AND role IS NOT NULL;
UPDATE public.servers SET domain_name = domain WHERE domain_name IS NULL AND domain IS NOT NULL;
UPDATE public.servers SET environment = LOWER(environment) WHERE environment IS NOT NULL;
UPDATE public.servers SET status = LOWER(status) WHERE status IS NOT NULL;
UPDATE public.servers SET rack_id = 'rack-1' WHERE rack_id = 'rack_1';
UPDATE public.servers SET rack_id = 'rack-2' WHERE rack_id = 'rack_2';
UPDATE public.servers 
SET rack_name = CASE 
  WHEN rack_id = 'rack-1' THEN 'Rack 1 (Core Infrastructure)'
  WHEN rack_id = 'rack-2' THEN 'Rack 2 (Storage & Virtualization)'
  ELSE rack_name
END
WHERE rack_name IS NULL AND rack_id IS NOT NULL;

-- เพิ่ม Check Constraints ที่ยืดหยุ่น รองรับทั้งตัวพิมพ์เล็ก-ใหญ่ และขีดกลาง-ขีดล่าง
DO $$
BEGIN
  ALTER TABLE public.servers ADD CONSTRAINT servers_environment_check 
    CHECK (LOWER(environment) IN ('internal', 'cloud'));
  ALTER TABLE public.servers ADD CONSTRAINT servers_status_check 
    CHECK (LOWER(status) IN ('online', 'offline', 'maintenance'));
  ALTER TABLE public.servers ADD CONSTRAINT servers_rack_id_check 
    CHECK (rack_id IS NULL OR rack_id IN ('rack-1', 'rack-2', 'rack_1', 'rack_2'));
EXCEPTION WHEN others THEN NULL;
END $$;


-- ====================================================================
-- 10. เปิดระบบ Row Level Security (RLS) และสร้าง Policies แบบเปิด
-- (ให้ Web App ที่ต่อผ่าน Anon Key สามารถอ่าน/เขียนได้ครบถ้วน)
-- ====================================================================

DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'divisions', 'departments', 'categories', 'users', 'admin_users',
    'audit_logs', 'tickets', 'rooms', 'bookings', 'assets',
    'borrow_logs', 'checklists', 'checklist_templates', 'reports', 'servers'
  ];
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

-- ====================================================================
-- 11. ข้อมูลตั้งต้นสำหรับตู้ Rack 3D และ Cloud Server (Pre-seed Servers)
-- ====================================================================
INSERT INTO public.servers (
  id, name, environment, rack_id, rack_name, unit_position, unit_size, ip_address, ilo_ip,
  public_ip, domain_name, cloud_provider, cloud_region,
  role_purpose, status, username, password, notes, specs, is_active
) VALUES
-- Rack 1: Core Network & Domain Controllers
('srv-int-1', 'DFD-SW01-CORE', 'internal', 'rack-1', 'Rack 1 (Core Infrastructure)', 41, 1, '192.168.1.1', '192.168.1.201', NULL, NULL, NULL, NULL, 'Core Switch 48-Port PoE+ & 10G SFP+ Uplinks', 'online', 'admin', 'C!scoCore@2026', 'เชื่อมต่อ Trunk ไปยัง Distribution Switch ทุกชั้น', '{"brand_model": "Cisco Catalyst 9300-48P", "cpu": "Multicore x86 Switch CPU", "ram": "16 GB", "storage": "128 GB SSD", "os": "Cisco IOS-XE 17.9"}'::jsonb, true),
('srv-int-2', 'DFD-FIREWALL01', 'internal', 'rack-1', 'Rack 1 (Core Infrastructure)', 39, 1, '192.168.1.254', '192.168.1.202', NULL, NULL, NULL, NULL, 'Next-Gen Firewall, IPS/IDS & SSL-VPN Gateway', 'online', 'admin', 'F0rtiG@te#2026', 'เชื่อมต่อ Fiber WAN 1 Gbps AIS & True Backup', '{"brand_model": "FortiGate 100F", "cpu": "Fortinet SPU NP6XLite + CP9", "ram": "8 GB", "storage": "64 GB Onboard", "os": "FortiOS 7.4.2"}'::jsonb, true),
('srv-int-3', 'DFD-DC01-AD-DNS', 'internal', 'rack-1', 'Rack 1 (Core Infrastructure)', 35, 2, '192.168.1.10', '192.168.1.203', NULL, 'dfd.local', NULL, NULL, 'Active Directory Domain Controller, DNS & DHCP Primary', 'online', 'administrator', 'W!ndowsAD#2026', 'คุม Domain Controller และ Active Directory ทั้งสำนัก', '{"brand_model": "Dell PowerEdge R650", "cpu": "Intel Xeon Silver 4314 (16 Cores)", "ram": "64 GB DDR4 ECC", "storage": "2x 480GB SSD RAID1", "os": "Windows Server 2022 Datacenter"}'::jsonb, true),
('srv-int-4', 'DFD-PVE01-CLUSTER', 'internal', 'rack-1', 'Rack 1 (Core Infrastructure)', 27, 2, '192.168.1.20', '192.168.1.204', NULL, NULL, NULL, NULL, 'Proxmox Virtual Environment - Virtualization Cluster Node 1', 'online', 'root', 'Pr0xmoxNode1#', 'โฮสต์ VM ระบบ ERP, Intranet Web และ File Sharing', '{"brand_model": "HPE ProLiant DL380 Gen10", "cpu": "2x Intel Xeon Gold 5218 (32 Cores)", "ram": "256 GB DDR4", "storage": "8x 1.92TB SAS SSD RAID6", "os": "Proxmox VE 8.1 / Debian 12"}'::jsonb, true),
('srv-int-5', 'DFD-UPS01-RACK1', 'internal', 'rack-1', 'Rack 1 (Core Infrastructure)', 1, 4, '192.168.1.250', NULL, NULL, NULL, NULL, NULL, 'Online Smart UPS 6000VA / 6kW Backup Power System', 'online', 'apcadmin', 'ApCUps#Rack1', 'สำรองไฟฟ้าตู้ Rack 1 ได้สูงสุด 45 นาทีเมื่อไฟดับ', '{"brand_model": "APC Smart-UPS SRT 6000VA RM", "cpu": "Microcontroller Unit", "ram": "512 MB", "storage": "Internal Battery Pack", "os": "APC NMC3 Firmware v2.5"}'::jsonb, true),

-- Rack 2: Storage & Virtualization Clusters
('srv-int-6', 'DFD-SW02-SAN', 'internal', 'rack-2', 'Rack 2 (Storage & Virtualization)', 41, 1, '192.168.1.2', '192.168.1.211', NULL, NULL, NULL, NULL, 'Storage Area Network 10GbE Switch for iSCSI/NFS', 'online', 'admin', 'C!scoSNA@2026', 'เชื่อมต่อ SAN Storage ความเร็ว 10 Gbps ไปยัง PVE Cluster', '{"brand_model": "Cisco Nexus 3000 Series", "cpu": "x86 Quad-core CPU", "ram": "16 GB", "storage": "64 GB Flash", "os": "NX-OS 9.3"}'::jsonb, true),
('srv-int-7', 'DFD-PVE02-CLUSTER', 'internal', 'rack-2', 'Rack 2 (Storage & Virtualization)', 33, 2, '192.168.1.21', '192.168.1.212', NULL, NULL, NULL, NULL, 'Proxmox Virtual Environment - Virtualization Cluster Node 2', 'online', 'root', 'Pr0xmoxNode2#', 'Node สำรองทำ HA (High Availability) และ Load Balancing', '{"brand_model": "HPE ProLiant DL380 Gen10", "cpu": "2x Intel Xeon Gold 5218 (32 Cores)", "ram": "256 GB DDR4", "storage": "8x 1.92TB SAS SSD RAID6", "os": "Proxmox VE 8.1 / Debian 12"}'::jsonb, true),
('srv-int-8', 'DFD-NAS01-STORAGE', 'internal', 'rack-2', 'Rack 2 (Storage & Virtualization)', 25, 4, '192.168.1.50', '192.168.1.213', NULL, 'nas.internal.dfd', NULL, NULL, 'Synology Enterprise NAS - Central Shared Storage 48TB', 'online', 'admin', 'Syn0logyNAS#2026', 'พื้นที่จัดเก็บไฟล์กลางของกองงานและ Backup สำรองข้อมูล', '{"brand_model": "Synology RackStation RS3621xs+", "cpu": "Intel Xeon D-1541 8-Core", "ram": "64 GB ECC DDR4", "storage": "12x 4TB Enterprise SAS HDD (48TB RAW)", "os": "DSM 7.2 Enterprise"}'::jsonb, true),
('srv-int-9', 'DFD-PBS01-BACKUP', 'internal', 'rack-2', 'Rack 2 (Storage & Virtualization)', 17, 2, '192.168.1.30', '192.168.1.214', NULL, NULL, NULL, NULL, 'Proxmox Backup Server (Deduplicated & Encrypted VM Backups)', 'online', 'root', 'PBSBackup#2026', 'สำรองข้อมูล VM ทุกเที่ยงคืนแบบ Incremental Deduplication', '{"brand_model": "Dell PowerEdge R740xd", "cpu": "Intel Xeon Silver 4210R (10 Cores)", "ram": "64 GB DDR4", "storage": "12x 8TB SATA RAIDZ2 (96TB RAW)", "os": "Proxmox Backup Server 3.1"}'::jsonb, true),
('srv-int-10', 'DFD-UPS02-RACK2', 'internal', 'rack-2', 'Rack 2 (Storage & Virtualization)', 1, 4, '192.168.1.251', NULL, NULL, NULL, NULL, NULL, 'Online Smart UPS 6000VA / 6kW Backup Power System', 'online', 'apcadmin', 'ApCUps#Rack2', 'สำรองไฟฟ้าตู้ Rack 2 ได้สูงสุด 45 นาทีเมื่อไฟดับ', '{"brand_model": "APC Smart-UPS SRT 6000VA RM", "cpu": "Microcontroller Unit", "ram": "512 MB", "storage": "Internal Battery Pack", "os": "APC NMC3 Firmware v2.5"}'::jsonb, true),

-- Cloud Servers
('srv-cloud-1', 'DFD-CLOUD-PROD-APP', 'cloud', NULL, NULL, NULL, 1, '76.76.21.21', NULL, '76.76.21.21', 'https://dfd-it-support.vercel.app', 'Vercel Serverless', 'Global Edge Network (sin1)', 'Vercel Next.js Production Web Application (Frontend & Edge)', 'online', 'developer', 'VercelDeploy#2026', 'โฮสต์ระบบหน้าเว็บ Next.js 16 Production ให้บริการผู้ใช้งาน', '{"brand_model": "Vercel Edge Platform", "cpu": "Serverless vCPU Auto-Scale", "ram": "1024 MB per function", "storage": "Ephemeral", "os": "Vercel Edge Runtime"}'::jsonb, true),
('srv-cloud-2', 'DFD-CLOUD-SUPABASE', 'cloud', NULL, NULL, NULL, 1, '18.143.120.45', NULL, '18.143.120.45', 'https://dppevpffhswbdfvavvfn.supabase.co', 'Supabase Cloud', 'AWS ap-southeast-1 (Singapore)', 'Supabase PostgreSQL Managed Database (Singapore Region)', 'online', 'postgres', 'SupabaseAdmin#2026', 'ฐานข้อมูลหลักของระบบ รองรับ RLS และ Realtime WebSocket', '{"brand_model": "Supabase Cloud (AWS Singapore)", "cpu": "2 vCPU Shared Compute", "ram": "4 GB RAM", "storage": "20 GB High IOPS NVMe", "os": "PostgreSQL 16.3 on Linux"}'::jsonb, true),
('srv-cloud-3', 'DFD-CLOUD-AWS-EC2', 'cloud', NULL, NULL, NULL, 1, '13.250.78.112', NULL, '13.250.78.112', 'api.internal.dfd', 'AWS EC2', 'ap-southeast-1 (Singapore)', 'AWS EC2 API Gateway & Background Scheduled Worker Services', 'online', 'ubuntu', 'AwsEc2Key#2026', 'รัน Worker Background Tasks, Cron Jobs และ LINE Webhook API', '{"brand_model": "AWS EC2 t3.medium Instance", "cpu": "2 vCPU (Up to 3.1 GHz)", "ram": "4 GB RAM", "storage": "50 GB gp3 SSD", "os": "Ubuntu Server 24.04 LTS"}'::jsonb, true),
('srv-cloud-4', 'DFD-CLOUD-CLOUDFLARE', 'cloud', NULL, NULL, NULL, 1, '104.21.44.89', NULL, '104.21.44.89', 'dfd-support.org', 'Cloudflare Edge', 'Global Anycast Network', 'Cloudflare Global DNS, WAF Security & Reverse Proxy Gateway', 'online', 'cloudflare', 'CFSecured#2026', 'ป้องกันการโจมตี DDoS Shield, WAF Firewall และ SSL Wildcard', '{"brand_model": "Cloudflare Global Anycast Network", "cpu": "Edge Computing", "ram": "Distributed Edge RAM", "storage": "KV Cache", "os": "Cloudflare Edge OS"}'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  environment = EXCLUDED.environment,
  rack_id = EXCLUDED.rack_id,
  rack_name = EXCLUDED.rack_name,
  unit_position = EXCLUDED.unit_position,
  unit_size = EXCLUDED.unit_size,
  ip_address = EXCLUDED.ip_address,
  ilo_ip = EXCLUDED.ilo_ip,
  public_ip = EXCLUDED.public_ip,
  domain_name = EXCLUDED.domain_name,
  cloud_provider = EXCLUDED.cloud_provider,
  cloud_region = EXCLUDED.cloud_region,
  role_purpose = EXCLUDED.role_purpose,
  status = EXCLUDED.status,
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  notes = EXCLUDED.notes,
  specs = EXCLUDED.specs,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Realtime publication สำหรับ Live Sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'servers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.servers;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;
