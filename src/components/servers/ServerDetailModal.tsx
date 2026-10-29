'use client';

import React, { useState } from 'react';
import { ServerRecord } from '@/types/database';
import {
  X,
  Server as ServerIcon,
  Cpu,
  HardDrive,
  Activity,
  Key,
  User,
  Eye,
  EyeOff,
  Copy,
  Check,
  Globe,
  Layers,
  Pencil,
  Trash2,
  ExternalLink,
  Shield,
  Clock,
  Terminal,
} from 'lucide-react';

interface ServerDetailModalProps {
  server: ServerRecord | null;
  onClose: () => void;
  onEdit: (server: ServerRecord) => void;
  onDelete: (server: ServerRecord) => void;
}

export default function ServerDetailModal({
  server,
  onClose,
  onEdit,
  onDelete,
}: ServerDetailModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!server) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isInternal = server.environment === 'internal';
  const isOnline = server.status === 'online';
  const isMaint = server.status === 'maintenance';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                isInternal
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                  : 'bg-purple-600/20 text-purple-400 border-purple-500/30'
              }`}
            >
              <ServerIcon className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                    isOnline
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                      : isMaint
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                      : 'bg-red-950/80 text-red-300 border-red-800/60'
                  }`}
                >
                  ● {isOnline ? 'Online พร้อมใช้งาน' : isMaint ? 'Maintenance ปิดซ่อม' : 'Offline ขัดข้อง'}
                </span>

                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {isInternal ? '🏢 Server ภายใน (On-Premise)' : '☁️ Server บนออนไลน์ (Cloud)'}
                </span>

                {isInternal && server.unit_size && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-300 border border-blue-800/40">
                    {server.unit_size}U Rack Mounted
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-white tracking-tight">{server.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{server.role_purpose}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[72vh] overflow-y-auto">
          
          {/* Location & Rack Placement (if internal) */}
          {isInternal && (
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                ตำแหน่งติดตั้งในตู้ Rack (Rack Placement)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">ตู้เซิร์ฟเวอร์</span>
                  <strong className="text-white text-xs">{server.rack_name || (server.rack_id === 'rack-1' ? 'Rack 1' : 'Rack 2')}</strong>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">ตำแหน่ง Unit Slot</span>
                  <strong className="text-emerald-400 font-mono text-xs">
                    U{server.unit_position} {server.unit_size && server.unit_size > 1 ? `- U${(server.unit_position || 1) + server.unit_size - 1}` : ''}
                  </strong>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block">ความสูงตู้</span>
                  <strong className="text-blue-300 font-mono text-xs">{server.unit_size}U Form Factor</strong>
                </div>
              </div>
            </div>
          )}

          {/* Cloud Info (if cloud) */}
          {!isInternal && (
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-purple-400" />
                ข้อมูล Cloud Provider & Datacenter
              </span>
              <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Cloud Provider</span>
                  <strong className="text-white text-xs">{server.cloud_provider || 'Cloud VPS'}</strong>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Region / Datacenter</span>
                  <strong className="text-purple-300 text-xs">{server.cloud_region || 'N/A'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Network & IP Addresses */}
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              การเชื่อมต่อและที่อยู่ IP (Network & Access)
            </span>

            <div className="space-y-2 pt-1 text-xs font-mono">
              {/* Primary IP */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[11px] font-sans">IP Address ภายใน:</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">{server.ip_address}</span>
                  <button
                    onClick={() => handleCopy(server.ip_address, 'ip')}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                    title="คัดลอก IP"
                  >
                    {copiedField === 'ip' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* iLO / Management IP */}
              {server.ilo_ip && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[11px] font-sans">iLO / iDRAC Management:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-300">{server.ilo_ip}</span>
                    <button
                      onClick={() => handleCopy(server.ilo_ip!, 'ilo')}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                      title="คัดลอก Management IP"
                    >
                      {copiedField === 'ilo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Public IP */}
              {server.public_ip && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[11px] font-sans">Public IP / External:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-300">{server.public_ip}</span>
                    <button
                      onClick={() => handleCopy(server.public_ip!, 'public_ip')}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                      title="คัดลอก Public IP"
                    >
                      {copiedField === 'public_ip' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Domain Name */}
              {server.domain_name && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[11px] font-sans">Domain / FQDN:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-300 truncate max-w-[200px]">{server.domain_name}</span>
                    <button
                      onClick={() => handleCopy(server.domain_name!, 'domain')}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                      title="คัดลอก Domain"
                    >
                      {copiedField === 'domain' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Credentials: Username & Password with Toggle & Copy */}
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-400" />
              บัญชีผู้ใช้และรหัสผ่านเข้าเซิร์ฟเวอร์ (Credentials)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
              {/* Username */}
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Username / บัญชี</span>
                  <strong className="text-white font-mono text-xs">{server.username}</strong>
                </div>
                <button
                  onClick={() => handleCopy(server.username, 'username')}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="คัดลอก Username"
                >
                  {copiedField === 'username' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Password */}
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="overflow-hidden pr-2">
                  <span className="text-[10px] text-slate-400 block font-sans">Password / รหัสผ่าน</span>
                  <strong className="text-amber-300 font-mono text-xs truncate block">
                    {server.password
                      ? showPassword
                        ? server.password
                        : '••••••••••••'
                      : '— ไม่มีรหัสผ่าน —'}
                  </strong>
                </div>

                {server.password && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                      title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(server.password!, 'password')}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                      title="คัดลอก Password"
                    >
                      {copiedField === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hardware Specs */}
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-400" />
              สเปกฮาร์ดแวร์และระบบปฏิบัติการ (Specifications)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">รุ่นเครื่อง / Model:</span>
                <span className="text-slate-200 font-medium">{server.specs?.brand_model || '-'}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">หน่วยประมวลผล (CPU):</span>
                <span className="text-slate-200 font-medium">{server.specs?.cpu || '-'}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">หน่วยความจำ (RAM):</span>
                <span className="text-slate-200 font-medium">{server.specs?.ram || '-'}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">พื้นที่จัดเก็บ (Storage):</span>
                <span className="text-slate-200 font-medium">{server.specs?.storage || '-'}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 sm:col-span-2">
                <span className="text-[10px] text-slate-400 block">ระบบปฏิบัติการ (OS):</span>
                <span className="text-blue-300 font-medium">{server.specs?.os || '-'}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {server.notes && (
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl text-xs text-slate-400">
              <span className="font-semibold text-slate-300 block mb-1">หมายเหตุเพิ่มเติม:</span>
              <p className="leading-relaxed">{server.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-900">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(server);
            }}
            className="px-3.5 py-2 rounded-xl bg-red-950/30 hover:bg-red-950/60 border border-red-900/40 text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            ลบเซิร์ฟเวอร์
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              ปิด
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(server);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/30"
            >
              <Pencil className="w-3.5 h-3.5" />
              แก้ไขข้อมูล
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
