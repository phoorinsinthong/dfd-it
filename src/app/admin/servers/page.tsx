'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { 
  Server as ServerIcon, 
  Plus, 
  Search, 
  RefreshCw, 
  Cloud, 
  HardDrive, 
  ShieldAlert, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Pencil, 
  Trash2, 
  Activity, 
  Cpu, 
  Layers,
  Thermometer,
  Zap,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { ServerRecord, ServerEnvironment, ServerStatus, RackId } from '@/types/database';
import { 
  getServers, 
  deleteServer, 
  getRackOccupancy, 
  RackOccupancyInfo 
} from '@/lib/services/server-service';
import ServerRackCabinet3D from '@/components/servers/ServerRackCabinet3D';
import ServerDetailModal from '@/components/servers/ServerDetailModal';
import ServerFormModal from '@/components/servers/ServerFormModal';

export default function ServerManagementPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Servers data & rack state
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [rack1Info, setRack1Info] = useState<RackOccupancyInfo | null>(null);
  const [rack2Info, setRack2Info] = useState<RackOccupancyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<'internal' | 'cloud' | 'table'>('internal');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ServerStatus>('ALL');

  // Modals state
  const [selectedServer, setSelectedServer] = useState<ServerRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [serverToEdit, setServerToEdit] = useState<ServerRecord | null>(null);
  const [initialRackId, setInitialRackId] = useState<RackId | undefined>(undefined);
  const [initialSlotU, setInitialSlotU] = useState<number | undefined>(undefined);
  const [initialEnv, setInitialEnv] = useState<ServerEnvironment>('internal');

  // Delete confirmation
  const [serverToDelete, setServerToDelete] = useState<ServerRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Password toggle & copy helpers
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load all server & rack occupancy data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allServers, r1, r2] = await Promise.all([
        getServers(),
        getRackOccupancy('rack-1'),
        getRackOccupancy('rack-2'),
      ]);
      setServers(allServers);
      setRack1Info(r1);
      setRack2Info(r2);
    } catch (err) {
      console.error('Failed to load server data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (user) {
      loadData();
    }
  }, [user, authLoading, router, loadData]);

  // Auth Guard
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">ไม่มีสิทธิ์เข้าถึง (Access Denied)</h1>
          <p className="text-slate-400 text-sm mb-6">
            โมดูลจัดการ Server สงวนไว้สำหรับเจ้าหน้าที่ไอทีเท่านั้น
          </p>
          <Link
            href="/portal"
            className="inline-flex items-center justify-center w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl transition"
          >
            กลับสู่หน้าบริการผู้ใช้งานทั่วไป
          </Link>
        </div>
      </div>
    );
  }

  // Filter internal vs cloud
  const internalServers = servers.filter((s) => s.environment === 'internal');
  const cloudServers = servers.filter((s) => s.environment === 'cloud');

  const filteredServers = servers.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.ip_address.toLowerCase().includes(q) ||
      (s.role_purpose && s.role_purpose.toLowerCase().includes(q)) ||
      (s.specs?.os && s.specs.os.toLowerCase().includes(q)) ||
      (s.specs?.brand_model && s.specs.brand_model.toLowerCase().includes(q)) ||
      (s.specs?.cpu && s.specs.cpu.toLowerCase().includes(q)) ||
      (s.ilo_ip && s.ilo_ip.toLowerCase().includes(q)) ||
      (s.public_ip && s.public_ip.toLowerCase().includes(q)) ||
      (s.domain_name && s.domain_name.toLowerCase().includes(q));

    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchQuery && matchStatus;
  });

  // Modal open helpers
  const handleOpenAdd = (env: ServerEnvironment = 'internal', rackId?: RackId, slotU?: number) => {
    setServerToEdit(null);
    setInitialEnv(env);
    setInitialRackId(rackId || (env === 'internal' ? 'rack-1' : undefined));
    setInitialSlotU(slotU);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (server: ServerRecord) => {
    setServerToEdit(server);
    setInitialEnv(server.environment);
    setInitialRackId(server.rack_id);
    setInitialSlotU(server.unit_position);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setServerToEdit(null);
    loadData();
  };

  const handleDeletePrompt = (server: ServerRecord) => {
    setServerToDelete(server);
  };

  const handleConfirmDelete = async () => {
    if (!serverToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteServer(serverToDelete.id, {
        id: user.id || 'admin',
        name: user.name,
        email: user.email,
        role: user.role,
      });
      if (res.success) {
        if (selectedServer?.id === serverToDelete.id) {
          setSelectedServer(null);
        }
        setServerToDelete(null);
        await loadData();
      } else {
        alert(res.error || 'ลบเซิร์ฟเวอร์ไม่สำเร็จ');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบ');
    } finally {
      setIsDeleting(false);
    }
  };

  const togglePasswordReveal = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar activeSection="servers" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-xs uppercase tracking-wider font-semibold text-cyan-400">
                Data Center & Multi-Cloud Infrastructure
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <ServerIcon className="w-8 h-8 text-blue-400" />
              <span>จัดการเซิร์ฟเวอร์ (Server Management)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              ตู้ Rack On-Premise 3D สเปกเครื่อง พิกัด U, IP Address, รหัสผ่าน และระบบจัดการ Cloud Server
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition text-xs flex items-center gap-2"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            <button
              onClick={() => handleOpenAdd(activeTab === 'cloud' ? 'cloud' : 'internal')}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition group"
            >
              <Plus className="w-4 h-4 transition group-hover:rotate-90" />
              <span>เพิ่มเซิร์ฟเวอร์</span>
            </button>
          </div>
        </div>

        {/* Top Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <ServerIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">เซิร์ฟเวอร์ทั้งหมด</p>
              <p className="text-xl font-bold text-white">
                {servers.length} <span className="text-xs font-normal text-slate-500">เครื่อง</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">สถานะ Online</p>
              <p className="text-xl font-bold text-emerald-400">
                {servers.filter((s) => s.status === 'online').length} <span className="text-xs font-normal text-slate-500">เครื่อง</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">ตู้ Rack ภายใน</p>
              <p className="text-xl font-bold text-cyan-400">
                {internalServers.length} <span className="text-xs font-normal text-slate-500">เครื่อง (2 ตู้)</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Server ออนไลน์</p>
              <p className="text-xl font-bold text-purple-400">
                {cloudServers.length} <span className="text-xs font-normal text-slate-500">โฮสต์/VPS</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80">
          
          {/* Main Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('internal')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'internal'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Server ภายใน (ตู้ Rack 3D)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'internal' ? 'bg-blue-700/80 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                2 ตู้ • {internalServers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('cloud')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'cloud'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Cloud className="w-4 h-4" />
              <span>Server บนออนไลน์ (Cloud & VPS)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'cloud' ? 'bg-purple-700/80 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {cloudServers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'table'
                  ? 'bg-slate-800 text-blue-400 border border-blue-500/30 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>ตารางข้อมูลทั้งหมด</span>
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, IP, สเปก, OS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition"
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="online">Online เท่านั้น</option>
              <option value="maintenance">Maintenance</option>
              <option value="offline">Offline</option>
            </select>
          </div>

        </div>

        {/* TAB 1: SERVER ภายใน (ตู้ RACK 3D 2 ตู้) */}
        {activeTab === 'internal' && (
          <div className="space-y-6">
            
            {/* Server Room Telemetry Header */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/30 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    ห้องศูนย์แม่ข่ายคอมพิวเตอร์และสื่อสารหลัก (Server Room 01)
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      HVAC & UPS Normal
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    มาตรฐาน EIA-310-D 42U Server Rack 19 นิ้ว ระบบระบายความร้อนหมุนเวียน และสำรองไฟคู่ขนาน
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Thermometer className="w-4 h-4 text-cyan-400" />
                  <span>อุณหภูมิห้อง: <strong className="text-white">20.5 °C</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>โหลดไฟรวม: <strong className="text-white">3.4 kW</strong></span>
                </div>
              </div>
            </div>

            {/* 2 RACK CABINETS 3D SIDE BY SIDE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* Rack Cabinet 1 */}
              <div>
                {rack1Info ? (
                  <ServerRackCabinet3D
                    rackInfo={rack1Info}
                    onSelectServer={(s) => setSelectedServer(s)}
                    onAddAtSlot={(rackId, uSlot) => handleOpenAdd('internal', rackId, uSlot)}
                    onEditServer={(s) => handleOpenEdit(s)}
                  />
                ) : (
                  <div className="h-96 flex items-center justify-center bg-slate-900/60 rounded-3xl border border-slate-800">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                )}
              </div>

              {/* Rack Cabinet 2 */}
              <div>
                {rack2Info ? (
                  <ServerRackCabinet3D
                    rackInfo={rack2Info}
                    onSelectServer={(s) => setSelectedServer(s)}
                    onAddAtSlot={(rackId, uSlot) => handleOpenAdd('internal', rackId, uSlot)}
                    onEditServer={(s) => handleOpenEdit(s)}
                  />
                ) : (
                  <div className="h-96 flex items-center justify-center bg-slate-900/60 rounded-3xl border border-slate-800">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: SERVER บนออนไลน์ (CLOUD & VPS) */}
        {activeTab === 'cloud' && (
          <div className="space-y-6">
            
            {/* Cloud Overview Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Cloud Services & VPS Virtual Machines
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                      Multi-Cloud Ready
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    เซิร์ฟเวอร์บนระบบคลาวด์ภายนอก เช่น AWS, GCP, Vercel, Supabase, Cloudflare และผู้ให้บริการ VPS ต่างๆ
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleOpenAdd('cloud')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่ม Cloud Server</span>
              </button>
            </div>

            {/* Cloud Server Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cloudServers.map((server) => {
                const isRevealed = revealedPasswords[server.id];
                return (
                  <div
                    key={server.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 transition flex flex-col justify-between group shadow-lg shadow-black/40"
                  >
                    <div>
                      {/* Top bar with status & provider */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            server.status === 'online' ? 'bg-emerald-400 animate-pulse' :
                            server.status === 'maintenance' ? 'bg-amber-400' : 'bg-red-400'
                          }`} />
                          <span className="text-xs font-semibold text-white tracking-wide">
                            {server.cloud_provider || 'Cloud VPS'}
                          </span>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          server.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          server.status === 'maintenance' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {server.status}
                        </span>
                      </div>

                      {/* Server Name & Role */}
                      <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition mb-1">
                        {server.name}
                      </h4>
                      <p className="text-xs text-purple-300/80 mb-4 font-mono">
                        {server.role_purpose || 'Production Workload'}
                      </p>

                      {/* Network & Specs List */}
                      <div className="space-y-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">IP Address:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-cyan-300 font-semibold">{server.ip_address}</span>
                            <button
                              onClick={() => handleCopy(server.ip_address, `ip-${server.id}`)}
                              className="text-slate-500 hover:text-white transition"
                              title="คัดลอก IP"
                            >
                              {copiedKey === `ip-${server.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        {server.domain_name && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Domain / URL:</span>
                            <span className="font-mono text-slate-300 truncate max-w-[170px]" title={server.domain_name}>
                              {server.domain_name}
                            </span>
                          </div>
                        )}

                        {server.specs?.os && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">OS:</span>
                            <span className="text-slate-300">{server.specs.os}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">สเปก:</span>
                          <span className="text-slate-300 truncate max-w-[190px]" title={`${server.specs?.cpu || ''} • ${server.specs?.ram || ''} • ${server.specs?.storage || ''}`}>
                            {server.specs?.cpu || '-'} • {server.specs?.ram || '-'}
                          </span>
                        </div>
                      </div>

                      {/* Credentials Box */}
                      <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 mb-4 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">Username:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-purple-300 font-bold">{server.username || '-'}</span>
                            {server.username && (
                              <button
                                onClick={() => handleCopy(server.username || '', `user-${server.id}`)}
                                className="text-slate-400 hover:text-white transition"
                                title="คัดลอก Username"
                              >
                                {copiedKey === `user-${server.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">Password:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-amber-300 font-bold">
                              {isRevealed ? (server.password || '-') : '••••••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordReveal(server.id)}
                              className="text-slate-400 hover:text-white transition"
                              title={isRevealed ? 'ซ่อน' : 'แสดงรหัสผ่าน'}
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
                            </button>
                            {server.password && (
                              <button
                                onClick={() => handleCopy(server.password || '', `pass-${server.id}`)}
                                className="text-slate-400 hover:text-white transition"
                                title="คัดลอก Password"
                              >
                                {copiedKey === `pass-${server.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <button
                        onClick={() => setSelectedServer(server)}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>รายละเอียดเต็ม</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(server)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="แก้ไข"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(server)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {cloudServers.length === 0 && (
              <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                <Cloud className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-slate-300">ยังไม่มีเซิร์ฟเวอร์ Cloud</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  กดปุ่ม &quot;เพิ่ม Cloud Server&quot; เพื่อบันทึกข้อมูลโฮสต์ AWS, GCP, หรือ VPS ต่างๆ
                </p>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: ตารางข้อมูลเซิร์ฟเวอร์ทั้งหมด */}
        {activeTab === 'table' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">สถานะ</th>
                    <th className="py-3.5 px-4">ชื่อเซิร์ฟเวอร์ / งาน</th>
                    <th className="py-3.5 px-4">ชนิด / ตำแหน่ง</th>
                    <th className="py-3.5 px-4">IP Address</th>
                    <th className="py-3.5 px-4">สเปก (CPU / RAM / Disk)</th>
                    <th className="py-3.5 px-4">Username / Password</th>
                    <th className="py-3.5 px-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredServers.map((server) => {
                    const isRevealed = revealedPasswords[server.id];
                    return (
                      <tr key={server.id} className="hover:bg-slate-800/40 transition">
                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            server.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            server.status === 'maintenance' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              server.status === 'online' ? 'bg-emerald-400' :
                              server.status === 'maintenance' ? 'bg-amber-400' : 'bg-red-400'
                            }`} />
                            {server.status.toUpperCase()}
                          </span>
                        </td>

                        {/* Name & Role */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setSelectedServer(server)}
                            className="font-bold text-white hover:text-blue-400 transition text-left block"
                          >
                            {server.name}
                          </button>
                          <span className="text-[11px] text-slate-400 block">{server.role_purpose}</span>
                        </td>

                        {/* Type / Rack */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {server.environment === 'internal' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[11px] font-mono">
                              <HardDrive className="w-3 h-3 text-cyan-400" />
                              {server.rack_id === 'rack-1' ? 'Rack 1' : 'Rack 2'} • U{server.unit_position} ({server.unit_size}U)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px]">
                              <Cloud className="w-3 h-3 text-purple-400" />
                              {server.cloud_provider || 'Cloud'}
                            </span>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-cyan-300 font-semibold">{server.ip_address}</span>
                            <button
                              onClick={() => handleCopy(server.ip_address, `tbl-ip-${server.id}`)}
                              className="text-slate-500 hover:text-white transition"
                              title="คัดลอก IP"
                            >
                              {copiedKey === `tbl-ip-${server.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          {server.ilo_ip && (
                            <span className="text-[10px] text-slate-400 font-mono block">iLO: {server.ilo_ip}</span>
                          )}
                        </td>

                        {/* Specs */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-300">
                            {server.specs?.cpu || '-'} • {server.specs?.ram || '-'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {server.specs?.storage || '-'} ({server.specs?.os || '-'})
                          </div>
                        </td>

                        {/* Credentials */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">U:</span>
                            <span className="font-mono text-white font-semibold">{server.username || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-slate-400">P:</span>
                            <span className="font-mono text-amber-300 font-semibold">
                              {isRevealed ? (server.password || '-') : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordReveal(server.id)}
                              className="text-slate-400 hover:text-white transition ml-1"
                              title={isRevealed ? 'ซ่อน' : 'แสดงรหัสผ่าน'}
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
                            </button>
                            {server.password && (
                              <button
                                onClick={() => handleCopy(server.password || '', `tbl-pass-${server.id}`)}
                                className="text-slate-400 hover:text-white transition"
                                title="คัดลอก Password"
                              >
                                {copiedKey === `tbl-pass-${server.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedServer(server)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition"
                              title="ดูรายละเอียด"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(server)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="แก้ไข"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePrompt(server)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                              title="ลบ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredServers.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  ไม่พบข้อมูลเซิร์ฟเวอร์ที่ตรงกับเงื่อนไขการค้นหา
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* DETAIL MODAL */}
      <ServerDetailModal
        server={selectedServer}
        onClose={() => setSelectedServer(null)}
        onEdit={(s) => {
          setSelectedServer(null);
          handleOpenEdit(s);
        }}
        onDelete={(s) => {
          setSelectedServer(null);
          handleDeletePrompt(s);
        }}
      />

      {/* FORM MODAL (Add / Edit) */}
      <ServerFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setServerToEdit(null);
        }}
        onSuccess={handleFormSuccess}
        serverToEdit={serverToEdit}
        initialRackId={initialRackId}
        initialSlotU={initialSlotU}
        initialEnvironment={initialEnv}
      />

      {/* DELETE CONFIRMATION DIALOG */}
      {serverToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">ยืนยันการลบเซิร์ฟเวอร์</h3>
                <p className="text-xs text-slate-400">โปรดตรวจสอบก่อนลบข้อมูล</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              คุณต้องการลบข้อมูลเครื่อง <strong className="text-white">&quot;{serverToDelete.name}&quot;</strong> ({serverToDelete.ip_address}) 
              ออกจากระบบใช่หรือไม่?
              {serverToDelete.environment === 'internal' && (
                <span className="block mt-2 text-xs text-amber-300">
                  ⚠️ ช่อง Unit U{serverToDelete.unit_position} บน {serverToDelete.rack_name || serverToDelete.rack_id} จะถูกเว้นว่างเพื่อให้เครื่องอื่นติดตั้งได้
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setServerToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <span>ลบเซิร์ฟเวอร์นี้</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
