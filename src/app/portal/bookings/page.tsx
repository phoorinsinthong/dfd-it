'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth/auth-context';
import {
  getRooms,
  createBooking,
  getUserBookings,
  getBookingsByDateRange,
  cancelBooking,
} from '@/lib/services/booking-service';
import { Room, Booking, RoomType } from '@/types/database';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Plus,
  X,
  Tv,
  Mic,
  MonitorCheck,
  CalendarDays,
} from 'lucide-react';

const EQUIPMENT_OPTIONS = [
  { id: 'projector', label: 'โปรเจคเตอร์และจอภาพ' },
  { id: 'wireless_mic', label: 'ไมโครโฟนไร้สาย' },
  { id: 'speaker', label: 'ลำโพงห้องประชุม' },
  { id: 'recording', label: 'บันทึกวิดีโอการประชุม (Cloud)' },
  { id: 'hdmi_adapter', label: 'หัวแปลงสัญญาณ HDMI / Type-C' },
];

export default function PortalBookingsPage() {
  const { user } = useAuth();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState<'all' | RoomType>('all');
  
  // Date selection
  const [selectedDate, setSelectedDate] = useState('');
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);

  // Booking Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success Confirmation modal with online credentials
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadData = async () => {
    const fetchedRooms = await getRooms();
    setRooms(fetchedRooms);
    if (fetchedRooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(fetchedRooms[0].id);
    }

    if (user) {
      const userList = await getUserBookings(user.id);
      setMyBookings(userList);
    }

    if (selectedDate) {
      // Load bookings for selected date
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;
      const bookings = await getBookingsByDateRange(startOfDay, endOfDay);
      setDayBookings(bookings);
    }
  };

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadData();
    }
  }, [selectedDate, user]);

  const handleToggleEquipment = (label: string) => {
    setSelectedEquipments((prev) =>
      prev.includes(label) ? prev.filter((e) => e !== label) : [...prev, label]
    );
  };

  const handleOpenBookingModal = (roomId?: string) => {
    if (roomId) setSelectedRoomId(roomId);
    setErrorMessage(null);
    setTitle('');
    setSelectedEquipments([]);
    setIsModalOpen(true);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setErrorMessage(null);
    setSubmitting(true);

    const startIso = new Date(`${selectedDate}T${startTime}:00`).toISOString();
    const endIso = new Date(`${selectedDate}T${endTime}:00`).toISOString();

    const res = await createBooking({
      userId: user.id,
      userName: user.name,
      userDepartment: user.department_id,
      roomId: selectedRoomId,
      title: title.trim() || 'การประชุม',
      startTime: startIso,
      endTime: endIso,
      requiredEquipment: selectedEquipments,
    });

    setSubmitting(false);

    if (res.success && res.data) {
      setIsModalOpen(false);
      setSuccessBooking(res.data);
      loadData();
    } else {
      setErrorMessage(
        res.conflict
          ? '⚠️ ช่วงเวลานี้มีผู้จองห้องประชุมนี้แล้ว กรุณาเลือกช่วงเวลาอื่น (PostgreSQL Exclusion Lock: 409 Conflict)'
          : res.error || 'เกิดข้อผิดพลาดในการจองห้องประชุม'
      );
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!user) return;
    if (confirm('คุณต้องการยกเลิกการจองห้องประชุมนี้ใช่หรือไม่?')) {
      const res = await cancelBooking(bookingId, user.id);
      if (res.success) {
        loadData();
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredRooms = rooms.filter((r) => {
    if (roomTypeFilter === 'all') return true;
    return r.type === roomTypeFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar activeSection="bookings" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <CalendarDays className="w-7 h-7 text-blue-500" />
              จองห้องประชุมและบัญชีออนไลน์
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              จองห้องประชุมกายภาพ หรือบัญชี Zoom / Teams ประจำบริษัท พร้อมลิงก์ทันทีและระบบป้องกันการจองชนกัน 100%
            </p>
          </div>

          <button
            onClick={() => handleOpenBookingModal()}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            จองห้องประชุมใหม่
          </button>
        </div>

        {/* Date Selector & Room Filter Controls */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-400 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-slate-300">เลือกวันที่ตรวจสอบ:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">ประเภทห้อง:</span>
            <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700">
              <button
                onClick={() => setRoomTypeFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  roomTypeFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setRoomTypeFilter('onsite')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  roomTypeFilter === 'onsite' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                ห้องกายภาพ (Onsite)
              </button>
              <button
                onClick={() => setRoomTypeFilter('online')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  roomTypeFilter === 'online' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                บัญชีออนไลน์ (Zoom/Teams)
              </button>
            </div>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const roomBookingsToday = dayBookings.filter((b) => b.room_id === room.id);

            return (
              <div
                key={room.id}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        room.type === 'online'
                          ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50'
                          : 'bg-blue-950/60 text-blue-300 border border-blue-800/50'
                      }`}
                    >
                      {room.type === 'online' ? 'Online Account Pool' : 'Physical Room'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {room.capacity} ที่นั่ง
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1.5">{room.name}</h3>

                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-3">
                    {room.type === 'online' ? (
                      <>
                        <Video className="w-3.5 h-3.5 text-purple-400" />
                        <span>ลิงก์ถาวร + Passcode พร้อมใช้ทันที</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{room.location}</span>
                      </>
                    )}
                  </div>

                  {/* Schedule for today */}
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                      คิวการใช้งานวันที่ {selectedDate}:
                    </span>
                    {roomBookingsToday.length === 0 ? (
                      <span className="text-xs text-emerald-400 font-medium block bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-800/30">
                        🟢 ว่างตลอดทั้งวัน พร้อมจอง
                      </span>
                    ) : (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {roomBookingsToday.map((b) => {
                          const sTime = new Date(b.start_time).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                          const eTime = new Date(b.end_time).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <div
                              key={b.id}
                              className="bg-slate-800/80 px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between border border-slate-700/60"
                            >
                              <span className="font-mono text-slate-300">
                                {sTime} - {eTime}
                              </span>
                              <span className="text-slate-400 truncate max-w-[120px]" title={b.title}>
                                {b.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => handleOpenBookingModal(room.id)}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    จองห้องนี้
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* My Bookings Section */}
        {myBookings.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              การจองของฉัน (My Active Bookings)
            </h2>

            <div className="divide-y divide-slate-800">
              {myBookings.map((b) => {
                const sDate = new Date(b.start_time).toLocaleDateString('th-TH');
                const sTime = new Date(b.start_time).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const eTime = new Date(b.end_time).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={b.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm sm:text-base">{b.title}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            b.status === 'confirmed'
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {b.status === 'confirmed' ? 'ยืนยันแล้ว' : 'ยกเลิกแล้ว'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-x-3">
                        <span>🏛️ {b.room_name}</span>
                        <span>📅 {sDate} ({sTime} - {eTime})</span>
                      </div>

                      {/* Online Meeting credentials snippet */}
                      {b.room_static_url && b.status === 'confirmed' && (
                        <div className="mt-2 inline-flex items-center gap-2 bg-purple-950/30 border border-purple-800/40 px-3 py-1.5 rounded-xl text-xs text-purple-300">
                          <Video className="w-3.5 h-3.5" />
                          <span>Link: {b.room_static_url}</span>
                          {b.room_passcode && <span className="text-purple-400 font-mono">(Pass: {b.room_passcode})</span>}
                          <button
                            onClick={() => copyToClipboard(`${b.room_static_url} (Passcode: ${b.room_passcode || '-'})`)}
                            className="ml-2 hover:text-white"
                            title="คัดลอกลิงก์"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-900/40 hover:text-red-300 text-slate-400 text-xs font-medium transition self-start sm:self-auto"
                      >
                        ยกเลิกการจอง
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Booking Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-500" />
                แบบฟอร์มจองห้องประชุม
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  หัวข้อการประชุม / Agenda <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ประชุมสรุปงานประจำเดือน, สัมภาษณ์งานออนไลน์..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  เลือกห้องประชุม / บัญชีออนไลน์ <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.type === 'online' ? 'Online' : `${r.capacity} ที่นั่ง`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    เวลาเริ่ม <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    เวลาสิ้นสุด <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Equipment Checklist */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  อุปกรณ์ไอทีที่ต้องการให้จัดเตรียม:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EQUIPMENT_OPTIONS.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 cursor-pointer hover:bg-slate-800 transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEquipments.includes(item.label)}
                        onChange={() => handleToggleEquipment(item.label)}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-700"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5"
                >
                  {submitting ? 'กำลังบันทึก...' : 'ยืนยันการจอง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Success & Credentials Modal */}
      {successBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-white">จองห้องประชุมสำเร็จ!</h3>
            <p className="text-xs text-slate-400">
              บันทึกการจองสำหรับหัวข้อ <span className="text-white font-medium">"{successBooking.title}"</span> เรียบร้อยแล้ว
            </p>

            {/* If Online Video Account: show link & passcode */}
            {successBooking.room_static_url && (
              <div className="bg-purple-950/40 border border-purple-800/60 p-4 rounded-2xl text-left space-y-2 mt-4">
                <span className="text-[11px] font-bold text-purple-300 block uppercase">
                  ข้อมูลการประชุมออนไลน์ (Instant Video Credentials)
                </span>
                <div className="text-xs text-slate-300 break-all font-mono">
                  {successBooking.room_static_url}
                </div>
                {successBooking.room_passcode && (
                  <div className="text-xs text-purple-200">
                    Passcode: <span className="font-bold font-mono">{successBooking.room_passcode}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `${successBooking.room_static_url} (Passcode: ${successBooking.room_passcode || '-'})`
                    )
                  }
                  className="w-full mt-2 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedLink ? 'คัดลอกข้อมูลแล้ว!' : 'คัดลอกลิงก์การประชุม'}
                </button>
              </div>
            )}

            <button
              onClick={() => setSuccessBooking(null)}
              className="w-full mt-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
