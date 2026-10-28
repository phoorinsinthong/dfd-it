'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth/auth-context';
import {
  getRooms,
  getAllBookings,
  cancelBooking,
} from '@/lib/services/booking-service';
import { Room, Booking } from '@/types/database';
import RoomOverviewCalendar from '@/components/bookings/RoomOverviewCalendar';
import RoomManagementModal from '@/components/bookings/RoomManagementModal';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Tv,
  Mic,
  ShieldAlert,
  Search,
  Filter,
  Building,
  Settings,
  Grid3X3,
  ListOrdered,
} from 'lucide-react';

export default function AdminBookingsPage() {
  const { user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allRoomsIncludingInactive, setAllRoomsIncludingInactive] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab view: Overview Calendar vs Detailed List
  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');

  // Room Management Modal State
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

  // Filters
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [allBookings, activeRooms, allRooms] = await Promise.all([
      getAllBookings(),
      getRooms(),
      getRooms({ includeInactive: true }),
    ]);

    setBookings(allBookings);
    setRooms(activeRooms);
    setAllRoomsIncludingInactive(allRooms);
    setLoading(false);
  };

  useEffect(() => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
    loadData();
  }, []);

  const handleCancelBooking = async (bookingId: string) => {
    if (!user) return;
    if (confirm('ยืนยันการยกเลิกการจองห้องนี้?')) {
      const res = await cancelBooking(bookingId, user.id);
      if (res.success) {
        loadData();
      }
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar activeSection="bookings" />
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

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    if (selectedDate) {
      const bDate = b.start_time.split('T')[0];
      if (bDate !== selectedDate) return false;
    }
    if (selectedRoomId && b.room_id !== selectedRoomId) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchUser = (b.user_name || '').toLowerCase().includes(q);
      const matchRoom = (b.room_name || '').toLowerCase().includes(q);
      if (!matchTitle && !matchUser && !matchRoom) return false;
    }
    return true;
  });

  // Calculate equipment setup checklist for today
  const equipmentSetups = filteredBookings
    .filter((b) => b.status === 'confirmed' && b.required_equipment?.length > 0)
    .map((b) => ({
      roomName: b.room_name,
      time: `${new Date(b.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${new Date(b.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
      user: b.user_name,
      equipment: b.required_equipment,
    }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar activeSection="bookings" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header with Title and Manage Rooms Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Calendar className="w-7 h-7 text-blue-500" />
              ตารางการจองห้องประชุมและบัญชีออนไลน์ (IT Management)
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              ตรวจสอบภาพรวมการจอง จัดเตรียมอุปกรณ์ และบริหารจัดการห้องประชุม Onsite / Online Pool
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRoomModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-lg shadow-blue-600/30 self-start sm:self-auto"
            >
              <Building className="w-4 h-4" />
              🏛️ จัดการห้องประชุม & บัญชีออนไลน์
            </button>
          </div>
        </div>

        {/* View Mode Tabs: Overview Calendar vs Detailed List */}
        <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                activeTab === 'calendar'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              ปฏิทินและตารางเวลาภาพรวม (Overview Calendar)
            </button>

            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                activeTab === 'list'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              รายการจองและอุปกรณ์ ({filteredBookings.length})
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 pr-3">
            <span>ห้องทั้งหมด: <strong className="text-white">{rooms.length}</strong> ห้อง</span>
            <span>•</span>
            <span>การจองทั้งหมด: <strong className="text-blue-400">{bookings.filter(b => b.status === 'confirmed').length}</strong> ครั้ง</span>
          </div>
        </div>

        {/* TAB 1: OVERVIEW CALENDAR (Month Grid & Timeline Matrix) */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <RoomOverviewCalendar
              rooms={rooms}
              bookings={bookings}
              selectedDate={selectedDate}
              onSelectDate={(newDate) => {
                setSelectedDate(newDate);
              }}
              isAdmin={true}
            />
          </div>
        )}

        {/* Equipment Setup Alert Banner (Visible when there are setups on selected date) */}
        {equipmentSetups.length > 0 && (
          <div className="bg-blue-950/30 border border-blue-800/60 p-4 sm:p-5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
              <Tv className="w-4 h-4" />
              รายการอุปกรณ์ที่ไอทีต้องจัดเตรียมในวันที่ {selectedDate} ({equipmentSetups.length} ห้อง):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {equipmentSetups.map((setup, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-slate-700/60 p-3 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-white">{setup.roomName}</div>
                  <div className="text-slate-400 font-mono">⏰ {setup.time} (ผู้จอง: {setup.user})</div>
                  <div className="pt-1 flex flex-wrap gap-1">
                    {setup.equipment.map((eq, eIdx) => (
                      <span key={eIdx} className="bg-blue-900/40 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded text-[10px]">
                        ✓ {eq}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: DETAILED LIST VIEW */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">เลือกวันที่:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อการประชุม หรือผู้จอง..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">ทุกห้องประชุม / บัญชี</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Bookings Table / List */}
            {loading ? (
              <div className="p-12 text-center text-slate-400">กำลังโหลดข้อมูลการจอง...</div>
            ) : filteredBookings.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">ไม่มีการจองในวันที่เลือก ({selectedDate})</h3>
                <p className="text-xs text-slate-500 mt-1">ห้องประชุมทุกห้องพร้อมใช้งาน</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((b) => {
                  const sTime = new Date(b.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                  const eTime = new Date(b.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={b.id}
                      className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                            {sTime} - {eTime}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                              b.status === 'confirmed'
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {b.status === 'confirmed' ? 'ยืนยัน' : 'ยกเลิก'}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white">{b.title}</h3>

                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-4">
                          <span>🏛️ {b.room_name}</span>
                          <span>👤 ผู้จอง: {b.user_name} ({b.user_department || '-'})</span>
                        </div>

                        {b.required_equipment?.length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1">
                            {b.required_equipment.map((eq, idx) => (
                              <span key={idx} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] border border-slate-700">
                                ⚙️ {eq}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {b.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-red-900/40 hover:text-red-300 text-slate-400 text-xs font-medium transition self-start md:self-auto"
                        >
                          ยกเลิกการจอง
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Room Management Modal */}
      <RoomManagementModal
        isOpen={isRoomModalOpen}
        rooms={allRoomsIncludingInactive}
        onClose={() => setIsRoomModalOpen(false)}
        onRefresh={() => loadData()}
      />
    </div>
  );
}
