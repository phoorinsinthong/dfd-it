'use client';

import React, { useState } from 'react';
import { Room, RoomType } from '@/types/database';
import {
  createRoom,
  updateRoom,
  deleteRoom,
  toggleRoomActive,
  CreateRoomInput,
  UpdateRoomInput,
} from '@/lib/services/booking-service';
import {
  X,
  Plus,
  Building,
  Video,
  Edit2,
  Trash2,
  Power,
  Check,
  AlertCircle,
  ExternalLink,
  Users,
  ShieldAlert,
} from 'lucide-react';

interface RoomManagementModalProps {
  rooms: Room[];
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function RoomManagementModal({
  rooms,
  isOpen,
  onClose,
  onRefresh,
}: RoomManagementModalProps) {
  const [filterType, setFilterType] = useState<'all' | RoomType>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Form states for Add / Edit
  const [formData, setFormData] = useState<{
    name: string;
    type: RoomType;
    capacity: number;
    location: string;
    staticUrl: string;
    passcode: string;
  }>({
    name: '',
    type: 'onsite',
    capacity: 10,
    location: '',
    staticUrl: '',
    passcode: '',
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleOpenAdd = (defaultType: RoomType = 'onsite') => {
    setEditingRoom(null);
    setFormData({
      name: '',
      type: defaultType,
      capacity: defaultType === 'online' ? 250 : 10,
      location: defaultType === 'online' ? 'Online Cloud Video' : '',
      staticUrl: '',
      passcode: '',
    });
    setErrorMessage(null);
    setIsAdding(true);
  };

  const handleOpenEdit = (room: Room) => {
    setIsAdding(false);
    setEditingRoom(room);
    setFormData({
      name: room.name,
      type: room.type,
      capacity: room.capacity || 10,
      location: room.location || '',
      staticUrl: room.static_url || '',
      passcode: room.passcode || '',
    });
    setErrorMessage(null);
  };

  const handleToggleActive = async (roomId: string, currentActive: boolean) => {
    await toggleRoomActive(roomId, !currentActive);
    onRefresh();
  };

  const handleDelete = async (room: Room) => {
    const confirmMsg = `ยืนยันการลบหรือระงับการใช้งานห้อง "${room.name}"?`;
    if (!confirm(confirmMsg)) return;

    const res = await deleteRoom(room.id);
    if (res.success) {
      if (res.softDeleted) {
        setSuccessNotice(res.message || 'ปิดการใช้งานห้องเรียบร้อย (เนื่องจากมีประวัติการจอง)');
      } else {
        setSuccessNotice('ลบห้องประชุมออกจากระบบเรียบร้อย');
      }
      setTimeout(() => setSuccessNotice(null), 4000);
      onRefresh();
    } else {
      setErrorMessage(res.error || 'เกิดข้อผิดพลาดในการลบห้อง');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('กรุณาระบุชื่อห้องประชุมหรือชื่อบัญชี');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    if (editingRoom) {
      const res = await updateRoom({
        roomId: editingRoom.id,
        name: formData.name.trim(),
        type: formData.type,
        capacity: formData.capacity,
        location: formData.location.trim(),
        staticUrl: formData.staticUrl.trim(),
        passcode: formData.passcode.trim(),
      });

      setSubmitting(false);
      if (res.success) {
        setEditingRoom(null);
        setSuccessNotice('แก้ไขข้อมูลห้องประชุมเรียบร้อย');
        setTimeout(() => setSuccessNotice(null), 3000);
        onRefresh();
      } else {
        setErrorMessage(res.error || 'ไม่สามารถแก้ไขข้อมูลได้');
      }
    } else {
      const res = await createRoom({
        name: formData.name.trim(),
        type: formData.type,
        capacity: formData.capacity,
        location: formData.location.trim(),
        staticUrl: formData.staticUrl.trim(),
        passcode: formData.passcode.trim(),
      });

      setSubmitting(false);
      if (res.success) {
        setIsAdding(false);
        setSuccessNotice('เพิ่มห้องประชุม/บัญชีออนไลน์ใหม่เรียบร้อย');
        setTimeout(() => setSuccessNotice(null), 3000);
        onRefresh();
      } else {
        setErrorMessage(res.error || 'ไม่สามารถเพิ่มข้อมูลได้');
      }
    }
  };

  const displayedRooms = rooms.filter((r) => {
    if (filterType === 'all') return true;
    return r.type === filterType;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                จัดการห้องประชุมและบัญชีออนไลน์ (Room & Account Pool)
              </h3>
              <p className="text-xs text-slate-400">
                เพิ่ม แก้ไข หรือปิดการใช้งานห้องประชุมกายภาพ และบัญชี Video Conference
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Message */}
        {successNotice && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Add / Edit Form Mode */}
          {(isAdding || editingRoom) ? (
            <form onSubmit={handleSubmit} className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  {editingRoom ? <Edit2 className="w-4 h-4 text-blue-400" /> : <Plus className="w-4 h-4 text-emerald-400" />}
                  {editingRoom ? `แก้ไขข้อมูล: ${editingRoom.name}` : 'เพิ่มห้องประชุมหรือบัญชีออนไลน์ใหม่'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingRoom(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ย้อนกลับไปหน้ารายการ
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ประเภททรัพยากร *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const t = e.target.value as RoomType;
                      setFormData({
                        ...formData,
                        type: t,
                        capacity: t === 'online' ? 250 : 10,
                        location: t === 'online' ? 'Online Cloud Video' : '',
                      });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="onsite">🏢 ห้องประชุมสถานที่จริง (Onsite Physical Room)</option>
                    <option value="online">🌐 บัญชีออนไลน์กลาง (Zoom / Teams / Meet Pool)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ชื่อห้องประชุม / บัญชี *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formData.type === 'onsite' ? 'เช่น ห้องประชุม 3 (ชั้น 2)' : 'เช่น Zoom VIP Account #2'}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ความจุ / จำนวนที่รองรับ (คน)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {formData.type === 'onsite' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      สถานที่ตั้ง (อาคาร / ชั้น)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น อาคาร A ชั้น 3 ข้างห้องการเงิน"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        URL ลิงก์ห้องประชุมส่วนกลาง (Static Meeting URL)
                      </label>
                      <input
                        type="url"
                        placeholder="https://zoom.us/j/... หรือ https://meet.google.com/..."
                        value={formData.staticUrl}
                        onChange={(e) => setFormData({ ...formData, staticUrl: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        รหัสผ่านเข้าห้อง (Passcode)
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น 123456"
                        value={formData.passcode}
                        onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingRoom(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : (editingRoom ? 'บันทึกการแก้ไข' : 'เพิ่มห้องประชุม')}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Filter Tabs & Add Button */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700 flex items-center">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      filterType === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ทั้งหมด ({rooms.length})
                  </button>
                  <button
                    onClick={() => setFilterType('onsite')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      filterType === 'onsite' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🏢 Onsite ({rooms.filter((r) => r.type === 'onsite').length})
                  </button>
                  <button
                    onClick={() => setFilterType('online')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      filterType === 'online' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🌐 Online ({rooms.filter((r) => r.type === 'online').length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAdd('onsite')}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
                  >
                    <Plus className="w-4 h-4" />
                    + เพิ่มห้องกายภาพ
                  </button>
                  <button
                    onClick={() => handleOpenAdd('online')}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
                  >
                    <Plus className="w-4 h-4" />
                    + เพิ่มบัญชีออนไลน์
                  </button>
                </div>
              </div>

              {/* Rooms List Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
                {displayedRooms.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    ไม่มีรายการห้องในหมวดหมู่นี้
                  </div>
                ) : (
                  displayedRooms.map((room) => (
                    <div
                      key={room.id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                        room.is_active ? 'bg-slate-900/60 hover:bg-slate-800/40' : 'bg-slate-950/60 opacity-60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              room.type === 'online'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : 'bg-blue-950 text-blue-300 border border-blue-800'
                            }`}
                          >
                            {room.type === 'online' ? 'Online Video' : 'Physical Room'}
                          </span>

                          <span className={`text-[11px] font-bold ${room.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {room.is_active ? '● เปิดใช้งาน' : '○ ปิดใช้งาน'}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          {room.name}
                        </h4>

                        <div className="text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                          <span>👥 รองรับ: {room.capacity || 10} ที่นั่ง</span>
                          {room.location && <span>📍 {room.location}</span>}
                          {room.static_url && (
                            <span className="text-purple-300 font-mono text-[11px]">
                              🔗 {room.static_url} (Passcode: {room.passcode || '-'})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(room.id, room.is_active)}
                          className={`p-2 rounded-xl text-xs font-medium border transition flex items-center gap-1 ${
                            room.is_active
                              ? 'bg-slate-800 hover:bg-amber-900/40 text-slate-300 hover:text-amber-300 border-slate-700'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50'
                          }`}
                          title={room.is_active ? 'ปิดการใช้งานห้องนี้' : 'เปิดใช้งานห้องนี้'}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span className="text-[11px]">{room.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(room)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition"
                          title="แก้ไขรายละเอียด"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(room)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-red-900/40 hover:text-red-300 text-slate-400 border border-slate-700 text-xs transition"
                          title="ลบหรือระงับการใช้งาน"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>* หากห้องมีประวัติการจอง ระบบจะปิดการใช้งาน (Soft Delete) อัตโนมัติเพื่อคงประวัติเดิม</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
