import { describe, it, expect, beforeEach } from 'vitest';
import {
  getServers,
  getServerById,
  createServer,
  updateServer,
  deleteServer,
  getRackOccupancy,
  resetServerStore,
} from '@/lib/services/server-service';

describe('Server Management & 3D Rack Seam', () => {
  beforeEach(() => {
    resetServerStore();
  });

  describe('Initial Pre-seeded Inventory', () => {
    it('loads initial internal rack servers and cloud servers', async () => {
      const servers = await getServers();
      expect(servers.length).toBeGreaterThanOrEqual(14);

      const rack1Servers = servers.filter((s) => s.environment === 'internal' && s.rack_id === 'rack-1');
      const rack2Servers = servers.filter((s) => s.environment === 'internal' && s.rack_id === 'rack-2');
      const cloudServers = servers.filter((s) => s.environment === 'cloud');

      expect(rack1Servers.length).toBeGreaterThanOrEqual(5);
      expect(rack2Servers.length).toBeGreaterThanOrEqual(5);
      expect(cloudServers.length).toBeGreaterThanOrEqual(4);
    });

    it('contains server credentials and specifications for every pre-seeded server', async () => {
      const servers = await getServers();
      const firstServer = servers[0];

      expect(firstServer.name).toBeDefined();
      expect(firstServer.ip_address).toBeDefined();
      expect(firstServer.specs.cpu).toBeDefined();
      expect(firstServer.specs.ram).toBeDefined();
      expect(firstServer.specs.storage).toBeDefined();
      expect(firstServer.username).toBeDefined();
      expect(firstServer.password).toBeDefined();
    });
  });

  describe('Rack Occupancy & Collision Prevention', () => {
    it('calculates 42U rack occupancy accurately', async () => {
      const stats = await getRackOccupancy('rack-1');

      expect(stats.totalU).toBe(42);
      expect(stats.usedU).toBeGreaterThan(0);
      expect(stats.freeU).toBe(42 - stats.usedU);
      expect(stats.percentUsed).toBeGreaterThan(0);
      expect(stats.slots.length).toBe(42);
    });

    it('prevents mounting a server at an occupied U slot', async () => {
      // In Rack 1, U41 is occupied by Core Switch SW-01
      const res = await createServer({
        name: 'Conflicting Server',
        environment: 'internal',
        rackId: 'rack-1',
        unitPosition: 41,
        unitSize: 1,
        ipAddress: '192.168.1.99',
        status: 'online',
        rolePurpose: 'Test Collision',
        specs: { cpu: 'Test', ram: 'Test', storage: 'Test' },
        username: 'admin',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/มีอุปกรณ์อื่นติดตั้งอยู่แล้ว/);
    });

    it('prevents mounting a server that exceeds 42U boundary', async () => {
      const res = await createServer({
        name: 'Over-boundary Server',
        environment: 'internal',
        rackId: 'rack-1',
        unitPosition: 42,
        unitSize: 2, // 42 + 2 - 1 = 43U > 42U
        ipAddress: '192.168.1.99',
        status: 'online',
        rolePurpose: 'Test Boundary',
        specs: { cpu: 'Test', ram: 'Test', storage: 'Test' },
        username: 'admin',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/ต้องอยู่ระหว่าง 1U ถึง 42U/);
    });

    it('successfully mounts a new server at an unoccupied U slot', async () => {
      const res = await createServer({
        name: 'App Server Node 03',
        environment: 'internal',
        rackId: 'rack-1',
        unitPosition: 10,
        unitSize: 2,
        ipAddress: '192.168.1.55',
        status: 'online',
        rolePurpose: 'Application Cluster Worker',
        specs: {
          brand_model: 'Dell PowerEdge R650',
          cpu: 'Intel Xeon 16-Core',
          ram: '64 GB',
          storage: '2x 960GB SSD',
          os: 'Ubuntu 24.04 LTS',
        },
        username: 'sysadmin',
        password: 'SecretPassword!2026',
      });

      expect(res.success).toBe(true);
      expect(res.data?.id).toBeDefined();
      expect(res.data?.unit_position).toBe(10);
      expect(res.data?.unit_size).toBe(2);

      const serverInDb = await getServerById(res.data!.id);
      expect(serverInDb).toBeDefined();
      expect(serverInDb?.name).toBe('App Server Node 03');
    });
  });

  describe('Cloud Server Management', () => {
    it('creates and retrieves a new cloud server', async () => {
      const res = await createServer({
        name: 'GCP AI Worker Cloud VM',
        environment: 'cloud',
        cloudProvider: 'Google Cloud Platform (GCP asia-southeast1)',
        ipAddress: '34.87.12.90',
        domainName: 'ai.dfd-support.internal',
        status: 'online',
        rolePurpose: 'LLM & Vector Search Inference Node',
        specs: {
          brand_model: 'GCP Compute Engine n2-standard-4',
          cpu: '4 vCPU Intel Xeon',
          ram: '16 GB RAM',
          storage: '100 GB NVMe',
          os: 'Debian 12 Bookworm',
        },
        username: 'gcp-admin',
        password: 'GcpSecure!Key2026',
      });

      expect(res.success).toBe(true);
      expect(res.data?.id).toBeDefined();
      expect(res.data?.environment).toBe('cloud');
      expect(res.data?.cloud_provider).toContain('Google Cloud Platform');
      expect(res.data?.username).toBe('gcp-admin');
      expect(res.data?.password).toBe('GcpSecure!Key2026');
    });
  });

  describe('Update and Delete Server', () => {
    it('updates server credentials, IP, and specs', async () => {
      const servers = await getServers();
      const target = servers[0];

      const updateRes = await updateServer(target.id, {
        name: 'DFD-SW01-CORE-UPGRADED',
        ipAddress: '192.168.1.2',
        username: 'superadmin',
        password: 'NewStrongPassword!2026',
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.name).toBe('DFD-SW01-CORE-UPGRADED');
      expect(updateRes.data?.ip_address).toBe('192.168.1.2');
      expect(updateRes.data?.username).toBe('superadmin');
      expect(updateRes.data?.password).toBe('NewStrongPassword!2026');

      const reloaded = await getServerById(target.id);
      expect(reloaded?.ip_address).toBe('192.168.1.2');
    });

    it('deletes a server and frees up its rack space', async () => {
      // Create a test server in rack 2 at U15
      const createRes = await createServer({
        name: 'Temporary Staging Server',
        environment: 'internal',
        rackId: 'rack-2',
        unitPosition: 15,
        unitSize: 1,
        ipAddress: '192.168.2.15',
        status: 'online',
        rolePurpose: 'Temporary Staging',
        specs: { cpu: 'Test', ram: 'Test', storage: 'Test' },
        username: 'admin',
      });
      expect(createRes.success).toBe(true);

      const statsBefore = await getRackOccupancy('rack-2');
      const delRes = await deleteServer(createRes.data!.id);
      expect(delRes.success).toBe(true);

      const statsAfter = await getRackOccupancy('rack-2');
      const remainingServers = await getServers();

      expect(remainingServers.find((s) => s.id === createRes.data!.id)).toBeUndefined();
      expect(statsAfter.usedU).toBe(statsBefore.usedU - 1);
    });
  });
});
