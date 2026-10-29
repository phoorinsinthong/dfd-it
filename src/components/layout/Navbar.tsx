'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Wrench, LogOut, ShieldCheck, User, Calendar, Laptop, ClipboardList, Settings, FileText, Server } from 'lucide-react';
import AdminNotificationListener from '@/components/admin/AdminNotificationListener';

export default function Navbar({ activeSection }: { activeSection?: string }) {
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md text-slate-100 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href={isAdmin ? "/admin" : "/portal"} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base text-white tracking-tight block">
                IT Support Hub
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                {isAdmin ? (isSuperAdmin ? 'ระบบจัดการ Superadmin' : 'ระบบจัดการฝ่ายไอที') : 'ระบบบริการผู้ใช้งาน'}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links for Admin */}
        {isAdmin && (
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
            <Link
              href="/admin"
              className={`px-3 py-2 rounded-lg transition ${
                activeSection === 'overview' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              ภาพรวม (Overview)
            </Link>
            <Link
              href="/admin/tickets"
              className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeSection === 'tickets' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              งานแจ้งซ่อม
            </Link>
            <Link
              href="/admin/bookings"
              className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeSection === 'bookings' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              จองห้องประชุม
            </Link>
            <Link
              href="/admin/assets"
              className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeSection === 'assets' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              ยืม-คืนอุปกรณ์
            </Link>
            <Link
              href="/admin/roadmaps"
              className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeSection === 'roadmaps' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              แผนงาน PM
            </Link>
            <Link
              href="/admin/servers"
              className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeSection === 'servers' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-blue-400" />
              เซิร์ฟเวอร์
            </Link>
            <Link
              href="/admin/reports"
              className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeSection === 'reports' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              รายงานสรุป
            </Link>
            <Link
              href="/admin/settings"
              className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeSection === 'settings' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              ตั้งค่าระบบ
            </Link>
            {isSuperAdmin && (
              <Link
                href="/admin/users"
                className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                  activeSection === 'users' ? 'bg-purple-900/40 text-purple-300 font-semibold border border-purple-500/30' : 'text-purple-300 hover:text-white hover:bg-purple-950/40'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                แอดมิน & Logs
              </Link>
            )}
          </nav>
        )}

        {/* User Profile, Sound Alert & Logout */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {isAdmin && <AdminNotificationListener />}

          {user && (
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 py-1.5 px-3 rounded-xl text-xs">
              <span className={`w-2 h-2 rounded-full ${isSuperAdmin ? 'bg-purple-400' : isAdmin ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
              <span className="text-slate-200 font-medium hidden sm:inline">{user.name}</span>
              <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${
                isSuperAdmin ? 'bg-purple-900/60 text-purple-300 border border-purple-500/30' : isAdmin ? 'bg-slate-700 text-slate-300' : 'bg-blue-900/60 text-blue-300'
              }`}>
                {isSuperAdmin ? 'Super Admin' : isAdmin ? 'IT Staff' : 'User'}
              </span>
            </div>
          )}

          <button
            onClick={logout}
            title="ออกจากระบบ"
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation bar for Admin */}
      {isAdmin && (
        <div className="md:hidden flex items-center gap-1.5 px-4 py-2 bg-slate-950/90 border-t border-slate-800/80 overflow-x-auto text-xs no-scrollbar">
          <Link
            href="/admin"
            className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition ${
              activeSection === 'overview' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            ภาพรวม
          </Link>
          <Link
            href="/admin/tickets"
            className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition flex items-center gap-1 ${
              activeSection === 'tickets' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-3 h-3" /> แจ้งซ่อม
          </Link>
          <Link
            href="/admin/bookings"
            className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition flex items-center gap-1 ${
              activeSection === 'bookings' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3 h-3" /> จองห้อง
          </Link>
          <Link
            href="/admin/assets"
            className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition flex items-center gap-1 ${
              activeSection === 'assets' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Laptop className="w-3 h-3" /> ยืม-คืน
          </Link>
          <Link
            href="/admin/roadmaps"
            className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition flex items-center gap-1 ${
              activeSection === 'roadmaps' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-3 h-3" /> แผนงาน PM
          </Link>
          <Link
            href="/admin/servers"
            className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition flex items-center gap-1 ${
              activeSection === 'servers' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-3 h-3 text-blue-400" /> เซิร์ฟเวอร์
          </Link>
          <Link
            href="/admin/reports"
            className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition flex items-center gap-1 ${
              activeSection === 'reports' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3 h-3" /> รายงาน
          </Link>
          <Link
            href="/admin/settings"
            className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition flex items-center gap-1 ${
              activeSection === 'settings' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-3 h-3" /> ตั้งค่า
          </Link>
          {isSuperAdmin && (
            <Link
              href="/admin/users"
              className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition flex items-center gap-1 font-semibold ${
                activeSection === 'users'
                  ? 'bg-purple-900/60 text-purple-200 border border-purple-500/50'
                  : 'bg-purple-950/50 text-purple-300 border border-purple-500/30'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              แอดมิน & Logs
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
