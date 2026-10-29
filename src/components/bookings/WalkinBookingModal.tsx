'use client';

import React, { useState, useEffect } from 'react';
import { Room, Division, Department } from '@/types/database';
import { createBooking } from '@/lib/services/booking-service';
import { getDivisions, getDepartments } from '@/lib/services/master-data-service';
import { useAuth } from '@/lib/auth/auth-context';
import {
  X,
  Calendar,
  Clock,
  Building,
  Layers,
  User,
  Tv,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

const EQUIPMENT_OPTIONS = [
  { id: 'projector', label: 'โปรเจคเตอร์และจอภาพ' },
  { id: 'wireless_mic', label: 'ไมโครโฟนไร้สาย' },
  { id: 'speaker', label: 'ลำโพงห้องประชุม' },
  { id: 'recording', label: 'บันทึกวิดีโอการประชุม (Cloud)' },
  { id: 'hdmi_adapter', label: 'หัวแปลงสัญญาณ HDMI / Type-C' },
];

interface WalkinBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bookingTitle: string) => void;
  rooms: Room[];
  initialRoomId?: string;
  initialDate?: string;
  initialHour?: number;
}

export default function WalkinBookingModal({
  isOpen,
  onClose,
  onSuccess,
  rooms,
  initialRoomId,
  initialDate,
  initialHour,
}: WalkinBookingModalProps) {
  const { user } = useAuth();

  const [bookerName, setBookerName] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [title, setTitle] = useState('');
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingMasterData, setLoadingMasterData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const activeRooms = rooms.filter((r) => r.is_active);
      setSelectedRoomId(initialRoomId || (activeRooms[0]?.id ?? ''));
      setBookingDate(initialDate || new Date().toISOString().split('T')[0]);

      if (initialHour !== undefined) {
        const hStart = initialHour.toString().padStart(2, '0');
        const hEnd = (initialHour + 1).toString().padStart(2, '0');
        setStartTime(`${hStart}:00`);
        setEndTime(`${hEnd}:00`);
      } else {
        const now = new Date();
        const curHour = now.getHours();
        const nextHour = (curHour + 1) % 24;
        setStartTime(`${curHour.toString().padStart(2, '0')}:00`);
        setEndTime(`${nextHour.toString().padStart(2, '0')}:00`);
      }

      setBookerName('');
      setDivisionId('');
      setDepartmentId('');
      setTitle('');
      setSelectedEquipments([]);
      setErrorMessage(null);

      // Fetch divisions and departments
      setLoadingMasterData(true);
      Promise.all([getDivisions(), getDepartments()]).then(([divs, depts]) => {
        setDivisions(divs);
        setDepartments(depts);
        setLoadingMasterData(false);
      });
    }
  }, [isOpen, initialRoomId, initialDate, initialHour, rooms]);

  if (!isOpen) return null;

  const filteredDepartments = divisionId
    ? departments.filter((d) => d.division_id === divisionId && d.is_active)
    : departments.filter((d) => d.is_active);

  const handleToggleEquipment = (label: string) => {
    setSelectedEquipments((prev) =>
      prev.includes(label) ? prev.filter((e) => e !== label) : [...prev, label]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!bookerName.trim()) {
      setErrorMessage('กรุณาระบุชื่อผู้ขอจอง / ผู้ใช้งาน');
      return;
    }

    if (!selectedRoomId) {
      setErrorMessage('กรุณาเลือกห้องประชุม');
      return;
    }

    if (!bookingDate) {
      setErrorMessage('กรุณาระบุวันที่จอง');
      return;
    }

    if (!startTime || !endTime) {
      setErrorMessage('กรุณาระบุเวลาเริ่มต้นและเวลาสิ้นสุด');
      return;
    }

    if (startTime >= endTime) {
      setErrorMessage('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('กรุณาระบุหัวข้อการประชุม / วาระการใช้งาน');
      return;
    }

    setSubmitting(true);

    const startIso = `${bookingDate}T${startTime}:00.000Z`;
    const endIso = `${bookingDate}T${endTime}:00.000Z`;

    const selectedDeptObj = departments.find((d) => d.id === departmentId);
    const selectedDivObj = divisions.find((d) => d.id === divisionId);
    const deptLabel = selectedDeptObj
      ? selectedDeptObj.name
      : selectedDivObj
      ? selectedDivObj.name
      : undefined;

    const pseudoUserId = `walkin-${Date.now().toString().slice(-6)}`;

    const res = await createBooking({
      userId: pseudoUserId,
      userName: bookerName.trim(),
      userDepartment: deptLabel,
      roomId: selectedRoomId,
      title: title.trim(),
      startTime: startIso,
      endTime: endIso,
      requiredEquipment: selectedEquipments,
      isWalkin: true,
      bookedByStaffId: user?.id,
      bookedByStaffName: user?.name,
      actor: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        : undefined,
    });

    setSubmitting(false);

    if (res.conflict) {
      setErrorMessage(
        'ช่วงเวลานี้มีผู้จองห้องประชุมนี้แล้ว (ตรวจพบเวลาทับซ้อนในระบบ กรุณาเลือกช่วงเวลาหรือห้องอื่น)'
      );
      return;
    }

    if (!res.success) {
      setErrorMessage(res.error || 'เกิดข้อผิดพลาดในการบันทึกการจอง Walk-in');
      return;
    }

    onSuccess(title.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              IT Staff Fast Booking
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              บันทึกการจอง Walk-in (ด่วนโดยไอที)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              บันทึกห้องประชุมแบบเร่งด่วนสำหรับผู้มาติดต่อหน้าเคาน์เตอร์ ยืนยันทันทีพร้อมตรวจเวลาทับซ้อน
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Booker Info */}
          <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              ข้อมูลผู้ขอใช้ห้องประชุม (Requester)
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                ชื่อ-นามสกุล ผู้ขอจอง <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น สมชาย มีสุข, กนกพร วิทยากุล"
                value={bookerName}
                onChange={(e) => setBookerName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">กองงาน / สำนัก</label>
                <select
                  value={divisionId}
                  onChange={(e) => {
                    setDivisionId(e.target.value);
                    setDepartmentId('');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- ไม่ระบุกองงาน --</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">แผนก / ฝ่าย</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- ไม่ระบุแผนก --</option>
                  {filteredDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Meeting Room & Time */}
          <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-400" />
              ห้องประชุมและเวลาที่ใช้งาน (Room & Time Slot)
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                เลือกห้องประชุม / บัญชีออนไลน์ <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {rooms
                  .filter((r) => r.is_active)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.type === 'onsite' ? '🏛️' : '💻'} {r.name} ({r.location || (r.type === 'online' ? 'Online' : 'Onsite')})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">วันที่ <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">เวลาเริ่ม <span className="text-red-400">*</span></label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">เวลาสิ้นสุด <span className="text-red-400">*</span></label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                หัวข้อ / วาระการประชุม <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น ประชุมประสานงานด่วน, รายงานความคืบหน้าระบบ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Equipment Checkboxes */}
          <div className="space-y-2 bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-indigo-400" />
              อุปกรณ์เสริมที่ต้องจัดเตรียม (Equipment Setup)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {EQUIPMENT_OPTIONS.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                    selectedEquipments.includes(item.label)
                      ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedEquipments.includes(item.label)}
                    onChange={() => handleToggleEquipment(item.label)}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
            <div className="text-[11px] text-slate-400">
              ผู้บันทึก: <strong className="text-slate-300">{user?.name || 'IT Staff'}</strong> (บันทึก Audit Log อัตโนมัติ)
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
              >
                {submitting ? 'กำลังบันทึก...' : '✓ ยืนยันการจอง Walk-in'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
