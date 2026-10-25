'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import Navbar from '@/components/layout/Navbar';
import { 
  Wrench, 
  Calendar, 
  Clock, 
  PlusCircle, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  XCircle,
  Tag,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { Ticket } from '@/types/database';
import { getUserTickets, cancelTicket } from '@/lib/services/ticket-service';

export default function UserPortalPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    if (user?.id) {
      const list = await getUserTickets(user.id);
      setTickets(list);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    } else if (user) {
      loadTickets();
    }
  }, [user, isLoading, router, loadTickets]);

  const handleCancelTicket = async (ticketId: string) => {
    if (!user) return;
    const confirmCancel = window.confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกใบแจ้งซ่อมนี้?');
    if (!confirmCancel) return;

    setCancellingId(ticketId);
    try {
      const res = await cancelTicket(ticketId, user.id);
      if (res.success) {
        setActionMessage('ยกเลิกใบแจ้งซ่อมเรียบร้อยแล้ว');
        loadTickets();
      } else {
        alert(res.error || 'ไม่สามารถยกเลิกงานได้');
      }
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            รอรับเรื่อง (Pending)
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            กำลังดำเนินการ (In Progress)
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Check className="w-3 h-3 text-emerald-400" />
            เสร็จสิ้น (Resolved)
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3 h-3" />
            ยกเลิกแล้ว (Cancelled)
          </span>
        );
      default:
        return null;
    }
  };

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

        {actionMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{actionMessage}</span>
            </span>
            <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

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

        {/* User Active Tickets List */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>รายการแจ้งซ่อมของคุณ ({tickets.length})</span>
            </h3>
            
            <Link
              href="/portal/tickets/new"
              className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>แจ้งเรื่องเพิ่ม</span>
            </Link>
          </div>

          {tickets.length === 0 ? (
            <div className="text-center py-10 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm font-medium">ยังไม่มีรายการแจ้งซ่อมที่รอดำเนินการ</p>
              <p className="text-slate-500 text-xs mt-1">หากพบปัญหาการใช้งานอุปกรณ์ กดปุ่ม &quot;สร้างใบแจ้งซ่อมใหม่&quot; ด้านบนได้ทันที</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-slate-700"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">{t.id}</span>
                      {getStatusBadge(t.status)}
                      {t.category_name && (
                        <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>{t.category_name}</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-semibold text-white">
                      {t.title}
                    </h4>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      {t.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.location}</span>
                      </span>
                      <span>•</span>
                      <span>แจ้งเมื่อ: {new Date(t.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      {t.assigned_to_name && (
                        <>
                          <span>•</span>
                          <span className="text-blue-400">ช่างผู้ดูแล: {t.assigned_to_name}</span>
                        </>
                      )}
                    </div>

                    {t.solution_note && (
                      <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                        <strong>บันทึกการแก้ไข:</strong> {t.solution_note}
                      </div>
                    )}
                  </div>

                  {/* Actions & Thumbnail */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {t.image_url && (
                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.image_url} alt="Attachment" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {t.status === 'pending' && (
                      <button
                        type="button"
                        disabled={cancellingId === t.id}
                        onClick={() => handleCancelTicket(t.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition disabled:opacity-50"
                      >
                        {cancellingId === t.id ? 'กำลังยกเลิก...' : 'ยกเลิกคำขอ'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
