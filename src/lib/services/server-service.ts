import { ServerRecord, ServerEnvironment, ServerStatus, RackId, ServerSpecs } from '@/types/database';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const INITIAL_SERVERS: ServerRecord[] = [
  // --- Rack 1: Core Infrastructure & Domain Controllers ---
  {
    id: 'srv-int-1',
    name: 'DFD-SW01-CORE',
    environment: 'internal',
    rack_id: 'rack-1',
    rack_name: 'Rack 1 (Core Infrastructure)',
    unit_position: 41,
    unit_size: 1,
    ip_address: '192.168.1.1',
    ilo_ip: '192.168.1.201',
    specs: {
      brand_model: 'Cisco Catalyst 9300-48P',
      cpu: 'Multicore x86 Switch CPU',
      ram: '16 GB',
      storage: '128 GB SSD',
      os: 'Cisco IOS-XE 17.9',
    },
    username: 'admin',
    password: 'C!scoCore@2026',
    role_purpose: 'Core Switch 48-Port PoE+ & 10G SFP+ Uplinks',
    status: 'online',
    notes: 'เชื่อมต่อ Trunk ไปยัง Distribution Switch ทุกชั้น',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'srv-int-2',
    name: 'DFD-FIREWALL01',
    environment: 'internal',
    rack_id: 'rack-1',
    rack_name: 'Rack 1 (Core Infrastructure)',
    unit_position: 39,
    unit_size: 1,
    ip_address: '192.168.1.254',
    ilo_ip: '192.168.1.202',
    specs: {
      brand_model: 'FortiGate 100F',
      cpu: 'Fortinet SPU NP6XLite + CP9',
      ram: '8 GB',
      storage: '64 GB Onboard',
      os: 'FortiOS 7.4.2',
    },
    username: 'admin',
    password: 'F0rtiG@te#2026',
    role_purpose: 'Next-Gen Firewall, IPS/IDS & SSL-VPN Gateway',
    status: 'online',
    notes: 'เชื่อมต่อ Fiber WAN 1 Gbps AIS & True Backup',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'srv-int-3',
    name: 'DFD-DC01-AD-DNS',
    environment: 'internal',
    rack_id: 'rack-1',
    rack_name: 'Rack 1 (Core Infrastructure)',
    unit_position: 30,
    unit_size: 2,
    ip_address: '192.168.10.10',
    ilo_ip: '192.168.10.210',
    specs: {
      brand_model: 'Dell PowerEdge R650',
      cpu: '2x Intel Xeon Silver 4314 (32 Cores)',
      ram: '64 GB DDR4 ECC',
      storage: '4x 960GB SAS SSD RAID 1',
      os: 'Windows Server 2022 Datacenter',
    },
    username: 'administrator',
    password: 'DFD_Adm!n2026',
    role_purpose: 'Primary Active Directory Domain Controller, DNS & DHCP',
    status: 'online',
    notes: 'ดูแลระบบยืนยันตัวตน User ทั่วทั้งองค์กร',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'srv-int-4',
    name: 'DFD-DC02-BACKUP',
    environment: 'internal',
    rack_id: 'rack-1',
    rack_name: 'Rack 1 (Core Infrastructure)',
    unit_position: 26,
    unit_size: 2,
    ip_address: '192.168.10.11',
    ilo_ip: '192.168.10.211',
    specs: {
      brand_model: 'Dell PowerEdge R650',
      cpu: '2x Intel Xeon Silver 4314 (32 Cores)',
      ram: '64 GB DDR4 ECC',
      storage: '4x 960GB SAS SSD RAID 1',
      os: 'Windows Server 2022 Datacenter',
    },
    username: 'administrator',
    password: 'DFD_Adm!n2026',
    role_purpose: 'Secondary Domain Controller & Failover DNS',
    status: 'online',
    notes: 'ทำ Active Directory Replication คู่กับ DC01',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'srv-int-5',
    name: 'DFD-UPS01-RACK',
    environment: 'internal',
    rack_id: 'rack-1',
    rack_name: 'Rack 1 (Core Infrastructure)',
    unit_position: 1,
    unit_size: 4,
    ip_address: '192.168.10.250',
    specs: {
      brand_model: 'APC Smart-UPS RT 5000VA On-Line',
      cpu: 'APC Network Management Card 3',
      ram: '1 GB',
      storage: 'NVRAM',
      os: 'Schneider Electric APC NMC Firmware',
    },
    username: 'apc',
    password: 'ApcPower!99',
    role_purpose: 'Central Rack 1 Power Backup (5kVA On-Line)',
    status: 'online',
    notes: 'แบตเตอรี่สำรองไฟได้สูงสุด 45 นาทีเมื่อไฟดับ',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },

  // --- Rack 2: Virtualization & Storage Cluster ---
  {
    id: 'srv-int-6',
    name: 'DFD-ESXI-HOST01',
    environment: 'internal',
    rack_id: 'rack-2',
    rack_name: 'Rack 2 (Storage & Virtualization)',
    unit_position: 36,
    unit_size: 2,
    ip_address: '192.168.10.21',
    ilo_ip: '192.168.10.221',
    specs: {
      brand_model: 'HPE ProLiant DL380 Gen10',
      cpu: '2x Intel Xeon Gold 6248R (48 Cores)',
      ram: '256 GB DDR4 ECC',
      storage: '2x 480GB SSD Boot + SAN Attached',
      os: 'VMware ESXi 8.0 Update 2',
    },
    username: 'root',
    password: 'VmwareEsx!#1',
    role_purpose: 'VMware ESXi Node 1 (ERP, Web App & Database VMs)',
    status: 'online',
    notes: 'เชื่อมต่อ Fiber Channel 16G ไปยัง SAN Storage',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'srv-int-7',
    name: 'DFD-ESXI-HOST02',
    environment: 'internal',
    rack_id: 'rack-2',
    rack_name: 'Rack 2 (Storage & Virtualization)',
    unit_position: 32,
    unit_size: 2,
    ip_address: '192.168.10.22',
    ilo_ip: '192.168.10.222',
    specs: {
      brand_model: 'HPE ProLiant DL380 Gen10',
      cpu: '2x Intel Xeon Gold 6248R (48 Cores)',
      ram: '256 GB DDR4 ECC',
      storage: '2x 480GB SSD Boot + SAN Attached',
      os: 'VMware ESXi 8.0 Update 2',
    },
    username: 'root',
    password: 'VmwareEsx!#2',
    role_purpose: 'VMware ESXi Node 2 (HA Failover Node)',
    status: 'online',
    notes: 'ตั้งค่า vSphere HA / DRS อัตโนมัติ',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'srv-int-8',
    name: 'DFD-SAN-STORAGE01',
    environment: 'internal',
    rack_id: 'rack-2',
    rack_name: 'Rack 2 (Storage & Virtualization)',
    unit_position: 24,
    unit_size: 4,
    ip_address: '192.168.10.50',
    specs: {
      brand_model: 'Synology Enterprise SA3600',
      cpu: 'Intel Xeon D-1567 (12 Cores)',
      ram: '64 GB ECC DDR4',
      storage: '12x 8TB SAS Enterprise HDD (72TB Net RAID 6)',
      os: 'Synology DSM 7.2 Enterprise',
    },
    username: 'admin',
    password: 'SynoStorage!88',
    role_purpose: 'Enterprise SAN/iSCSI LUNs & Shared File Repository',
    status: 'online',
    notes: 'มี 10GbE SFP+ x4 พอร์ตสำหรับ iSCSI Traffic',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'srv-int-9',
    name: 'DFD-BACKUP-VEEAM',
    environment: 'internal',
    rack_id: 'rack-2',
    rack_name: 'Rack 2 (Storage & Virtualization)',
    unit_position: 18,
    unit_size: 2,
    ip_address: '192.168.10.60',
    ilo_ip: '192.168.10.225',
    specs: {
      brand_model: 'Dell PowerEdge R740',
      cpu: '2x Intel Xeon Silver 4210',
      ram: '128 GB DDR4',
      storage: '8x 4TB SATA HDD RAID 5',
      os: 'Windows Server 2022 + Veeam Backup & Replication 12',
    },
    username: 'administrator',
    password: 'VeeamB@ckup2026',
    role_purpose: 'Veeam Daily Backup Repository & Snapshot Scheduler',
    status: 'online',
    notes: 'สำรองข้อมูลทุกคืนเวลา 23:00 น. และ Sync ขึ้น Cloud',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'srv-int-10',
    name: 'DFD-UPS02-RACK',
    environment: 'internal',
    rack_id: 'rack-2',
    rack_name: 'Rack 2 (Storage & Virtualization)',
    unit_position: 1,
    unit_size: 4,
    ip_address: '192.168.10.251',
    specs: {
      brand_model: 'APC Smart-UPS RT 5000VA On-Line',
      cpu: 'APC Network Management Card 3',
      ram: '1 GB',
      storage: 'NVRAM',
      os: 'Schneider Electric APC NMC Firmware',
    },
    username: 'apc',
    password: 'ApcPower!99',
    role_purpose: 'Central Rack 2 Power Backup (5kVA On-Line)',
    status: 'online',
    notes: 'จ่ายไฟให้ Storage Array และ ESXi Host',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },

  // --- Cloud / Online Servers ---
  {
    id: 'srv-cld-1',
    name: 'DFD-CLOUD-WEB01',
    environment: 'cloud',
    ip_address: '10.0.0.12',
    public_ip: '54.255.88.192',
    domain_name: 'portal.dfd-support.internal',
    cloud_provider: 'AWS EC2',
    cloud_region: 'ap-southeast-1 (Singapore)',
    specs: {
      brand_model: 'AWS EC2 t3.xlarge',
      cpu: '4 vCPU (AWS Nitro)',
      ram: '16 GB',
      storage: '100 GB gp3 NVMe SSD',
      os: 'Ubuntu 24.04 LTS',
    },
    username: 'ubuntu',
    password: 'SSH Key: ~/.ssh/dfd-prod-key.pem',
    role_purpose: 'Web Portal & API Gateway Production',
    status: 'online',
    notes: 'เชื่อมต่อผ่าน Application Load Balancer พร้อม SSL Certificate',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'srv-cld-2',
    name: 'DFD-CLOUD-DB-RDS',
    environment: 'cloud',
    ip_address: '10.0.1.50',
    public_ip: 'Private Endpoint',
    domain_name: 'db-master.dfd-prod.internal',
    cloud_provider: 'AWS RDS',
    cloud_region: 'ap-southeast-1 (Singapore)',
    specs: {
      brand_model: 'AWS RDS Multi-AZ db.m6g.large',
      cpu: '2 vCPU (Graviton 2)',
      ram: '8 GB',
      storage: '250 GB io2 SSD (3000 IOPS)',
      os: 'PostgreSQL 16.2',
    },
    username: 'postgres',
    password: 'RDS_Postgres!2026',
    role_purpose: 'Main Relational Database (Multi-AZ Standby)',
    status: 'online',
    notes: 'ทำ Automated Backup รายวัน และ Read Replica',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'srv-cld-3',
    name: 'DFD-APP-VERCEL-PROD',
    environment: 'cloud',
    ip_address: '76.76.21.21',
    public_ip: '76.76.21.21',
    domain_name: 'https://dfd-it-support.vercel.app',
    cloud_provider: 'Vercel Serverless',
    cloud_region: 'Global Edge Network (sin1)',
    specs: {
      brand_model: 'Vercel Serverless Function & Edge Network',
      cpu: 'Auto-scaling Microvm',
      ram: '1024 MB per execution',
      storage: 'Serverless Edge Cache',
      os: 'Next.js 16.4 Edge Runtime',
    },
    username: 'phoorinminchainunt@gmail.com',
    password: 'SSO / GitHub OAuth Connected',
    role_purpose: 'Next.js Frontend & Public Portal Deployments',
    status: 'online',
    notes: 'Continuous Deployment อัตโนมัติจาก GitHub Repository',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'srv-cld-4',
    name: 'DFD-CLOUD-BACKUP-VAULT',
    environment: 'cloud',
    ip_address: '172.64.80.1',
    public_ip: 'vault.dfd-storage.cloud',
    domain_name: 'vault.dfd-storage.cloud',
    cloud_provider: 'Cloudflare R2 / S3',
    cloud_region: 'APAC Regional Storage',
    specs: {
      brand_model: 'Object Storage Bucket (Encrypted AES-256)',
      cpu: 'Serverless Storage API',
      ram: 'N/A',
      storage: '5 TB Allocated Cold Vault',
      os: 'S3-Compatible API',
    },
    username: 'dfd-backup-agent',
    password: 'CF_AccessKey_88921a99b4d0',
    role_purpose: 'Off-site Immutable Backup Repository',
    status: 'online',
    notes: 'เก็บ Snapshot ย้อนหลัง 90 วัน แบบป้องกันการลบ (Object Lock)',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

let serversStore: ServerRecord[] = JSON.parse(JSON.stringify(INITIAL_SERVERS));

export function resetServerStore() {
  serversStore = JSON.parse(JSON.stringify(INITIAL_SERVERS));
}

export interface GetServersFilter {
  environment?: ServerEnvironment | 'all';
  rackId?: RackId | 'all';
  status?: ServerStatus | 'all';
  search?: string;
}

export async function getServers(filter?: GetServersFilter): Promise<ServerRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        if (data.length > 0) {
          serversStore = data as ServerRecord[];
        } else {
          // If Supabase table is empty, seed initial servers
          for (const s of INITIAL_SERVERS) {
            await supabase.from('servers').upsert(s, { onConflict: 'id' });
          }
        }
      }
    } catch (e) {
      console.warn('Supabase getServers warning:', e);
    }
  }

  let result = [...serversStore].filter((s) => s.is_active);

  if (filter?.environment && filter.environment !== 'all') {
    result = result.filter((s) => s.environment === filter.environment);
  }

  if (filter?.rackId && filter.rackId !== 'all') {
    result = result.filter((s) => s.rack_id === filter.rackId);
  }

  if (filter?.status && filter.status !== 'all') {
    result = result.filter((s) => s.status === filter.status);
  }

  if (filter?.search?.trim()) {
    const q = filter.search.toLowerCase().trim();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.ip_address.toLowerCase().includes(q) ||
        (s.public_ip && s.public_ip.toLowerCase().includes(q)) ||
        (s.role_purpose && s.role_purpose.toLowerCase().includes(q)) ||
        (s.specs?.brand_model && s.specs.brand_model.toLowerCase().includes(q))
    );
  }

  return result;
}

export async function getServerById(id: string): Promise<ServerRecord | null> {
  const found = serversStore.find((s) => s.id === id);
  if (found) return { ...found };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('servers').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        return data as ServerRecord;
      }
    } catch (e) {
      console.warn('Supabase getServerById warning:', e);
    }
  }

  return null;
}

export interface CreateServerInput {
  name: string;
  environment: ServerEnvironment;
  rackId?: RackId;
  unitPosition?: number;
  unitSize?: number;
  ipAddress: string;
  iloIp?: string;
  publicIp?: string;
  domainName?: string;
  cloudProvider?: string;
  cloudRegion?: string;
  specs: ServerSpecs;
  username: string;
  password?: string;
  rolePurpose: string;
  status?: ServerStatus;
  notes?: string;
  actor?: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
}

export async function createServer(
  input: CreateServerInput
): Promise<{ success: boolean; data?: ServerRecord; error?: string }> {
  if (!input.name?.trim()) {
    return { success: false, error: 'กรุณาระบุชื่อเซิร์ฟเวอร์' };
  }
  if (!input.ipAddress?.trim()) {
    return { success: false, error: 'กรุณาระบุ IP Address หรือ Endpoint' };
  }

  // Validate rack collision if internal
  if (input.environment === 'internal' && input.rackId && input.unitPosition) {
    const unitSize = input.unitSize || 1;
    const startU = input.unitPosition;
    const endU = startU + unitSize - 1;

    if (startU < 1 || endU > 42) {
      return { success: false, error: 'ตำแหน่ง Unit Slot ต้องอยู่ระหว่าง 1U ถึง 42U' };
    }

    const collision = serversStore.some((s) => {
      if (s.environment !== 'internal' || s.rack_id !== input.rackId || !s.is_active) return false;
      const sStart = s.unit_position || 1;
      const sEnd = sStart + (s.unit_size || 1) - 1;
      return !(endU < sStart || startU > sEnd);
    });

    if (collision) {
      return {
        success: false,
        error: `ตำแหน่ง U${startU}-U${endU} ในตู้ ${input.rackId === 'rack-1' ? 'Rack 1' : 'Rack 2'} มีอุปกรณ์อื่นติดตั้งอยู่แล้ว`,
      };
    }
  }

  const rackName =
    input.rackId === 'rack-1'
      ? 'Rack 1 (Core Infrastructure)'
      : input.rackId === 'rack-2'
      ? 'Rack 2 (Storage & Virtualization)'
      : undefined;

  const newServer: ServerRecord = {
    id: `srv-${Date.now().toString().slice(-6)}`,
    name: input.name.trim(),
    environment: input.environment,
    rack_id: input.rackId,
    rack_name: rackName,
    unit_position: input.unitPosition,
    unit_size: input.unitSize || (input.environment === 'internal' ? 1 : undefined),
    ip_address: input.ipAddress.trim(),
    ilo_ip: input.iloIp?.trim() || undefined,
    public_ip: input.publicIp?.trim() || undefined,
    domain_name: input.domainName?.trim() || undefined,
    cloud_provider: input.cloudProvider?.trim() || undefined,
    cloud_region: input.cloudRegion?.trim() || undefined,
    specs: {
      cpu: input.specs?.cpu?.trim() || undefined,
      ram: input.specs?.ram?.trim() || undefined,
      storage: input.specs?.storage?.trim() || undefined,
      os: input.specs?.os?.trim() || undefined,
      brand_model: input.specs?.brand_model?.trim() || undefined,
    },
    username: input.username?.trim() || 'admin',
    password: input.password || undefined,
    role_purpose: input.rolePurpose?.trim() || 'General Server',
    status: input.status || 'online',
    notes: input.notes?.trim() || undefined,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('servers').insert(newServer).select().single();
      if (!error && data) {
        newServer.id = data.id;
        newServer.created_at = data.created_at;
      }
    } catch (e) {
      console.warn('Supabase createServer warning:', e);
    }
  }

  serversStore.unshift(newServer);

  if (input.actor) {
    try {
      const { recordAuditLog } = await import('./audit-log-service');
      await recordAuditLog({
        actorId: input.actor.id,
        actorName: input.actor.name,
        actorEmail: input.actor.email,
        actorRole: input.actor.role,
        action: 'CREATE',
        module: 'SERVER',
        targetId: newServer.id,
        targetName: newServer.name,
        details: `เพิ่มเซิร์ฟเวอร์ใหม่: ${newServer.name} (${newServer.environment === 'internal' ? `ตู้ ${newServer.rack_name} U${newServer.unit_position}` : `Cloud: ${newServer.cloud_provider}`}) IP: ${newServer.ip_address}`,
      });
    } catch (auditErr) {
      console.warn('Audit log error in createServer:', auditErr);
    }
  }

  return { success: true, data: newServer };
}

export interface UpdateServerInput {
  name?: string;
  environment?: ServerEnvironment;
  rackId?: RackId;
  unitPosition?: number;
  unitSize?: number;
  ipAddress?: string;
  iloIp?: string;
  publicIp?: string;
  domainName?: string;
  cloudProvider?: string;
  cloudRegion?: string;
  specs?: ServerSpecs;
  username?: string;
  password?: string;
  rolePurpose?: string;
  status?: ServerStatus;
  notes?: string;
  actor?: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
}

export async function updateServer(
  id: string,
  input: UpdateServerInput
): Promise<{ success: boolean; data?: ServerRecord; error?: string }> {
  const target = serversStore.find((s) => s.id === id);
  if (!target) {
    return { success: false, error: 'ไม่พบเซิร์ฟเวอร์ที่ต้องการแก้ไข' };
  }

  const newRackId = input.rackId !== undefined ? input.rackId : target.rack_id;
  const newStartU = input.unitPosition !== undefined ? input.unitPosition : target.unit_position;
  const newUnitSize = input.unitSize !== undefined ? input.unitSize : (target.unit_size || 1);
  const newEnv = input.environment !== undefined ? input.environment : target.environment;

  // Validate collision if internal
  if (newEnv === 'internal' && newRackId && newStartU) {
    const endU = newStartU + newUnitSize - 1;
    if (newStartU < 1 || endU > 42) {
      return { success: false, error: 'ตำแหน่ง Unit Slot ต้องอยู่ระหว่าง 1U ถึง 42U' };
    }

    const collision = serversStore.some((s) => {
      if (s.id === id || s.environment !== 'internal' || s.rack_id !== newRackId || !s.is_active) return false;
      const sStart = s.unit_position || 1;
      const sEnd = sStart + (s.unit_size || 1) - 1;
      return !(endU < sStart || newStartU > sEnd);
    });

    if (collision) {
      return {
        success: false,
        error: `ตำแหน่ง U${newStartU}-U${endU} ในตู้ ${newRackId === 'rack-1' ? 'Rack 1' : 'Rack 2'} มีอุปกรณ์อื่นติดตั้งอยู่แล้ว`,
      };
    }
  }

  if (input.name) target.name = input.name.trim();
  if (input.environment) target.environment = input.environment;
  if (input.rackId !== undefined) {
    target.rack_id = input.rackId;
    target.rack_name =
      input.rackId === 'rack-1'
        ? 'Rack 1 (Core Infrastructure)'
        : input.rackId === 'rack-2'
        ? 'Rack 2 (Storage & Virtualization)'
        : undefined;
  }
  if (input.unitPosition !== undefined) target.unit_position = input.unitPosition;
  if (input.unitSize !== undefined) target.unit_size = input.unitSize;
  if (input.ipAddress) target.ip_address = input.ipAddress.trim();
  if (input.iloIp !== undefined) target.ilo_ip = input.iloIp.trim() || undefined;
  if (input.publicIp !== undefined) target.public_ip = input.publicIp.trim() || undefined;
  if (input.domainName !== undefined) target.domain_name = input.domainName.trim() || undefined;
  if (input.cloudProvider !== undefined) target.cloud_provider = input.cloudProvider.trim() || undefined;
  if (input.cloudRegion !== undefined) target.cloud_region = input.cloudRegion.trim() || undefined;
  if (input.specs) {
    target.specs = {
      cpu: input.specs.cpu !== undefined ? input.specs.cpu.trim() : target.specs.cpu,
      ram: input.specs.ram !== undefined ? input.specs.ram.trim() : target.specs.ram,
      storage: input.specs.storage !== undefined ? input.specs.storage.trim() : target.specs.storage,
      os: input.specs.os !== undefined ? input.specs.os.trim() : target.specs.os,
      brand_model: input.specs.brand_model !== undefined ? input.specs.brand_model.trim() : target.specs.brand_model,
    };
  }
  if (input.username) target.username = input.username.trim();
  if (input.password !== undefined) target.password = input.password;
  if (input.rolePurpose) target.role_purpose = input.rolePurpose.trim();
  if (input.status) target.status = input.status;
  if (input.notes !== undefined) target.notes = input.notes.trim() || undefined;
  target.updated_at = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('servers').upsert(target, { onConflict: 'id' });
    } catch (e) {
      console.warn('Supabase updateServer warning:', e);
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
        module: 'SERVER',
        targetId: target.id,
        targetName: target.name,
        details: `แก้ไขข้อมูลเซิร์ฟเวอร์: ${target.name} สถานะ: ${target.status}`,
      });
    } catch (auditErr) {
      console.warn('Audit log error in updateServer:', auditErr);
    }
  }

  return { success: true, data: { ...target } };
}

export async function deleteServer(
  id: string,
  actor?: { id: string; name: string; email?: string; role: string }
): Promise<{ success: boolean; error?: string }> {
  const targetIdx = serversStore.findIndex((s) => s.id === id);
  if (targetIdx === -1) {
    return { success: false, error: 'ไม่พบเซิร์ฟเวอร์ที่ต้องการลบ' };
  }

  const target = serversStore[targetIdx];
  serversStore.splice(targetIdx, 1);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('servers').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase deleteServer warning:', e);
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
        module: 'SERVER',
        targetId: target.id,
        targetName: target.name,
        details: `ลบเซิร์ฟเวอร์ออกจากระบบ: ${target.name} (${target.ip_address})`,
      });
    } catch (auditErr) {
      console.warn('Audit log error in deleteServer:', auditErr);
    }
  }

  return { success: true };
}

export interface RackOccupancyInfo {
  rackId: RackId;
  rackName: string;
  totalU: number;
  usedU: number;
  freeU: number;
  percentUsed: number;
  servers: ServerRecord[];
  slots: Array<{
    u: number;
    server?: ServerRecord;
    isOccupied: boolean;
    isOriginSlot: boolean;
  }>;
}

export async function getRackOccupancy(rackId: RackId): Promise<RackOccupancyInfo> {
  const all = await getServers({ environment: 'internal', rackId });
  const totalU = 42;

  // Build slot map from 42 down to 1
  const slotMap: Record<number, { server?: ServerRecord; isOccupied: boolean; isOriginSlot: boolean }> = {};
  for (let u = 1; u <= 42; u++) {
    slotMap[u] = { isOccupied: false, isOriginSlot: false };
  }

  let usedU = 0;
  for (const s of all) {
    const startU = s.unit_position || 1;
    const size = s.unit_size || 1;
    for (let u = startU; u < startU + size; u++) {
      if (u <= 42) {
        slotMap[u] = {
          server: s,
          isOccupied: true,
          isOriginSlot: u === startU,
        };
        usedU++;
      }
    }
  }

  const slots = [];
  for (let u = 42; u >= 1; u--) {
    slots.push({
      u,
      server: slotMap[u].server,
      isOccupied: slotMap[u].isOccupied,
      isOriginSlot: slotMap[u].isOriginSlot,
    });
  }

  const rackName =
    rackId === 'rack-1'
      ? 'Rack Cabinet #1 (Core Network & AD)'
      : 'Rack Cabinet #2 (Virtualization & SAN Storage)';

  return {
    rackId,
    rackName,
    totalU,
    usedU,
    freeU: totalU - usedU,
    percentUsed: Math.round((usedU / totalU) * 100),
    servers: all,
    slots,
  };
}
