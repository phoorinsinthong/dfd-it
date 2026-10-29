'use client';

import React, { useState } from 'react';
import { ServerRecord, RackId } from '@/types/database';
import { RackOccupancyInfo } from '@/lib/services/server-service';
import {
  Server as ServerIcon,
  HardDrive,
  Cpu,
  Activity,
  Plus,
  Eye,
  ShieldCheck,
  Zap,
  Thermometer,
  Layers,
  ChevronRight,
  Maximize2,
  Lock,
  Unlock,
} from 'lucide-react';

interface ServerRackCabinet3DProps {
  rackInfo: RackOccupancyInfo;
  onSelectServer: (server: ServerRecord) => void;
  onAddAtSlot: (rackId: RackId, uSlot: number) => void;
  onEditServer?: (server: ServerRecord) => void;
}

export default function ServerRackCabinet3D({
  rackInfo,
  onSelectServer,
  onAddAtSlot,
  onEditServer,
}: ServerRackCabinet3DProps) {
  const [doorOpen, setDoorOpen] = useState(true);
  const [hoveredU, setHoveredU] = useState<number | null>(null);

  // Group contiguous occupied slots into unified multi-U server blocks
  // so a 2U or 4U server renders as one cohesive front panel!
  const renderedElements: React.ReactNode[] = [];
  let currentU = 42;

  while (currentU >= 1) {
    const slot = rackInfo.slots.find((s) => s.u === currentU);
    if (!slot || !slot.isOccupied || !slot.server) {
      // Empty slot
      const u = currentU;
      renderedElements.push(
        <div
          key={`empty-${u}`}
          onMouseEnter={() => setHoveredU(u)}
          onMouseLeave={() => setHoveredU(null)}
          className={`group relative h-7 sm:h-8 border-b border-slate-800/60 flex items-center justify-between px-2 text-[10px] transition-all ${
            hoveredU === u ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-950/40 hover:bg-slate-900/60'
          }`}
        >
          {/* U Marker Left */}
          <span className="font-mono text-[9px] text-slate-400 font-bold w-6 select-none">
            {u.toString().padStart(2, '0')}U
          </span>

          {/* Empty Space Guide */}
          <div className="flex-1 flex items-center justify-center">
            {hoveredU === u ? (
              <button
                type="button"
                onClick={() => onAddAtSlot(rackInfo.rackId, u)}
                className="px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-md shadow-emerald-600/30 transition transform scale-105"
              >
                <Plus className="w-3 h-3" />
                ติดตั้ง Server ที่ U{u}
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono select-none">
                — ช่องว่าง (Empty Slot) —
              </span>
            )}
          </div>

          {/* U Marker Right */}
          <span className="font-mono text-[9px] text-slate-400 font-bold w-6 text-right select-none">
            {u.toString().padStart(2, '0')}U
          </span>
        </div>
      );
      currentU--;
    } else {
      // Occupied slot by server
      const server = slot.server;
      const size = server.unit_size || 1;
      const startU = server.unit_position || currentU;
      const heightClass =
        size === 1
          ? 'h-8 sm:h-9'
          : size === 2
          ? 'h-16 sm:h-18'
          : size === 3
          ? 'h-24 sm:h-27'
          : 'h-32 sm:h-36';

      const isOnline = server.status === 'online';
      const isMaint = server.status === 'maintenance';

      renderedElements.push(
        <div
          key={`server-${server.id}`}
          onClick={() => onSelectServer(server)}
          className={`group relative ${heightClass} border-b border-t border-slate-700/80 cursor-pointer transition-all duration-150 select-none overflow-hidden ${
            isOnline
              ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 hover:from-slate-850 hover:to-slate-800 border-l-4 border-l-emerald-500'
              : isMaint
              ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 hover:from-slate-850 hover:to-slate-800 border-l-4 border-l-amber-500'
              : 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 hover:from-slate-900 hover:to-slate-850 border-l-4 border-l-red-500'
          }`}
        >
          {/* Subtle Brushed Metal Texture Lines */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none"></div>

          <div className="h-full flex items-center justify-between px-2.5 sm:px-3 relative z-10">
            {/* Left Ear & Rack Handle */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center justify-center w-5">
                <span className="font-mono text-[9px] font-bold text-blue-400">
                  U{startU}
                </span>
                {size > 1 && (
                  <span className="font-mono text-[8px] text-slate-400">
                    -{startU + size - 1}
                  </span>
                )}
                {/* Simulated rack mounting screw */}
                <div className="w-1.5 h-1.5 rounded-full bg-slate-600 border border-slate-500 mt-1"></div>
              </div>

              {/* Status LED & Server Identity */}
              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center justify-center">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOnline
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse'
                        : isMaint
                        ? 'bg-amber-400 shadow-sm shadow-amber-400'
                        : 'bg-red-500'
                    }`}
                  ></span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide group-hover:text-blue-300 transition">
                      {server.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {server.unit_size}U
                    </span>
                    {server.specs?.brand_model && (
                      <span className="hidden sm:inline-block text-[10px] text-slate-400 font-sans truncate max-w-[130px]">
                        {server.specs.brand_model}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-2 mt-0.5">
                    <span>IP: {server.ip_address}</span>
                    {server.ilo_ip && (
                      <span className="hidden md:inline text-slate-400 text-[9px]">
                        (iLO: {server.ilo_ip})
                      </span>
                    )}
                    <span className="text-slate-400 text-[10px] hidden lg:inline">
                      • {server.role_purpose}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Faceplate Elements: Simulated Drive Bays / Ports */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Drive Bay / Fan Grille graphic based on size */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(size * 3, 8) }).map((_, dIdx) => (
                  <div
                    key={dIdx}
                    className="w-2.5 h-4 sm:h-5 rounded-xs bg-slate-800 border border-slate-700 flex flex-col justify-between p-0.5"
                  >
                    <div className="w-1 h-1 rounded-full bg-emerald-500/70"></div>
                    <div className="w-full h-0.5 bg-slate-600"></div>
                  </div>
                ))}
              </div>

              {/* Quick Info & Action Pill */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                    isOnline
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                      : isMaint
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                      : 'bg-red-950/60 text-red-300 border-red-800/50'
                  }`}
                >
                  {isOnline ? 'Online' : isMaint ? 'Maint' : 'Offline'}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectServer(server);
                  }}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title="ดูรายละเอียดและรหัสผ่าน"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      );

      // Decrement by the server's size
      currentU -= size;
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden group/rack">
      {/* 3D Rack Header & Telemetry */}
      <div className="border-b border-slate-800 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xs">
              {rackInfo.rackId === 'rack-1' ? 'R1' : 'R2'}
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {rackInfo.rackName}
              </h3>
              <p className="text-[11px] text-slate-400">
                ตู้เซิร์ฟเวอร์มาตรฐาน EIA-310-D ขนาด 42U แบบ Full-Depth
              </p>
            </div>
          </div>
        </div>

        {/* Telemetry badges & Door switch */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>ความจุ: <strong className="text-white">{rackInfo.usedU}/42 U</strong></span>
            <span className="text-[10px] text-blue-400">({rackInfo.percentUsed}%)</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <Thermometer className="w-3.5 h-3.5 text-emerald-400" />
            <span>21.5°C</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{rackInfo.rackId === 'rack-1' ? '1.8 kW' : '2.4 kW'}</span>
          </div>

          <button
            type="button"
            onClick={() => setDoorOpen(!doorOpen)}
            className={`px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              doorOpen
                ? 'bg-blue-950/40 border-blue-600/50 text-blue-300 hover:bg-blue-900/50'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="เปิด/ปิด ประตูกระจกจำลอง"
          >
            {doorOpen ? <Unlock className="w-3 h-3 text-blue-400" /> : <Lock className="w-3 h-3 text-slate-400" />}
            <span>{doorOpen ? 'เปิดประตูหน้า' : 'ปิดประตูกระจก'}</span>
          </button>
        </div>
      </div>

      {/* 3D Realistic Server Cabinet Chassis */}
      <div className="relative mx-auto w-full max-w-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-2.5 sm:p-4 border-2 border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]">
        
        {/* Top Exhaust Fan Grille Simulation with Spinning Micro-animation */}
        <div className="h-6 bg-slate-900 border-b border-slate-800 rounded-t-xl flex items-center justify-around px-8 mb-2">
          {Array.from({ length: 4 }).map((_, fIdx) => (
            <div key={fIdx} className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full border border-blue-500/50 bg-blue-500/20 animate-spin"></span>
              <span>FAN {fIdx + 1}</span>
            </div>
          ))}
        </div>

        {/* Inner Rack Rail Container */}
        <div className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner max-h-[680px] overflow-y-auto no-scrollbar">
          {/* Glass Door Effect Overlay (Visible when door is closed) */}
          {!doorOpen && (
            <div
              onClick={() => setDoorOpen(true)}
              className="absolute inset-0 z-30 bg-gradient-to-tr from-cyan-950/30 via-slate-900/40 to-cyan-500/10 backdrop-blur-[1px] border border-cyan-500/30 flex flex-col items-center justify-center cursor-pointer group/door"
            >
              <div className="bg-slate-900/90 border border-cyan-500/40 px-4 py-2 rounded-2xl shadow-xl text-center group-hover/door:scale-105 transition">
                <Lock className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                <span className="text-xs font-bold text-white block">ประตูกระจกปิดอยู่ (Glass Door Locked)</span>
                <span className="text-[10px] text-cyan-300">คลิกเพื่อเปิดประตูด้านหน้า</span>
              </div>
            </div>
          )}

          {/* Left Vertical Mounting Rail */}
          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-slate-900 border-r border-slate-800 pointer-events-none z-20"></div>

          {/* Slot Rows */}
          <div className="divide-y divide-slate-800/40">
            {renderedElements}
          </div>

          {/* Right Vertical Mounting Rail */}
          <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-slate-900 border-l border-slate-800 pointer-events-none z-20"></div>
        </div>

        {/* Rack Base & Cable Trench Simulation */}
        <div className="h-5 bg-slate-900 border-t border-slate-800 rounded-b-xl flex items-center justify-between px-4 mt-2 text-[9px] text-slate-400 font-mono">
          <span>⚡ 3-Phase PDU Attached</span>
          <span>42U EIA-310-D SPEC</span>
          <span>GROUNDED ✓</span>
        </div>
      </div>
    </div>
  );
}
