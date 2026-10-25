'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { 
  Wrench, 
  Calendar, 
  Laptop, 
  ClipboardList, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle,
  FileText,
  Settings
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Role Guard: Reject non-admin users
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">ไม่มีสิทธิ์เข้าถึง (Access Denied)</h1>
          <p className="text-slate-400 text-sm mb-6">
            หน้านี้สงวนไว้สำหรับเจ้าหน้าที่ฝ่ายสนับสนุนเทคนิค (IT Staff) เท่านั้น กรุณาเข้าสู่ระบบด้วยบัญชีแอดมิน
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar activeSection="overview" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                IT Operations Center
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              ศูนย์ควบคุมและบริหารจัดการไอที
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/reports"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 transition"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>พิมพ์รายงาน A4</span>
            </Link>
            <Link
              href="/admin/settings"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 transition"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>ตั้งค่าระบบ</span>
            </Link>
          </div>
        </div>

        {/* 4 Core Module KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          {/* KPI 1: งานซ่อมรอดำเนินการ */}
          <Link
            href="/admin/tickets"
            className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 transition group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Helpdesk
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">งานซ่อมรอรับเรื่อง</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">0</span>
              <span className="text-xs text-slate-500">รายการ</span>
            </div>
          </Link>

          {/* KPI 2: ห้องประชุมที่จองวันนี้ */}
          <Link
            href="/admin/bookings"
            className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 transition group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Bookings
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">การจองห้องวันนี้</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">0</span>
              <span className="text-xs text-slate-500">คิวการประชุม</span>
            </div>
          </Link>

          {/* KPI 3: อุปกรณ์ที่ถูกยืมอยู่ */}
          <Link
            href="/admin/assets"
            className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 transition group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Laptop className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Asset Loans
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">อุปกรณ์ที่ถูกยืม</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">0</span>
              <span className="text-xs text-slate-500">ชิ้น (พร้อมใช้ 100%)</span>
            </div>
          </Link>

          {/* KPI 4: งานบำรุงรักษา PM เดือนนี้ */}
          <Link
            href="/admin/roadmaps"
            className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 transition group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Roadmap
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">ความคืบหน้า PM ปี 2026</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">100%</span>
              <span className="text-xs text-slate-500">พร้อมดำเนินการ</span>
            </div>
          </Link>

        </div>

        {/* Action Shortcuts & System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>ภาพรวมภารกิจฝ่ายไอทีประจำวัน</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  1. คิวแจ้งซ่อม (Helpdesk)
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  ระบบเชื่อมต่อ LINE Flex Message ส่งเข้ากลุ่มช่างทันทีที่มีงานเข้า
                </p>
                <Link
                  href="/admin/tickets"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  <span>เปิดหน้ารับเรื่อง</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  2. จองห้อง & Zoom/Teams
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  ระบบล็อกฐานข้อมูล Exclusion Constraint ป้องกันการจองชนกัน 100%
                </p>
                <Link
                  href="/admin/bookings"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  <span>ดูตารางปฏิทิน</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  3. เคาน์เตอร์ยืม-คืนอุปกรณ์
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  บันทึกสภาพเครื่องก่อนยืม ตรวจรับคืน พร้อมระบบเตือน Overdue สีแดง
                </p>
                <Link
                  href="/admin/assets"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  <span>เปิดเคาน์เตอร์ยืม-คืน</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  4. แผนงาน Roadmap ประจำปี
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  กดสร้างงาน 12 เดือนจาก Template เช็กงาน Preventive Maintenance ครบถ้วน
                </p>
                <Link
                  href="/admin/roadmaps"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  <span>จัดการแผนงาน PM</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Quick System Environment Info */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>สถานะระบบ (Infrastructure)</span>
              </h2>

              <ul className="space-y-3 text-xs">
                <li className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-slate-400">Hosting:</span>
                  <span className="text-slate-200 font-mono">Vercel (Hobby Free)</span>
                </li>
                <li className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-slate-400">Database:</span>
                  <span className="text-slate-200 font-mono">Supabase PostgreSQL</span>
                </li>
                <li className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-slate-400">Notifications:</span>
                  <span className="text-emerald-400 font-mono">LINE Flex API Ready</span>
                </li>
                <li className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-slate-400">Client PWA:</span>
                  <span className="text-blue-400 font-mono">App Shell Ready</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-400">License / Cost:</span>
                  <span className="text-emerald-400 font-semibold">0 บาท (Free Tier)</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] leading-relaxed">
              💡 <strong>คำแนะนำ:</strong> ในการเริ่มต้นใช้งานจริง ให้รันไฟล์ Migration ในโฟลเดอร์ <code className="text-white">supabase/migrations/001_initial_schema.sql</code> บนแดชบอร์ด Supabase ของคุณ
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
