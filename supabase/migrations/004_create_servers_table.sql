-- ====================================================================
-- Migration: 004_create_servers_table.sql
-- Description: Creates the servers table for On-Premise Rack & Cloud Server Management
-- Free Tier Compatible: Yes (PostgreSQL + RLS)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN ('INTERNAL', 'CLOUD')),
    rack_id TEXT CHECK (rack_id IN ('rack_1', 'rack_2')),
    unit_position INTEGER,
    unit_size INTEGER NOT NULL DEFAULT 1,
    cloud_provider TEXT,
    ip_address TEXT NOT NULL,
    ilo_ip TEXT,
    domain TEXT,
    status TEXT NOT NULL DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'OFFLINE', 'MAINTENANCE')),
    role TEXT,
    os TEXT,
    model TEXT,
    specs JSONB NOT NULL DEFAULT '{"cpu": "-", "ram": "-", "storage": "-"}'::jsonb,
    username TEXT,
    password TEXT,
    notes TEXT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for rack lookups & collision queries
CREATE INDEX IF NOT EXISTS idx_servers_rack ON public.servers(rack_id, unit_position) WHERE environment = 'INTERNAL';
CREATE INDEX IF NOT EXISTS idx_servers_env ON public.servers(environment);
CREATE INDEX IF NOT EXISTS idx_servers_status ON public.servers(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public read servers" ON public.servers;
DROP POLICY IF EXISTS "Public insert servers" ON public.servers;
DROP POLICY IF EXISTS "Public update servers" ON public.servers;
DROP POLICY IF EXISTS "Public delete servers" ON public.servers;

-- Create open RLS policies (aligns with anon key direct access)
CREATE POLICY "Public read servers"
ON public.servers FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public insert servers"
ON public.servers FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public update servers"
ON public.servers FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Public delete servers"
ON public.servers FOR DELETE
TO anon, authenticated
USING (true);

-- Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'servers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.servers;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Pre-seed initial on-premise and cloud servers
INSERT INTO public.servers (
    id, name, environment, rack_id, unit_position, unit_size, cloud_provider,
    ip_address, ilo_ip, domain, status, role, os, model, specs, username, password, notes, tags
) VALUES
-- Rack 1: Network & Core
(
    'srv-rack1-core-sw01',
    'Core Switch SW-01 (Nexus 9300)',
    'INTERNAL',
    'rack_1',
    41,
    2,
    NULL,
    '10.10.0.1',
    '10.10.99.1',
    'sw-core01.internal.dfd',
    'ONLINE',
    'Core Distribution Switch 48-Port 10G/40G Uplink',
    'Cisco NX-OS 9.3(8)',
    'Cisco Nexus 93180YC-EX',
    '{"cpu": "Quad-Core Intel Xeon", "ram": "24 GB", "storage": "64 GB SSD"}'::jsonb,
    'admin',
    'Cisco!Core#9300',
    'เชื่อมต่อ Backbone ไฟเบอร์ออปติกไปยังตู้สาขาและห้องเซิร์ฟเวอร์สำรอง',
    '["Core", "Switch", "Cisco", "Network"]'::jsonb
),
(
    'srv-rack1-fw01',
    'Gateway Firewall HA-Primary',
    'INTERNAL',
    'rack_1',
    38,
    2,
    NULL,
    '10.10.0.254',
    '10.10.99.2',
    'fw-gateway01.internal.dfd',
    'ONLINE',
    'Next-Gen Firewall / VPN Concentrator',
    'FortiOS 7.4.2',
    'FortiGate 200F',
    '{"cpu": "FortiASIC CP9 + NP6XLite", "ram": "16 GB", "storage": "128 GB NVMe"}'::jsonb,
    'fwadmin',
    'FortiSecured!2026',
    'Active/Passive Cluster HA ร่วมกับตู้สำรอง ป้องกันการโจมตี DDoS และคุม SSL-VPN',
    '["Firewall", "Security", "Fortinet"]'::jsonb
),
(
    'srv-rack1-dc01',
    'DC01 Primary Active Directory',
    'INTERNAL',
    'rack_1',
    32,
    2,
    NULL,
    '10.10.1.10',
    '10.10.99.10',
    'dc01.dfd.local',
    'ONLINE',
    'Active Directory Domain Controller & DNS/DHCP',
    'Windows Server 2022 Datacenter',
    'Dell PowerEdge R650',
    '{"cpu": "Intel Xeon Silver 4314 (16C/32T)", "ram": "64 GB DDR4 ECC", "storage": "2x 960GB NVMe RAID1"}'::jsonb,
    'DFD\\Administrator',
    'P@ssw0rd!DC01',
    'ทำหน้าที่พิสูจน์ตัวตนผู้ใช้งาน พนักงาน และคอมพิวเตอร์ลูกข่ายทั้งองค์กร',
    '["Windows", "AD", "DNS", "Primary"]'::jsonb
),
(
    'srv-rack1-pve01',
    'Proxmox VE Virtualization Node 01',
    'INTERNAL',
    'rack_1',
    24,
    2,
    NULL,
    '10.10.1.21',
    '10.10.99.21',
    'pve01.dfd.local',
    'ONLINE',
    'Hypervisor Cluster Node 1 (VMs & LXC Containers)',
    'Debian Linux 12 / Proxmox VE 8.2',
    'HPE ProLiant DL380 Gen10',
    '{"cpu": "2x Intel Xeon Gold 5218 (32C/64T)", "ram": "256 GB DDR4", "storage": "4x 1.92TB SAS SSD RAID10"}'::jsonb,
    'root',
    'PveCluster!Node01',
    'โฮสต์ระบบงานภายใน, Web Intranet, ERP, Database, และ DNS สำรอง',
    '["Hypervisor", "Proxmox", "Cluster"]'::jsonb
),
(
    'srv-rack1-ups01',
    'Smart-UPS RT 6000VA Online (Rack 1)',
    'INTERNAL',
    'rack_1',
    1,
    4,
    NULL,
    '10.10.99.250',
    NULL,
    'ups01-rack1.internal.dfd',
    'ONLINE',
    'Uninterruptible Power Supply 6kVA / 6kW',
    'APC NMC3 Firmware v2.5',
    'APC Smart-UPS SRT 6000VA RM 230V',
    '{"cpu": "NMC3 Embedded", "ram": "512 MB", "storage": "Internal Battery Pack"}'::jsonb,
    'apcadmin',
    'APCpower!6000',
    'สำรองไฟให้ตู้ที่ 1 รองรับไฟดับได้นานสูงสุด 45 นาที พร้อมระบบตัดไฟฉุกเฉิน EPO',
    '["UPS", "Power", "APC", "Hardware"]'::jsonb
),

-- Rack 2: Storage & Virtualization
(
    'srv-rack2-sw02',
    'SAN & Storage Switch 25GbE',
    'INTERNAL',
    'rack_2',
    41,
    1,
    NULL,
    '10.10.0.12',
    '10.10.99.12',
    'sw-san01.internal.dfd',
    'ONLINE',
    'High-Speed SAN iSCSI Switch 25Gb SFP28',
    'Cisco NX-OS 9.3(8)',
    'Cisco Nexus 9336C-FX2',
    '{"cpu": "Quad-Core Intel", "ram": "24 GB", "storage": "64 GB SSD"}'::jsonb,
    'admin',
    'SanSw!Nexus9336',
    'เน็ตเวิร์กเชื่อมต่อจัดเก็บข้อมูลความเร็วสูง 25GbE ระหว่าง Node กับ Storage NAS',
    '["SAN", "Switch", "iSCSI", "25GbE"]'::jsonb
),
(
    'srv-rack2-nas01',
    'Enterprise Storage NAS / SAN 96TB',
    'INTERNAL',
    'rack_2',
    34,
    4,
    NULL,
    '10.10.2.100',
    '10.10.99.100',
    'nas-storage01.dfd.local',
    'ONLINE',
    'Central Storage Repository (iSCSI, SMB, NFS)',
    'Synology DSM 7.2 Enterprise',
    'Synology RackStation RS3621xs+',
    '{"cpu": "Intel Xeon D-1541 (8C/16T)", "ram": "64 GB ECC DDR4", "storage": "12x 8TB Enterprise SAS (96TB Raw RAID6)"}'::jsonb,
    'admin',
    'SynoStorage!96TB',
    'จัดเก็บข้อมูลไฟล์ส่วนกลางของทุกสำนัก กองงาน และเป็น LUN Target สำหรับ Proxmox Backup',
    '["Storage", "NAS", "Synology", "RAID6"]'::jsonb
),
(
    'srv-rack2-pve02',
    'Proxmox VE Virtualization Node 02',
    'INTERNAL',
    'rack_2',
    28,
    2,
    NULL,
    '10.10.1.22',
    '10.10.99.22',
    'pve02.dfd.local',
    'ONLINE',
    'Hypervisor Cluster Node 2 (High Availability Failover)',
    'Debian Linux 12 / Proxmox VE 8.2',
    'HPE ProLiant DL380 Gen10',
    '{"cpu": "2x Intel Xeon Gold 5218 (32C/64T)", "ram": "256 GB DDR4", "storage": "4x 1.92TB SAS SSD RAID10"}'::jsonb,
    'root',
    'PveCluster!Node02',
    'ทำงานแบบ High-Availability (HA) คู่ขนานกับ Node 01 หากตู้แรกดับ จะโยก VM มาทำงานต่อทันที',
    '["Hypervisor", "Proxmox", "Cluster", "HA"]'::jsonb
),
(
    'srv-rack2-pbs01',
    'Proxmox Backup Server (PBS)',
    'INTERNAL',
    'rack_2',
    20,
    2,
    NULL,
    '10.10.1.30',
    '10.10.99.30',
    'pbs01.dfd.local',
    'ONLINE',
    'Deduplicated Enterprise VM Backup Appliance',
    'Proxmox Backup Server 3.1',
    'Dell PowerEdge R740xd',
    '{"cpu": "Intel Xeon Silver 4210R", "ram": "64 GB DDR4", "storage": "8x 4TB SATA Enterprise RAIDZ2"}'::jsonb,
    'backupadmin',
    'PBS!SecureBackup2026',
    'ระบบสำรองข้อมูล VM ประจำวันพร้อมเทคโนโลยีลดการซ้ำซ้อนของข้อมูล (Deduplication) และเข้ารหัส SHA-256',
    '["Backup", "PBS", "Dell", "DisasterRecovery"]'::jsonb
),
(
    'srv-rack2-ups02',
    'Smart-UPS RT 6000VA Online (Rack 2)',
    'INTERNAL',
    'rack_2',
    1,
    4,
    NULL,
    '10.10.99.251',
    NULL,
    'ups02-rack2.internal.dfd',
    'ONLINE',
    'Uninterruptible Power Supply 6kVA / 6kW',
    'APC NMC3 Firmware v2.5',
    'APC Smart-UPS SRT 6000VA RM 230V',
    '{"cpu": "NMC3 Embedded", "ram": "512 MB", "storage": "Internal Battery Pack"}'::jsonb,
    'apcadmin',
    'APCpower!6000Rack2',
    'สำรองไฟให้ตู้ที่ 2 แยกเบรกเกอร์วงจรคนละเฟสเพื่อความปลอดภัยสูงสุด',
    '["UPS", "Power", "APC", "Hardware"]'::jsonb
),

-- Cloud Servers
(
    'srv-cloud-vercel-prod',
    'Next.js Web Frontend & PWA',
    'CLOUD',
    NULL,
    NULL,
    1,
    'Vercel Edge Cloud',
    '76.76.21.21',
    NULL,
    'dfd-it-support.vercel.app',
    'ONLINE',
    'Production Web Application & Service Portal',
    'Vercel Edge Runtime (Serverless)',
    'Vercel Serverless Function',
    '{"cpu": "Edge vCPU Auto-Scale", "ram": "1024 MB per invocation", "storage": "Ephemeral SSD"}'::jsonb,
    'admin@dfd-it-support.org',
    'VercelToken!2026Secure',
    'ระบบหน้าบ้าน IT Support Hub ให้บริการแจ้งซ่อม จองห้อง และยืมคืนอุปกรณ์ เชื่อมโยง Supabase DB',
    '["Frontend", "Vercel", "Next.js", "Production"]'::jsonb
),
(
    'srv-cloud-supabase-db',
    'Supabase PostgreSQL Production DB',
    'CLOUD',
    NULL,
    NULL,
    1,
    'Supabase (AWS Singapore ap-southeast-1)',
    '18.143.120.45',
    NULL,
    'wubyfxmscxdfdwyqiqoa.supabase.co',
    'ONLINE',
    'Primary Relational Database & Realtime WebSocket',
    'PostgreSQL 16.3 on Linux',
    'AWS EC2 Compute Instance (Supabase Hosted)',
    '{"cpu": "2 vCPU Compute", "ram": "4 GB RAM", "storage": "20 GB High IOPS SSD"}'::jsonb,
    'postgres',
    'wubyfxmscxdfdwyqiqoa!Admin#2026',
    'ฐานข้อมูลหลักของระบบ พร้อม Row Level Security (RLS) และตาราง Audit Logs',
    '["Database", "PostgreSQL", "Supabase", "Cloud"]'::jsonb
),
(
    'srv-cloud-aws-ec2-api',
    'AWS Backend API & LINE Webhook Server',
    'CLOUD',
    NULL,
    NULL,
    1,
    'Amazon Web Services (AWS Singapore)',
    '13.250.78.112',
    NULL,
    'api-line.dfd-support.internal',
    'ONLINE',
    'FastAPI / Node.js Microservices & LINE Flex Bot Engine',
    'Ubuntu Server 24.04 LTS',
    'AWS EC2 t3.medium',
    '{"cpu": "2 vCPU AMD EPYC 7000", "ram": "4 GB DDR4", "storage": "50 GB gp3 SSD"}'::jsonb,
    'ubuntu',
    'AWS!Ec2LineBot#Key2026',
    'โฮสต์ LINE Bot Webhook รับส่งข้อความแจ้งเตือนช่างไอที และสรุปรายงานประจำสัปดาห์',
    '["AWS", "EC2", "LINE-Bot", "FastAPI"]'::jsonb
),
(
    'srv-cloud-cloudflare-dns',
    'Cloudflare DNS & WAF Gateway',
    'CLOUD',
    NULL,
    NULL,
    1,
    'Cloudflare Edge Global Anycast',
    '104.21.44.89',
    NULL,
    'cloudflare.com (Zone: dfd-it.org)',
    'ONLINE',
    'Global Anycast DNS, SSL Termination & DDoS Shield',
    'Cloudflare CoreOS',
    'Global Anycast Edge Network',
    '{"cpu": "Cloudflare Workers Edge", "ram": "128 MB Worker RAM", "storage": "KV Cache Distributed"}'::jsonb,
    'security@dfd-it.org',
    'CF!GlobalKeyToken9928',
    'ป้องกันการโจมตีทางไซเบอร์ คุม SSL Wildcard Certificate และทำ Reverse Proxy ซ่อน IP จริง',
    '["Cloudflare", "DNS", "Security", "WAF"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    environment = EXCLUDED.environment,
    rack_id = EXCLUDED.rack_id,
    unit_position = EXCLUDED.unit_position,
    unit_size = EXCLUDED.unit_size,
    cloud_provider = EXCLUDED.cloud_provider,
    ip_address = EXCLUDED.ip_address,
    ilo_ip = EXCLUDED.ilo_ip,
    domain = EXCLUDED.domain,
    status = EXCLUDED.status,
    role = EXCLUDED.role,
    os = EXCLUDED.os,
    model = EXCLUDED.model,
    specs = EXCLUDED.specs,
    username = EXCLUDED.username,
    password = EXCLUDED.password,
    notes = EXCLUDED.notes,
    tags = EXCLUDED.tags,
    updated_at = NOW();
