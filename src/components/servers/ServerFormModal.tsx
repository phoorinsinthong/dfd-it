'use client';

import React, { useState, useEffect } from 'react';
import { ServerRecord, ServerEnvironment, ServerStatus, RackId } from '@/types/database';
import { createServer, updateServer } from '@/lib/services/server-service';
import { useAuth } from '@/lib/auth/auth-context';
import {
  X,
  Server as ServerIcon,
  Layers,
  Globe,
  Cpu,
  Key,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface ServerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (server: ServerRecord, isEdit: boolean) => void;
  serverToEdit?: ServerRecord | null;
  initialRackId?: RackId;
  initialSlotU?: number;
  initialEnvironment?: ServerEnvironment;
}

export default function ServerFormModal({
  isOpen,
  onClose,
  onSuccess,
  serverToEdit,
  initialRackId,
  initialSlotU,
  initialEnvironment = 'internal',
}: ServerFormModalProps) {
  const { user } = useAuth();

  const isEdit = !!serverToEdit;

  const [environment, setEnvironment] = useState<ServerEnvironment>('internal');
  const [name, setName] = useState('');
  const [rackId, setRackId] = useState<RackId>('rack-1');
  const [unitPosition, setUnitPosition] = useState<number>(30);
  const [unitSize, setUnitSize] = useState<number>(1);
  const [ipAddress, setIpAddress] = useState('');
  const [iloIp, setIloIp] = useState('');
  const [publicIp, setPublicIp] = useState('');
  const [domainName, setDomainName] = useState('');
  const [cloudProvider, setCloudProvider] = useState('AWS EC2');
  const [cloudRegion, setCloudRegion] = useState('ap-southeast-1 (Singapore)');
  
  // Specs
  const [brandModel, setBrandModel] = useState('');
  const [cpu, setCpu] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [os, setOs] = useState('');

  // Credentials
  const [username, setUsername] = useState('administrator');
  const [password, setPassword] = useState('');

  const [rolePurpose, setRolePurpose] = useState('');
  const [status, setStatus] = useState<ServerStatus>('online');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (serverToEdit) {
        setEnvironment(serverToEdit.environment);
        setName(serverToEdit.name);
        setRackId(serverToEdit.rack_id || 'rack-1');
        setUnitPosition(serverToEdit.unit_position || 1);
        setUnitSize(serverToEdit.unit_size || 1);
        setIpAddress(serverToEdit.ip_address);
        setIloIp(serverToEdit.ilo_ip || '');
        setPublicIp(serverToEdit.public_ip || '');
        setDomainName(serverToEdit.domain_name || '');
        setCloudProvider(serverToEdit.cloud_provider || 'AWS EC2');
        setCloudRegion(serverToEdit.cloud_region || 'ap-southeast-1');
        setBrandModel(serverToEdit.specs?.brand_model || '');
        setCpu(serverToEdit.specs?.cpu || '');
        setRam(serverToEdit.specs?.ram || '');
        setStorage(serverToEdit.specs?.storage || '');
        setOs(serverToEdit.specs?.os || '');
        setUsername(serverToEdit.username || 'admin');
        setPassword(serverToEdit.password || '');
        setRolePurpose(serverToEdit.role_purpose);
        setStatus(serverToEdit.status);
        setNotes(serverToEdit.notes || '');
      } else {
        setEnvironment(initialEnvironment);
        setName('');
        setRackId(initialRackId || 'rack-1');
        setUnitPosition(initialSlotU || 20);
        setUnitSize(1);
        setIpAddress('');
        setIloIp('');
        setPublicIp('');
        setDomainName('');
        setCloudProvider('AWS EC2');
        setCloudRegion('ap-southeast-1 (Singapore)');
        setBrandModel(initialEnvironment === 'internal' ? 'Dell PowerEdge R650' : 'Cloud Compute');
        setCpu('');
        setRam('');
        setStorage('');
        setOs(initialEnvironment === 'internal' ? 'Windows Server 2022' : 'Ubuntu 24.04 LTS');
        setUsername(initialEnvironment === 'internal' ? 'administrator' : 'ubuntu');
        setPassword('');
        setRolePurpose('');
        setStatus('online');
        setNotes('');
      }
    }
  }, [isOpen, serverToEdit, initialRackId, initialSlotU, initialEnvironment]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('กรุณาระบุชื่อเซิร์ฟเวอร์');
      return;
    }

    if (!ipAddress.trim()) {
      setErrorMessage('กรุณาระบุ IP Address หรือ Endpoint');
      return;
    }

    setSubmitting(true);

    const actor = user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      : undefined;

    const specs = {
      brand_model: brandModel.trim() || undefined,
      cpu: cpu.trim() || undefined,
      ram: ram.trim() || undefined,
      storage: storage.trim() || undefined,
      os: os.trim() || undefined,
    };

    if (isEdit && serverToEdit) {
      const res = await updateServer(serverToEdit.id, {
        name: name.trim(),
        environment,
        rackId: environment === 'internal' ? rackId : undefined,
        unitPosition: environment === 'internal' ? Number(unitPosition) : undefined,
        unitSize: environment === 'internal' ? Number(unitSize) : undefined,
        ipAddress: ipAddress.trim(),
        iloIp: iloIp.trim() || undefined,
        publicIp: publicIp.trim() || undefined,
        domainName: domainName.trim() || undefined,
        cloudProvider: environment === 'cloud' ? cloudProvider.trim() : undefined,
        cloudRegion: environment === 'cloud' ? cloudRegion.trim() : undefined,
        specs,
        username: username.trim() || 'admin',
        password: password || undefined,
        rolePurpose: rolePurpose.trim() || 'General Server',
        status,
        notes: notes.trim() || undefined,
        actor,
      });

      setSubmitting(false);

      if (!res.success) {
        setErrorMessage(res.error || 'เกิดข้อผิดพลาดในการแก้ไขเซิร์ฟเวอร์');
        return;
      }

      onSuccess(res.data!, true);
      onClose();
    } else {
      const res = await createServer({
        name: name.trim(),
        environment,
        rackId: environment === 'internal' ? rackId : undefined,
        unitPosition: environment === 'internal' ? Number(unitPosition) : undefined,
        unitSize: environment === 'internal' ? Number(unitSize) : undefined,
        ipAddress: ipAddress.trim(),
        iloIp: iloIp.trim() || undefined,
        publicIp: publicIp.trim() || undefined,
        domainName: domainName.trim() || undefined,
        cloudProvider: environment === 'cloud' ? cloudProvider.trim() : undefined,
        cloudRegion: environment === 'cloud' ? cloudRegion.trim() : undefined,
        specs,
        username: username.trim() || 'admin',
        password: password || undefined,
        rolePurpose: rolePurpose.trim() || 'General Server',
        status,
        notes: notes.trim() || undefined,
        actor,
      });

      setSubmitting(false);

      if (!res.success) {
        setErrorMessage(res.error || 'เกิดข้อผิดพลาดในการเพิ่มเซิร์ฟเวอร์');
        return;
      }

      onSuccess(res.data!, false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-950/30 via-slate-900 to-slate-900">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <ServerIcon className="w-5 h-5 text-blue-400" />
              {isEdit ? 'แก้ไขข้อมูลเซิร์ฟเวอร์' : 'เพิ่มเซิร์ฟเวอร์ใหม่เข้าสู่ระบบ'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              จัดการอุปกรณ์เซิร์ฟเวอร์ในตู้ Rack 3D ภายใน หรือเครื่องแม่ข่ายบนระบบคลาวด์
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Environment Selector: Internal vs Cloud */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              ประเภทสภาพแวดล้อมเซิร์ฟเวอร์ (Environment)
            </label>
            <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setEnvironment('internal')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                  environment === 'internal'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                🏢 Server ภายใน (ตู้ Rack 3D)
              </button>
              <button
                type="button"
                onClick={() => setEnvironment('cloud')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                  environment === 'cloud'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-4 h-4" />
                ☁️ Server บนออนไลน์ (Cloud / VPS)
              </button>
            </div>
          </div>

          {/* General Info */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl space-y-3">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ServerIcon className="w-3.5 h-3.5 text-blue-400" />
              ข้อมูลพื้นฐานเซิร์ฟเวอร์ (General Info)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  ชื่อเซิร์ฟเวอร์ (Hostname) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น DFD-DC01, DFD-VMWARE-01"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  สถานะการทำงาน (Status) <span className="text-red-400">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ServerStatus)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="online">🟢 Online (ทำงานปกติ)</option>
                  <option value="maintenance">🟡 Maintenance (ปิดซ่อมบำรุง)</option>
                  <option value="offline">🔴 Offline (ขัดข้อง / ปิดเครื่อง)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">
                  หน้าที่ / วาระการใช้งาน (Role / Purpose) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Active Directory & DNS, VMware ESXi Node 1, ERP Database"
                  value={rolePurpose}
                  onChange={(e) => setRolePurpose(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* If Internal: Rack Assignment */}
          {environment === 'internal' && (
            <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl space-y-3">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                ตำแหน่งติดตั้งในตู้ Rack 3D (Rack Positioning)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    เลือกตู้เซิร์ฟเวอร์ <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={rackId}
                    onChange={(e) => setRackId(e.target.value as RackId)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="rack-1">Rack 1 (Core Infrastructure)</option>
                    <option value="rack-2">Rack 2 (Storage & Virtualization)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    ตำแหน่ง Unit Slot (1U - 42U) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="42"
                    required
                    value={unitPosition}
                    onChange={(e) => setUnitPosition(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    ความสูง (Unit Size) <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={unitSize}
                    onChange={(e) => setUnitSize(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  >
                    <option value="1">1U (Switch, Router, 1U Server)</option>
                    <option value="2">2U (Standard Rack Server เช่น Dell R740/DL380)</option>
                    <option value="3">3U (Storage Server)</option>
                    <option value="4">4U (Large SAN Array, UPS Battery Unit)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* If Cloud: Provider & Region */}
          {environment === 'cloud' && (
            <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl space-y-3">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                ข้อมูล Cloud Provider (Cloud Details)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Cloud Provider</label>
                  <input
                    type="text"
                    placeholder="เช่น AWS, Azure, Google Cloud, DigitalOcean, Vercel"
                    value={cloudProvider}
                    onChange={(e) => setCloudProvider(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Region / Datacenter</label>
                  <input
                    type="text"
                    placeholder="เช่น ap-southeast-1 (Singapore), Bangkok IDC"
                    value={cloudRegion}
                    onChange={(e) => setCloudRegion(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Network Details */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl space-y-3">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              การเชื่อมต่อเครือข่าย & ที่อยู่ IP (Network & IPs)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  IP Address ภายใน (Private IP) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 192.168.10.10 หรือ 10.0.0.5"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  iLO / iDRAC Management IP
                </label>
                <input
                  type="text"
                  placeholder="เช่น 192.168.10.210"
                  value={iloIp}
                  onChange={(e) => setIloIp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Public IP / Elastic IP (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น 54.255.88.192"
                  value={publicIp}
                  onChange={(e) => setPublicIp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Domain Name / URL (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น portal.dfd-support.internal"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl space-y-3">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              บัญชีผู้ใช้และรหัสผ่านเข้าเซิร์ฟเวอร์ (Credentials)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Username <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น administrator, root, ubuntu"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Password หรือ SSH Key Reference
                </label>
                <input
                  type="text"
                  placeholder="เช่น P@ssw0rd2026 หรือ ~/.ssh/key.pem"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Specs */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl space-y-3">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              สเปกฮาร์ดแวร์ (Hardware Specs)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-[11px] text-slate-400 mb-1">รุ่นเครื่อง / แบรนด์</label>
                <input
                  type="text"
                  placeholder="เช่น Dell PowerEdge R650, HPE ProLiant DL380, AWS EC2"
                  value={brandModel}
                  onChange={(e) => setBrandModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">CPU</label>
                <input
                  type="text"
                  placeholder="เช่น 2x Xeon Silver 4314"
                  value={cpu}
                  onChange={(e) => setCpu(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">RAM</label>
                <input
                  type="text"
                  placeholder="เช่น 64 GB ECC DDR4"
                  value={ram}
                  onChange={(e) => setRam(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Storage</label>
                <input
                  type="text"
                  placeholder="เช่น 4x 960GB SAS SSD RAID 1"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] text-slate-400 mb-1">ระบบปฏิบัติการ (OS)</label>
                <input
                  type="text"
                  placeholder="เช่น Windows Server 2022, VMware ESXi 8.0, Ubuntu 24.04"
                  value={os}
                  onChange={(e) => setOs(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">หมายเหตุเพิ่มเติม</label>
            <textarea
              rows={2}
              placeholder="บันทึกรายละเอียดเพิ่มเติม เช่น รอบการบำรุงรักษา พอร์ตเชื่อมต่อ switch..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
            />
          </div>

          {/* Footer Action Bar */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
            >
              {submitting ? 'กำลังบันทึก...' : isEdit ? '✓ บันทึกการแก้ไข' : '+ ยืนยันเพิ่มเซิร์ฟเวอร์'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
