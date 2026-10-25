'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import Navbar from '@/components/layout/Navbar';
import { Wrench, Calendar, Clock, PlusCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function UserPortalPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/20 rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden shadow-xl">
          <div className="relative z-10">
            <span className="text-xs uppercase tracking-wider font-semibold text-blue-400 bg-blue-950/60 px-3 py-1 rounded-full border border-blue-500/30 inline-block mb-3">
              Employee Self-Service Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              ยินดีต้อนรับ, {user.name}
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              ระบบศูนย์กลางฝ่ายสนับสนุนเทคนิค แจ้งปัญหาการใช้งาน จองห้องประชุม และติดตามสถานะงานของคุณได้ทันทีตลอด 24 ชั่วโมง
            </p>
          </div>
        </div>

        {/* Quick Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
          
          {/* Action 1: แจ้งซ่อม */}
          <Link
            href="/portal/tickets/new"
            className="group bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Wrench className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition flex items-center justify-between">
                <span>แจ้งซ่อม / ปัญหาเทคนิค</span>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                แจ้งปัญหาคอมพิวเตอร์ อุปกรณ์ต่อพ่วง ปริ้นเตอร์ หรือระบบเครือข่าย พร้อมแนบรูปถ่ายประกอบ
              </p>
            </div>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-blue-400">
              <PlusCircle className="w-4 h-4" />
              <span>สร้างใบแจ้งซ่อมใหม่</span>
            </div>
          </Link>

          {/* Action 2: จองห้องประชุม */}
          <Link
            href="/portal/bookings"
            className="group bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Calendar className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-1 group-hover:text-emerald-400 transition flex items-center justify-between">
                <span>จองห้องประชุม & บัญชีออนไลน์</span>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                ตรวจสอบปฏิทินเวลาว่าง จองห้องประชุมในบริษัท หรือขอใช้บัญชี Zoom/Teams กลางพร้อมรับลิงก์ทันที
              </p>
            </div>
            <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <Calendar className="w-4 h-4" />
              <span>เปิดดูปฏิทินและจองห้อง</span>
            </div>
          </Link>

        </div>

        {/* Active Tickets List Section */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>รายการแจ้งซ่อมล่าสุดของคุณ</span>
            </h3>
          </div>

          <div className="text-center py-10 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm font-medium">ยังไม่มีรายการแจ้งซ่อมที่รอดำเนินการ</p>
            <p className="text-slate-500 text-xs mt-1">หากพบปัญหาการใช้งานอุปกรณ์ กดปุ่ม &quot;สร้างใบแจ้งซ่อมใหม่&quot; ด้านบนได้ทันที</p>
          </div>
        </div>

      </main>
    </div>
  );
}
