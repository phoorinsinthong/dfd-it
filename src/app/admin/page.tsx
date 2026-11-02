'use client';

import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  FileText, 
  Settings, 
  ShieldCheck, 
  Server,
  Package,
  Bell,
  Video,
  User,
  MapPin,
  Sparkles,
  RefreshCw,
  Layers,
  ShoppingBag
} from 'lucide-react';
import { getAllTickets } from '@/lib/services/ticket-service';
import { getAllBookings } from '@/lib/services/booking-service';
import { getAssets, getActiveLoans, getOverdueLoans } from '@/lib/services/asset-service';
import { getSupplies } from '@/lib/services/supply-service';
import { getChecklists } from '@/lib/services/roadmap-service';
import { Ticket, Booking, Asset, BorrowLog, SupplyItem, Checklist } from '@/types/database';

interface PMTaskItem {
  checklistId: string;
  checklistTitle: string;
  itemId: string;
  taskName: string;
  dueDate?: string;
  isCompleted: boolean;
  isDueToday: boolean;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [loadingData, setLoadingData] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeLoans, setActiveLoans] = useState<BorrowLog[]>([]);
  const [overdueLoans, setOverdueLoans] = useState<BorrowLog[]>([]);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);

  // Agenda Filter Tab
  const [agendaTab, setAgendaTab] = useState<'all' | 'tickets' | 'bookings' | 'loans' | 'pm' | 'supplies'>('all');

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [allTickets, allBookings, allAssets, currentLoans, lateLoans, allSupplies, allChecklists] =
        await Promise.all([
          getAllTickets(),
          getAllBookings(),
          getAssets(),
          getActiveLoans(),
          getOverdueLoans(),
          getSupplies(),
          getChecklists(),
        ]);

      setTickets(allTickets);
      setBookings(allBookings);
      setAssets(allAssets);
      setActiveLoans(currentLoans);
      setOverdueLoans(lateLoans);
      setSupplies(allSupplies);
      setChecklists(allChecklists);
    } catch (error) {
      console.error('Failed to load admin overview data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    } else if (user && (user.role === 'admin' || user.role === 'superadmin')) {
      loadData();
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
  if (user.role !== 'admin' && user.role !== 'superadmin') {
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

  // Date Calculations
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const currentMonthNumber = today.getMonth() + 1;

  const thaiDateFormatted = today.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // 1. Helpdesk Tickets
  const activeTickets = tickets.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  );
  const pendingTickets = tickets.filter((t) => t.status === 'pending');
  const inProgressTickets = tickets.filter((t) => t.status === 'in_progress');

  // 2. Bookings Today
  const todayBookings = bookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    try {
      const bDate = new Date(b.start_time);
      const bYear = bDate.getFullYear();
      const bMonth = String(bDate.getMonth() + 1).padStart(2, '0');
      const bDay = String(bDate.getDate()).padStart(2, '0');
      return `${bYear}-${bMonth}-${bDay}` === todayStr;
    } catch {
      return false;
    }
  });

  // 3. Equipment Loans due today or overdue
  const dueOrOverdueLoans = activeLoans.filter((l) => {
    return l.expected_return_date <= todayStr;
  });

  // 4. PM Tasks for Today / This Month
  const pmTasks: PMTaskItem[] = [];
  checklists.forEach((c) => {
    const isThisMonth =
      c.target_month === currentMonthNumber ||
      (c.scheduled_months && c.scheduled_months.includes(currentMonthNumber));

    if (isThisMonth && Array.isArray(c.items)) {
      c.items.forEach((item) => {
        const isDueToday = item.due_date === todayStr;
        if (!item.is_completed || isDueToday) {
          pmTasks.push({
            checklistId: c.id,
            checklistTitle: c.title,
            itemId: item.id,
            taskName: item.task_name,
            dueDate: item.due_date,
            isCompleted: item.is_completed,
            isDueToday,
          });
        }
      });
    }
  });

  // PM Progress
  const totalPMItems = checklists.reduce((acc, c) => acc + (c.items?.length || 0), 0);
  const completedPMItems = checklists.reduce(
    (acc, c) => acc + (c.items?.filter((i) => i.is_completed).length || 0),
    0
  );
  const pmProgressPercent = totalPMItems > 0 ? Math.round((completedPMItems / totalPMItems) * 100) : 100;

  // 5. Low Stock Supplies
  const lowStockSupplies = supplies.filter(
    (s) => s.status === 'low_stock' || s.status === 'out_of_stock' || s.quantity <= s.min_quantity
  );

  // Available Assets calculation
  const availableAssetsCount = assets.filter((a) => a.status === 'available').length;
  const availableAssetsPercent = assets.length > 0 ? Math.round((availableAssetsCount / assets.length) * 100) : 100;

  // Format Time Range for Bookings
  const formatTimeRange = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const sTime = s.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const eTime = e.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      return `${sTime} - ${eTime} น.`;
    } catch {
      return 'ไม่ระบุเวลา';
    }
  };

  // Total Tasks Count
  const totalTodayTasks =
    activeTickets.length +
    todayBookings.length +
    dueOrOverdueLoans.length +
    pmTasks.length +
    lowStockSupplies.length;

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

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => loadData()}
              disabled={loadingData}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>รีเฟรช</span>
            </button>
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
            {user.role === 'superadmin' && (
              <Link
                href="/admin/users"
                className="px-4 py-2 bg-purple-900/50 hover:bg-purple-900/70 text-purple-200 border border-purple-500/40 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-lg shadow-purple-950/40"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>แอดมิน & Logs</span>
              </Link>
            )}
          </div>
        </div>

        {/* 4 Core Module Live KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          {/* KPI 1: งานซ่อมรอดำเนินการ */}
          <Link
            href="/admin/tickets"
            className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 transition group relative overflow-hidden"
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
              <span className="text-2xl font-bold text-white">
                {loadingData ? '...' : pendingTickets.length}
              </span>
              <span className="text-xs text-slate-500">
                {inProgressTickets.length > 0 ? `(กำลังซ่อม ${inProgressTickets.length})` : 'รายการ'}
              </span>
            </div>
          </Link>

          {/* KPI 2: ห้องประชุมที่จองวันนี้ */}
          <Link
            href="/admin/bookings"
            className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 transition group relative overflow-hidden"
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
              <span className="text-2xl font-bold text-white">
                {loadingData ? '...' : todayBookings.length}
              </span>
              <span className="text-xs text-slate-500">คิวการประชุม</span>
            </div>
          </Link>

          {/* KPI 3: อุปกรณ์ที่ถูกยืมอยู่ */}
          <Link
            href="/admin/assets"
            className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 transition group relative overflow-hidden"
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
              <span className="text-2xl font-bold text-white">
                {loadingData ? '...' : activeLoans.length}
              </span>
              <span className="text-xs text-slate-500">
                {overdueLoans.length > 0 ? (
                  <span className="text-red-400 font-semibold">(เกินกำหนด {overdueLoans.length})</span>
                ) : (
                  `ชิ้น (พร้อมใช้ ${availableAssetsPercent}%)`
                )}
              </span>
            </div>
          </Link>

          {/* KPI 4: งานบำรุงรักษา PM & สต็อกวัสดุ */}
          <Link
            href="/admin/roadmaps"
            className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 transition group relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Roadmap & Stock
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">PM ปี 2026 / พัสดุคงคลัง</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">
                {loadingData ? '...' : `${pmProgressPercent}%`}
              </span>
              <span className="text-xs text-slate-500">
                {lowStockSupplies.length > 0 ? (
                  <span className="text-amber-400">(พัสดุเตือน {lowStockSupplies.length})</span>
                ) : (
                  'สถานะปกติ'
                )}
              </span>
            </div>
          </Link>

        </div>

        {/* Superadmin Quick Access Banner */}
        {user.role === 'superadmin' && (
          <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-900 border border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-purple-950/20">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-purple-300 bg-purple-900/80 px-2 py-0.5 rounded border border-purple-500/30">
                    สิทธิ์เฉพาะ Superadmin
                  </span>
                  <h2 className="text-base font-bold text-white">จัดการผู้ดูแลระบบ & ประวัติการกระทำ (Audit Trail)</h2>
                </div>
                <p className="text-xs text-slate-400">
                  เพิ่ม/แก้ไข/ลบเจ้าหน้าที่ไอที พร้อมตรวจสอบประวัติการทำงาน ทุกโมดูลในระบบ
                </p>
              </div>
            </div>
            <Link
              href="/admin/users"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shrink-0 shadow-lg shadow-purple-600/30 transition"
            >
              <span>เปิดหน้าจัดการแอดมิน & Logs</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* ============================================================ */}
        {/* NEW SECTION: วันนี้มีงานอะไรบ้าง (Today's Agenda & Operations) */}
        {/* ============================================================ */}
        <section className="mb-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Today&apos;s Operations
                </span>
                <span className="text-xs text-slate-400">
                  {thaiDateFormatted}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                <span>📋 วันนี้มีงานอะไรบ้าง</span>
                <span className={`text-xs px-2.5 py-1 rounded-xl font-semibold ${
                  totalTodayTasks > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {totalTodayTasks > 0 ? `${totalTodayTasks} รายการต้องดูแล` : 'เรียบร้อยทุกรายการ'}
                </span>
              </h2>
            </div>

            {/* Quick Status Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {activeTickets.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-950/50 border border-amber-700/50 text-amber-300 font-medium flex items-center gap-1.5">
                  <Wrench className="w-3 h-3 text-amber-400" />
                  ซ่อมค้าง {activeTickets.length}
                </span>
              )}
              {todayBookings.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-950/50 border border-blue-700/50 text-blue-300 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-blue-400" />
                  ประชุม {todayBookings.length}
                </span>
              )}
              {dueOrOverdueLoans.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-red-950/50 border border-red-700/50 text-red-300 font-medium flex items-center gap-1.5">
                  <Laptop className="w-3 h-3 text-red-400" />
                  ส่งคืนอุปกรณ์ {dueOrOverdueLoans.length}
                </span>
              )}
              {pmTasks.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-700/50 text-emerald-300 font-medium flex items-center gap-1.5">
                  <ClipboardList className="w-3 h-3 text-emerald-400" />
                  PM {pmTasks.length}
                </span>
              )}
              {lowStockSupplies.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-950/50 border border-purple-700/50 text-purple-300 font-medium flex items-center gap-1.5">
                  <Package className="w-3 h-3 text-purple-400" />
                  พัสดุเตือน {lowStockSupplies.length}
                </span>
              )}
            </div>
          </div>

          {/* Agenda Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto py-4 border-b border-slate-800/80 text-xs no-scrollbar">
            <button
              onClick={() => setAgendaTab('all')}
              className={`px-3.5 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 shrink-0 ${
                agendaTab === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>ทั้งหมด ({totalTodayTasks})</span>
            </button>
            <button
              onClick={() => setAgendaTab('tickets')}
              className={`px-3.5 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 shrink-0 ${
                agendaTab === 'tickets'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>งานแจ้งซ่อม ({activeTickets.length})</span>
            </button>
            <button
              onClick={() => setAgendaTab('bookings')}
              className={`px-3.5 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 shrink-0 ${
                agendaTab === 'bookings'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>จองห้องประชุม ({todayBookings.length})</span>
            </button>
            <button
              onClick={() => setAgendaTab('loans')}
              className={`px-3.5 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 shrink-0 ${
                agendaTab === 'loans'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>ยืม-คืนอุปกรณ์ ({dueOrOverdueLoans.length})</span>
            </button>
            <button
              onClick={() => setAgendaTab('pm')}
              className={`px-3.5 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 shrink-0 ${
                agendaTab === 'pm'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>บำรุงรักษา PM ({pmTasks.length})</span>
            </button>
            <button
              onClick={() => setAgendaTab('supplies')}
              className={`px-3.5 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 shrink-0 ${
                agendaTab === 'supplies'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>พัสดุใกล้หมด ({lowStockSupplies.length})</span>
            </button>
          </div>

          {/* Agenda List Content */}
          <div className="pt-5 space-y-3">
            {loadingData ? (
              <div className="py-12 text-center text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-xs">กำลังรวบรวมภารกิจไอทีวันนี้...</p>
              </div>
            ) : totalTodayTasks === 0 ? (
              /* All Caught Up Empty State */
              <div className="py-12 px-4 text-center rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-950/30">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                  🎉 วันนี้ไม่มีงานค้าง ทุกอย่างดำเนินไปด้วยความเรียบร้อย!
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
                  ไม่มีงานแจ้งซ่อมค้าง การจองห้อง ครุภัณฑ์เกินกำหนด หรือ PM ที่ต้องทำในวันนี้ เจ้าหน้าที่ไอทีสามารถตรวจสอบงานเชิงรุกหรือดูรายงานภาพรวมได้
                </p>
              </div>
            ) : (
              <>
                {/* 1. Helpdesk Tickets */}
                {(agendaTab === 'all' || agendaTab === 'tickets') && activeTickets.length > 0 && (
                  <div className="space-y-2.5">
                    {agendaTab === 'all' && (
                      <div className="flex items-center gap-2 pt-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                        <Wrench className="w-3.5 h-3.5" />
                        <span>งานแจ้งซ่อมที่ต้องดำเนินการ ({activeTickets.length} งาน)</span>
                      </div>
                    )}
                    {activeTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            ticket.urgency === 'urgent'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            <Wrench className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                {ticket.category_name || 'งานไอทีทั่วไป'}
                              </span>
                              {ticket.urgency === 'urgent' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950/60 text-red-300 border border-red-500/40 animate-pulse">
                                  🔴 ด่วนที่สุด
                                </span>
                              )}
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                ticket.status === 'pending'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}>
                                {ticket.status === 'pending' ? '⏳ รอรับเรื่อง' : '🔧 กำลังซ่อม'}
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-white truncate group-hover:text-amber-300 transition">
                              {ticket.title}
                            </h4>
                            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-500" />
                                {ticket.user_name || 'ผู้ใช้งาน'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {ticket.department_name || ticket.location || '-'}
                              </span>
                            </p>
                          </div>
                        </div>

                        <Link
                          href="/admin/tickets"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition shrink-0 self-start sm:self-auto"
                        >
                          <span>เปิดดูงานซ่อม</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Room Bookings Today */}
                {(agendaTab === 'all' || agendaTab === 'bookings') && todayBookings.length > 0 && (
                  <div className="space-y-2.5">
                    {agendaTab === 'all' && (
                      <div className="flex items-center gap-2 pt-3 text-xs font-bold text-blue-400 uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>การใช้ห้องประชุม & Zoom/Teams วันนี้ ({todayBookings.length} คิว)</span>
                      </div>
                    )}
                    {todayBookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                            {b.room_type === 'online' ? <Video className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/50">
                                {b.room_name || 'ห้องประชุม'}
                              </span>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                {b.room_type === 'online' ? 'Online Meeting' : 'Onsite'}
                              </span>
                              <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTimeRange(b.start_time, b.end_time)}
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-white truncate group-hover:text-blue-300 transition">
                              {b.title}
                            </h4>
                            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-500" />
                                ผู้จอง: {b.user_name || b.booked_by_staff_name || 'เจ้าหน้าที่'}
                              </span>
                              {b.required_equipment && b.required_equipment.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400 text-[11px]">
                                    อุปกรณ์: {b.required_equipment.join(', ')}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <Link
                          href="/admin/bookings"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold transition shrink-0 self-start sm:self-auto"
                        >
                          <span>เปิดดูตารางห้อง</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Equipment Loans Due Today / Overdue */}
                {(agendaTab === 'all' || agendaTab === 'loans') && dueOrOverdueLoans.length > 0 && (
                  <div className="space-y-2.5">
                    {agendaTab === 'all' && (
                      <div className="flex items-center gap-2 pt-3 text-xs font-bold text-red-400 uppercase tracking-wider">
                        <Laptop className="w-3.5 h-3.5" />
                        <span>อุปกรณ์ที่ต้องส่งคืนวันนี้ หรือเกินกำหนด ({dueOrOverdueLoans.length} รายการ)</span>
                      </div>
                    )}
                    {dueOrOverdueLoans.map((loan) => {
                      const isLate = loan.expected_return_date < todayStr;
                      return (
                        <div
                          key={loan.id}
                          className={`p-4 rounded-2xl bg-slate-950/60 border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                            isLate ? 'border-red-500/50 hover:border-red-400' : 'border-amber-500/40 hover:border-amber-400'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isLate
                                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}>
                              <Laptop className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-mono text-xs font-bold text-slate-200">
                                  {loan.asset_code}
                                </span>
                                {isLate ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950/70 text-red-300 border border-red-500/40 animate-pulse">
                                    ⚠️ เกินกำหนดส่งคืน ({loan.expected_return_date})
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    ⏰ ครบกำหนดส่งคืนวันนี้
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-semibold text-white truncate">
                                {loan.asset_name || 'ครุภัณฑ์ประจำแผนก'}
                              </h4>
                              <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-500" />
                                  ผู้ยืม: {loan.borrower_name} ({loan.borrower_dept_name || '-'})
                                </span>
                              </p>
                            </div>
                          </div>

                          <Link
                            href="/admin/assets"
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold transition shrink-0 self-start sm:self-auto"
                          >
                            <span>เปิดเคาน์เตอร์รับคืน</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 4. PM Maintenance Tasks */}
                {(agendaTab === 'all' || agendaTab === 'pm') && pmTasks.length > 0 && (
                  <div className="space-y-2.5">
                    {agendaTab === 'all' && (
                      <div className="flex items-center gap-2 pt-3 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>งานบำรุงรักษาเชิงป้องกัน PM เดือนนี้ / วันนี้ ({pmTasks.length} รายการ)</span>
                      </div>
                    )}
                    {pmTasks.map((pm) => (
                      <div
                        key={pm.itemId}
                        className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            pm.isCompleted
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            <ClipboardList className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                {pm.checklistTitle}
                              </span>
                              {pm.isDueToday && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                                  🌟 กำหนดทำวันนี้ ({pm.dueDate})
                                </span>
                              )}
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                pm.isCompleted
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              }`}>
                                {pm.isCompleted ? '✓ เช็กเสร็จแล้ว' : 'รอตรวจสอบ'}
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-white">
                              {pm.taskName}
                            </h4>
                          </div>
                        </div>

                        <Link
                          href="/admin/roadmaps"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition shrink-0 self-start sm:self-auto"
                        >
                          <span>เปิดเช็กลิสต์ PM</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5. Low Stock Supplies */}
                {(agendaTab === 'all' || agendaTab === 'supplies') && lowStockSupplies.length > 0 && (
                  <div className="space-y-2.5">
                    {agendaTab === 'all' && (
                      <div className="flex items-center gap-2 pt-3 text-xs font-bold text-purple-400 uppercase tracking-wider">
                        <Package className="w-3.5 h-3.5" />
                        <span>พัสดุและวัสดุไอทีใกล้หมดสต็อก ({lowStockSupplies.length} รายการ)</span>
                      </div>
                    )}
                    {lowStockSupplies.map((supply) => (
                      <div
                        key={supply.id}
                        className="p-4 rounded-2xl bg-slate-950/60 border border-purple-500/30 hover:border-purple-400 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-slate-200">
                                {supply.item_code}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300">
                                {supply.category}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                supply.quantity === 0
                                  ? 'bg-red-950 text-red-300 border border-red-500/40'
                                  : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              }`}>
                                {supply.quantity === 0 ? 'หมดสต็อก (0)' : `ใกล้หมด (เหลือ ${supply.quantity} ${supply.unit})`}
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-white">
                              {supply.name}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              เกณฑ์ขั้นต่ำ: {supply.min_quantity} {supply.unit}
                            </p>
                          </div>
                        </div>

                        <Link
                          href="/admin/supplies"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition shrink-0 self-start sm:self-auto"
                        >
                          <span>เปิดคลังพัสดุ</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty Tab State */}
                {agendaTab !== 'all' && (
                  (agendaTab === 'tickets' && activeTickets.length === 0) ||
                  (agendaTab === 'bookings' && todayBookings.length === 0) ||
                  (agendaTab === 'loans' && dueOrOverdueLoans.length === 0) ||
                  (agendaTab === 'pm' && pmTasks.length === 0) ||
                  (agendaTab === 'supplies' && lowStockSupplies.length === 0)
                ) && (
                  <div className="py-8 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-xs">ไม่มีรายการในหมวดหมู่นี้สำหรับวันนี้</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

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
                  สร้างงาน 12 เดือนจาก Template เช็กงาน Preventive Maintenance ครบถ้วน
                </p>
                <Link
                  href="/admin/roadmaps"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  <span>จัดการแผนงาน PM</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-cyan-400" />
                      <span>5. ตู้ Server Rack 3D & Cloud Infrastructure</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      แผนผังตู้แร็ค 42U สเปก CPU/RAM/Disk, IP Address, รหัสผ่าน และระบบจัดการ Cloud Server
                    </p>
                  </div>
                  <Link
                    href="/admin/servers"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold transition shrink-0"
                  >
                    <span>เปิดผังตู้แร็ค 3D</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
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
