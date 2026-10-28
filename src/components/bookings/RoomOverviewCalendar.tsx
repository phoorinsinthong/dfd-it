'use client';

import React, { useState, useMemo } from 'react';
import { Room, Booking } from '@/types/database';
import { THAI_MONTH_NAMES } from '@/lib/services/roadmap-service';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Video,
  Building,
  CheckCircle2,
  Users,
  Grid3X3,
  ListFilter,
  Sparkles,
} from 'lucide-react';

interface RoomOverviewCalendarProps {
  rooms: Room[];
  bookings: Booking[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onSlotClick?: (roomId: string, hour: number, dateStr: string) => void;
  isAdmin?: boolean;
}

export default function RoomOverviewCalendar({
  rooms,
  bookings,
  selectedDate,
  onSelectDate,
  onSlotClick,
  isAdmin = false,
}: RoomOverviewCalendarProps) {
  const [viewMode, setViewMode] = useState<'month' | 'timeline'>('month');

  // Month navigation state
  const [currentYear, setCurrentYear] = useState(() => {
    return selectedDate ? new Date(selectedDate).getFullYear() : new Date().getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    return selectedDate ? new Date(selectedDate).getMonth() + 1 : new Date().getMonth() + 1;
  });

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
    onSelectDate(todayStr);
  };

  // Build calendar matrix for currentMonth & currentYear
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      bookings: Booking[];
      onsiteCount: number;
      onlineCount: number;
    } | null> = [];

    // Empty padding slots before day 1
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day
        .toString()
        .padStart(2, '0')}`;

      // Find all confirmed bookings on this day
      const dayBookings = bookings.filter((b) => {
        if (b.status === 'cancelled') return false;
        return b.start_time.startsWith(dateStr);
      });

      const onsiteCount = dayBookings.filter((b) => b.room_type === 'onsite').length;
      const onlineCount = dayBookings.filter((b) => b.room_type === 'online').length;

      days.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        bookings: dayBookings,
        onsiteCount,
        onlineCount,
      });
    }

    return days;
  }, [currentYear, currentMonth, bookings, selectedDate]);

  // Timeline matrix hours: 08:00 to 18:00
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  // Bookings specifically for the selected date
  const selectedDateBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.status === 'cancelled' ? false : b.start_time.startsWith(selectedDate)
    );
  }, [bookings, selectedDate]);

  const monthLabel = `${THAI_MONTH_NAMES[currentMonth - 1]} ${currentYear}`;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              ปฏิทินภาพรวมการจองห้องประชุม
            </h2>
            <p className="text-xs text-slate-400">
              {viewMode === 'month'
                ? `มุมมองปฏิทินรายเดือนประจำเดือน ${monthLabel}`
                : `มุมมองตารางเวลาห้องประชุมประจำวันที่ ${selectedDate || 'วันนี้'}`}
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 flex items-center">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              ปฏิทินรายเดือน
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'timeline'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              ตารางเวลา (08-18 น.)
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: MONTH GRID VIEW */}
      {viewMode === 'month' && (
        <div className="space-y-3">
          {/* Month Navigation Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm sm:text-base font-bold text-white px-2">
                {monthLabel}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              >
                วันนี้ (Today)
              </button>

              {/* Legend */}
              <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400 pl-3 border-l border-slate-800">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                  ห้องสถานที่จริง
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                  Zoom/Teams ออนไลน์
                </span>
              </div>
            </div>
          </div>

          {/* 7-Day Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((dayName, idx) => (
              <div
                key={dayName}
                className={`text-center py-2 text-xs font-bold uppercase tracking-wider ${
                  idx === 0 || idx === 6 ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {dayName}
              </div>
            ))}

            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[72px] sm:min-h-[88px] rounded-2xl bg-slate-950/30 border border-transparent opacity-30"
                  />
                );
              }

              const totalBookings = cell.bookings.length;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => onSelectDate(cell.dateStr)}
                  className={`min-h-[72px] sm:min-h-[88px] p-2 rounded-2xl border text-left transition relative flex flex-col justify-between group ${
                    cell.isSelected
                      ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10'
                      : cell.isToday
                      ? 'bg-slate-800/80 border-slate-600 hover:border-slate-500'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-lg flex items-center justify-center ${
                        cell.isToday
                          ? 'bg-blue-600 text-white font-black'
                          : cell.isSelected
                          ? 'text-blue-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {totalBookings > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-blue-300 border border-slate-700">
                        {totalBookings} งาน
                      </span>
                    )}
                  </div>

                  {/* Booking Density Dots / Chips */}
                  <div className="w-full space-y-1 mt-1">
                    {totalBookings === 0 ? (
                      <span className="text-[10px] text-slate-600 group-hover:text-slate-500 block text-center py-1">
                        ว่าง
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        {cell.bookings.slice(0, 2).map((b) => (
                          <div
                            key={b.id}
                            className={`text-[10px] truncate px-1.5 py-0.5 rounded font-medium flex items-center gap-1 ${
                              b.room_type === 'online'
                                ? 'bg-purple-950/60 text-purple-200 border border-purple-800/40'
                                : 'bg-blue-950/60 text-blue-200 border border-blue-800/40'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                b.room_type === 'online' ? 'bg-purple-400' : 'bg-blue-400'
                              }`}
                            ></span>
                            <span className="truncate">{b.title}</span>
                          </div>
                        ))}
                        {cell.bookings.length > 2 && (
                          <div className="text-[9px] text-slate-400 text-center font-semibold">
                            +{cell.bookings.length - 2} รายการเพิ่มเติม
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 text-right text-xs text-slate-400">
            * คลิกที่แต่ละวันในปฏิทินเพื่อกรองดูรายการหรือจองห้องในวันนั้นทันที
          </div>
        </div>
      )}

      {/* VIEW 2: ROOM TIMELINE MATRIX VIEW */}
      {viewMode === 'timeline' && (
        <div className="space-y-4">
          {/* Date Selector Header for Timeline */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>เลือกวันสำหรับตารางเวลา:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="text-xs text-slate-400">
              จองแล้ว: <strong className="text-white">{selectedDateBookings.length}</strong> ช่วงเวลา |
              ห้องว่างพร้อมใช้งาน: <strong className="text-emerald-400">{rooms.length}</strong> ห้อง
            </div>
          </div>

          {/* Timeline Matrix Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-2xl">
            <table className="w-full text-xs text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-3 w-56 sticky left-0 bg-slate-950 z-10 border-r border-slate-800 font-bold">
                    ห้องประชุม / บัญชีออนไลน์
                  </th>
                  {hours.map((h) => (
                    <th
                      key={h}
                      className="py-3 px-2 text-center font-mono border-r border-slate-800/60 text-slate-300 w-16"
                    >
                      {h.toString().padStart(2, '0')}:00
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {rooms.map((room) => {
                  const roomBookings = selectedDateBookings.filter(
                    (b) => b.room_id === room.id && b.status === 'confirmed'
                  );

                  return (
                    <tr key={room.id} className="hover:bg-slate-800/20 transition">
                      {/* Room Label Column (Sticky Left) */}
                      <td className="py-3 px-3 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                        <div className="font-bold text-white text-xs truncate max-w-[200px]" title={room.name}>
                          {room.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              room.type === 'online'
                                ? 'bg-purple-950/80 text-purple-300 border border-purple-800/50'
                                : 'bg-blue-950/80 text-blue-300 border border-blue-800/50'
                            }`}
                          >
                            {room.type === 'online' ? 'Online' : 'Onsite'}
                          </span>
                          <span>👥 {room.capacity || 10} ที่</span>
                          {room.location && (
                            <span className="truncate max-w-[100px] text-slate-500">
                              • {room.location}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Hourly Matrix Slots */}
                      {hours.map((hour) => {
                        // Check if this hour is covered by any booking
                        // An hour slot [hour:00, hour+1:00) overlaps with [start, end)
                        const slotStart = new Date(`${selectedDate}T${hour.toString().padStart(2, '0')}:00:00`).getTime();
                        const slotEnd = new Date(`${selectedDate}T${(hour + 1).toString().padStart(2, '0')}:00:00`).getTime();

                        const matchedBooking = roomBookings.find((b) => {
                          const bStart = new Date(b.start_time).getTime();
                          const bEnd = new Date(b.end_time).getTime();
                          return slotStart < bEnd && slotEnd > bStart;
                        });

                        if (matchedBooking) {
                          const isStartOfBooking = new Date(matchedBooking.start_time).getHours() === hour;

                          return (
                            <td
                              key={hour}
                              className={`p-1 border-r border-slate-800/60 text-center ${
                                room.type === 'online'
                                  ? 'bg-purple-950/50 text-purple-200'
                                  : 'bg-blue-950/50 text-blue-200'
                              }`}
                              title={`${matchedBooking.title} (ผู้จอง: ${matchedBooking.user_name || '-'})`}
                            >
                              <div
                                className={`h-11 rounded-lg px-1.5 py-1 text-[10px] font-semibold flex flex-col justify-center truncate ${
                                  room.type === 'online'
                                    ? 'bg-purple-900/60 border border-purple-600/50 text-purple-100'
                                    : 'bg-blue-900/60 border border-blue-600/50 text-blue-100'
                                }`}
                              >
                                {isStartOfBooking ? (
                                  <>
                                    <span className="truncate font-bold">{matchedBooking.title}</span>
                                    <span className="text-[9px] text-slate-300 truncate">
                                      {matchedBooking.user_name}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[9px] opacity-70">ติดจอง</span>
                                )}
                              </div>
                            </td>
                          );
                        }

                        // Free / Open Slot
                        return (
                          <td
                            key={hour}
                            onClick={() => onSlotClick?.(room.id, hour, selectedDate)}
                            className="p-1 border-r border-slate-800/60 text-center hover:bg-emerald-950/30 cursor-pointer transition group"
                            title={`คลิกเพื่อเลือกจองช่วง ${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`}
                          >
                            <div className="h-11 rounded-lg border border-dashed border-slate-800 group-hover:border-emerald-500/50 group-hover:bg-emerald-900/20 flex items-center justify-center text-[10px] text-slate-600 group-hover:text-emerald-400 font-medium">
                              ว่าง
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
