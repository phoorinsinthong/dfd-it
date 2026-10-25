'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth/auth-context';
import {
  filterTickets,
  acceptTicket,
  resolveTicket,
  updateTicketStatus,
} from '@/lib/services/ticket-service';
import { getDepartments, getCategories } from '@/lib/services/master-data-service';
import { Ticket, TicketStatus, TicketUrgency, Department, Category } from '@/types/database';
import { getUrgencyBadgeInfo } from '@/lib/services/line-notification-service';
import {
  Wrench,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  User,
  Building,
  Image as ImageIcon,
  Check,
  X,
  FileText,
  ShieldAlert,
} from 'lucide-react';

function AdminTicketsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [deptFilter, setDeptFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState(highlightId || '');

  // Modal states
  const [selectedTicketForResolution, setSelectedTicketForResolution] = useState<Ticket | null>(null);
  const [solutionNote, setSolutionNote] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [fetchedTickets, depts, cats] = await Promise.all([
      filterTickets({
        status: statusFilter,
        departmentId: deptFilter || undefined,
        searchQuery: searchQuery || undefined,
      }),
      getDepartments(),
      getCategories(),
    ]);

    let filtered = fetchedTickets;
    if (urgencyFilter) {
      filtered = filtered.filter((t) => t.urgency === urgencyFilter);
    }

    setTickets(filtered);
    setDepartments(depts);
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, deptFilter, urgencyFilter, searchQuery]);

  // Handle Accept Ticket
  const handleAccept = async (ticket: Ticket) => {
    if (!user) return;
    const res = await acceptTicket({
      ticketId: ticket.id,
      staffId: user.id,
      staffName: user.name,
    });

    if (res.success) {
      loadData();
    }
  };

  // Handle Resolve Ticket submit
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketForResolution || !solutionNote.trim()) return;

    setSubmittingResolution(true);
    const res = await resolveTicket({
      ticketId: selectedTicketForResolution.id,
      solutionNote: solutionNote.trim(),
      rootCause: rootCause.trim() || undefined,
    });

    setSubmittingResolution(false);
    if (res.success) {
      setSelectedTicketForResolution(null);
      setSolutionNote('');
      setRootCause('');
      loadData();
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar activeSection="tickets" />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 p-8 rounded-2xl max-w-md text-center">
            <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">ไม่มีสิทธิ์เข้าถึง (Access Denied)</h2>
            <p className="text-sm text-slate-400 mb-6">หน้านี้สำหรับเจ้าหน้าที่ฝ่ายไอที (IT Staff) เท่านั้น</p>
          </div>
        </div>
      </div>
    );
  }

  // Stat counts
  const totalCount = tickets.length;
  const pendingCount = tickets.filter((t) => t.status === 'pending').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar activeSection="tickets" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Wrench className="w-7 h-7 text-blue-500" />
              ศูนย์รับเรื่องแจ้งซ่อม (Helpdesk Inbox)
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              จัดการคำขอแจ้งซ่อม ติดตามสถานะ และบันทึกผลการดำเนินงานแบบเรียลไทม์
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 font-medium">งานทั้งหมดในตัวกรอง</span>
            <div className="text-2xl font-bold text-white mt-1">{totalCount}</div>
          </div>
          <div className="bg-amber-950/20 border border-amber-800/40 p-4 rounded-xl">
            <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> รอดำเนินการ
            </span>
            <div className="text-2xl font-bold text-amber-300 mt-1">{pendingCount}</div>
          </div>
          <div className="bg-blue-950/20 border border-blue-800/40 p-4 rounded-xl">
            <span className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> กำลังดำเนินการ
            </span>
            <div className="text-2xl font-bold text-blue-300 mt-1">{inProgressCount}</div>
          </div>
          <div className="bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-xl">
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> แก้ไขเสร็จสิ้น
            </span>
            <div className="text-2xl font-bold text-emerald-300 mt-1">{resolvedCount}</div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl backdrop-blur space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาตามรหัสงาน (TK-...), ชื่องาน, ผู้แจ้ง, หรือสถานที่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Department Dropdown */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ทุกแผนก (All Departments)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Urgency Dropdown */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ทุกระดับความเร่งด่วน</option>
              <option value="urgent">🚨 ด่วนที่สุด (Urgent)</option>
              <option value="high">⚠️ ด่วนสูง (High)</option>
              <option value="medium">📌 ปานกลาง (Medium)</option>
              <option value="low">🟢 ปกติ (Low)</option>
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800">
            {(
              [
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'pending', label: 'รอดำเนินการ' },
                { id: 'in_progress', label: 'กำลังดำเนินการ' },
                { id: 'resolved', label: 'แก้ไขแล้ว' },
                { id: 'cancelled', label: 'ยกเลิก' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">กำลังโหลดรายการแจ้งซ่อม...</div>
        ) : tickets.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">ไม่พบรายการแจ้งซ่อม</h3>
            <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนเงื่อนไขตัวกรองหรือคำค้นหา</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const urgencyInfo = getUrgencyBadgeInfo(ticket.urgency);
              const isHighlighted = highlightId === ticket.id;

              return (
                <div
                  key={ticket.id}
                  id={ticket.id}
                  className={`bg-slate-900/70 border rounded-2xl p-5 transition ${
                    isHighlighted
                      ? 'border-blue-500 shadow-lg shadow-blue-500/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar: ID, Date, Urgency, Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-800/40">
                        #{ticket.id}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(ticket.created_at).toLocaleString('th-TH', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Urgency Badge */}
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: urgencyInfo.bg, color: urgencyInfo.color }}
                      >
                        {urgencyInfo.text}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                          ticket.status === 'pending'
                            ? 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                            : ticket.status === 'in_progress'
                            ? 'bg-blue-950/40 text-blue-300 border-blue-800/50'
                            : ticket.status === 'resolved'
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {ticket.status === 'pending' && 'รอดำเนินการ'}
                        {ticket.status === 'in_progress' && 'กำลังดำเนินการ'}
                        {ticket.status === 'resolved' && 'แก้ไขเสร็จสิ้น'}
                        {ticket.status === 'cancelled' && 'ยกเลิกแล้ว'}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mb-4">
                    <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                      {ticket.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed whitespace-pre-wrap">
                      {ticket.description}
                    </p>
                  </div>

                  {/* Metadata Row: Requester, Dept, Location, Attachment */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{ticket.user_name || 'ผู้ใช้งาน'} ({ticket.user_employee_id || '-'})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span>{ticket.department_name || 'ไม่ระบุแผนก'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{ticket.location}</span>
                    </div>
                  </div>

                  {/* Image Attachment Preview */}
                  {ticket.image_url && (
                    <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(ticket.image_url!)}
                        className="group relative w-16 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shrink-0 hover:scale-105 transition"
                      >
                        <img
                          src={ticket.image_url}
                          alt="แนบรูปถ่าย"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <ImageIcon className="w-5 h-5 text-white" />
                        </div>
                      </button>
                      <div className="text-xs">
                        <span className="text-slate-300 font-medium block">มีรูปภาพแนบ (WebP Client-Compressed)</span>
                        <span className="text-[11px] text-slate-500">คลิกที่รูปเพื่อดูภาพขนาดเต็ม</span>
                      </div>
                    </div>
                  )}

                  {/* Technician & Resolution Info */}
                  {ticket.assigned_to_name && (
                    <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="text-slate-400">
                        เจ้าหน้าที่ผู้รับผิดชอบ:{' '}
                        <span className="text-blue-400 font-medium">{ticket.assigned_to_name}</span>
                      </div>
                      {ticket.resolved_at && (
                        <div className="text-slate-500 text-[11px]">
                          ปิดงานเมื่อ:{' '}
                          {new Date(ticket.resolved_at).toLocaleString('th-TH', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {ticket.solution_note && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs space-y-1">
                      <div className="text-emerald-300 font-medium flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> บันทึกการแก้ไข: {ticket.solution_note}
                      </div>
                      {ticket.root_cause && (
                        <div className="text-slate-400 text-[11px]">
                          สาเหตุ: {ticket.root_cause}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons for IT Staff */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end gap-2">
                    {ticket.status === 'pending' && (
                      <button
                        onClick={() => handleAccept(ticket)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        รับงาน (Accept Ticket)
                      </button>
                    )}

                    {ticket.status === 'in_progress' && (
                      <button
                        onClick={() => {
                          setSelectedTicketForResolution(ticket);
                          setSolutionNote('');
                          setRootCause('');
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ปิดงาน / บันทึกผลการแก้ไข (Resolve)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Resolution Modal */}
      {selectedTicketForResolution && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                บันทึกการแก้ไขและปิดงาน #{selectedTicketForResolution.id}
              </h3>
              <button
                onClick={() => setSelectedTicketForResolution(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  สาเหตุของปัญหา (Root Cause)
                </label>
                <input
                  type="text"
                  placeholder="เช่น สาย LAN ชำรุด, ฝุ่นเกาะพัดลมระบายความร้อน, สิทธิ์ User ถูกล็อค"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  วิธีแก้ไขและรายละเอียดการดำเนินงาน <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="ระบุวิธีแก้ไข อุปกรณ์ที่เปลี่ยน หรือคำแนะนำแก่ผู้ใช้งาน..."
                  value={solutionNote}
                  onChange={(e) => setSolutionNote(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedTicketForResolution(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submittingResolution || !solutionNote.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  {submittingResolution ? 'กำลังบันทึก...' : 'ยืนยันปิดงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden border border-slate-700">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="ภาพขยาย"
              className="max-h-[85vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminTicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center p-8">
          <div className="animate-pulse">กำลังโหลดข้อมูลรายการแจ้งซ่อม...</div>
        </div>
      }
    >
      <AdminTicketsContent />
    </Suspense>
  );
}
