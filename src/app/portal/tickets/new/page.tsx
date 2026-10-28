'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Camera, 
  MapPin, 
  Send, 
  AlertCircle, 
  Building2, 
  FolderTree, 
  Trash2,
  FileCheck,
  Layers,
  DoorOpen,
  Info
} from 'lucide-react';
import { Division, Department, Category, TicketUrgency } from '@/types/database';
import { getDivisions, getDepartments, getCategories } from '@/lib/services/master-data-service';
import { createTicket } from '@/lib/services/ticket-service';
import { compressImageFile } from '@/lib/utils/image-compression';

export default function NewTicketPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [deskNote, setDeskNote] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<TicketUrgency>('medium');
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    async function loadMasterData() {
      const [divs, depts, cats] = await Promise.all([
        getDivisions(),
        getDepartments(),
        getCategories(),
      ]);

      setDivisions(divs);
      setDepartments(depts);
      setCategories(cats);

      // Recall saved division and department from device storage
      let initialDivId = divs[0]?.id || '';
      let initialDeptId = '';

      try {
        const savedDiv = localStorage.getItem('it_support_saved_div_id');
        const savedDept = localStorage.getItem('it_support_saved_dept_id');
        if (savedDiv && divs.some((d) => d.id === savedDiv)) {
          initialDivId = savedDiv;
        }
        if (savedDept && depts.some((d) => d.id === savedDept)) {
          initialDeptId = savedDept;
        }
      } catch {
        // Ignore storage errors
      }

      setSelectedDivisionId(initialDivId);

      // Filter departments for this division
      const availableDepts = depts.filter((d) => !initialDivId || d.division_id === initialDivId);
      if (initialDeptId && availableDepts.some((d) => d.id === initialDeptId)) {
        setSelectedDeptId(initialDeptId);
      } else if (availableDepts.length > 0) {
        setSelectedDeptId(availableDepts[0].id);
      }

      if (cats.length > 0) setSelectedCatId(cats[0].id);
    }
    loadMasterData();
  }, []);

  // Update department selection when division changes
  const handleDivisionChange = (divId: string) => {
    setSelectedDivisionId(divId);
    try {
      localStorage.setItem('it_support_saved_div_id', divId);
    } catch {
      // Ignore
    }

    const available = departments.filter((d) => !divId || d.division_id === divId);
    if (available.length > 0) {
      setSelectedDeptId(available[0].id);
      try {
        localStorage.setItem('it_support_saved_dept_id', available[0].id);
      } catch {
        // Ignore
      }
    } else {
      setSelectedDeptId('');
    }
  };

  const handleDepartmentChange = (deptId: string) => {
    setSelectedDeptId(deptId);
    try {
      localStorage.setItem('it_support_saved_dept_id', deptId);
    } catch {
      // Ignore
    }
  };

  const currentDept = departments.find((d) => d.id === selectedDeptId);
  const currentDiv = divisions.find((d) => d.id === selectedDivisionId);
  const deptsForSelectedDiv = departments.filter((d) => !selectedDivisionId || d.division_id === selectedDivisionId);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setError(null);
    try {
      const originalSizeKb = Math.round(file.size / 1024);
      const compressedDataUrl = await compressImageFile(file);
      
      const compressedBytes = Math.round((compressedDataUrl.length * 3) / 4);
      const compressedKb = Math.round(compressedBytes / 1024);

      setPreviewImage(compressedDataUrl);
      setCompressedSize(`${compressedKb} KB (ลดจาก ${originalSizeKb} KB)`);
    } catch {
      setError('ไม่สามารถประมวลผลไฟล์รูปภาพได้ กรุณาลองรูปอื่น');
    } finally {
      setIsCompressing(false);
    }
  };

  const removeImage = () => {
    setPreviewImage(null);
    setCompressedSize(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!description.trim()) {
      setError('กรุณากรอกรายละเอียดอาการเสียที่พบ');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const selectedCat = categories.find((c) => c.id === selectedCatId);

      // Build composite location string
      const locComponents = [
        currentDept?.building,
        currentDept?.floor,
        currentDept?.room,
      ].filter(Boolean).join(' ');

      const finalLocation = locComponents
        ? deskNote.trim()
          ? `${locComponents} (${deskNote.trim()})`
          : locComponents
        : deskNote.trim() || 'ภายในสำนักงาน';

      const res = await createTicket({
        userId: user.id,
        userName: user.name,
        userEmployeeId: user.employee_id,
        divisionId: selectedDivisionId || undefined,
        divisionName: currentDiv?.name,
        departmentId: selectedDeptId || undefined,
        departmentName: currentDept?.name,
        building: currentDept?.building,
        floor: currentDept?.floor,
        room: currentDept?.room,
        locationNote: deskNote.trim() || undefined,
        categoryId: selectedCatId,
        categoryName: selectedCat?.name,
        title: title.trim() || description.trim().slice(0, 30),
        description: description.trim(),
        location: finalLocation,
        urgency,
        imageUrl: previewImage || undefined,
      });

      if (res.success) {
        router.push('/portal?submitted=true');
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการส่งคำขอแจ้งซ่อม');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/portal"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              สร้างใบแจ้งซ่อมใหม่ (New Repair Ticket)
            </h1>
            <p className="text-xs text-slate-400">
              กรอกข้อมูลอาการเสียและแนบรูปถ่ายเพื่อให้เจ้าหน้าที่ไอทีเข้าดำเนินการแก้ไข
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Repair Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
          
          {/* Organization Unit: Division & Department Cascading Selector */}
          <div className="space-y-3 p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              <span>สังกัดหน่วยงานและสถานที่ของคุณ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>กองงาน / สำนัก <span className="text-red-400">*</span></span>
                </label>
                <select
                  value={selectedDivisionId}
                  onChange={(e) => handleDivisionChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>แผนก / ฝ่าย <span className="text-red-400">*</span></span>
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {deptsForSelectedDiv.length === 0 ? (
                    <option value="">-- ไม่พบแผนกในกองงานนี้ --</option>
                  ) : (
                    deptsForSelectedDiv.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Department Location Auto-Detection Display */}
            {currentDept && (currentDept.building || currentDept.floor || currentDept.room) && (
              <div className="flex items-center gap-2 p-2.5 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-300">
                <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  <strong>พิกัดประจำแผนก:</strong> {[currentDept.building, currentDept.floor, currentDept.room].filter(Boolean).join(' ')}
                </span>
              </div>
            )}

            {/* Additional Desk / Location Detail */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <DoorOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>หมายเลขโต๊ะทำงาน หรือจุดสังเกตเพิ่มเติม (ถ้ามี)</span>
              </label>
              <input
                type="text"
                placeholder="เช่น โต๊ะ 04 ริมหน้าต่าง, ข้างเครื่องถ่ายเอกสาร"
                value={deskNote}
                onChange={(e) => setDeskNote(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Category & Urgency Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-blue-400" />
                <span>ประเภทปัญหา <span className="text-red-400">*</span></span>
              </label>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>ความเร่งด่วน <span className="text-red-400">*</span></span>
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as TicketUrgency)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">🟢 ปกติ (Low)</option>
                <option value="medium">📌 ปานกลาง (Medium)</option>
                <option value="high">⚠️ ด่วนสูง (High)</option>
                <option value="urgent">🚨 ด่วนที่สุด (Urgent)</option>
              </select>
            </div>
          </div>

          {/* Issue Title */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              หัวข้อปัญหา (ย่อสั้นๆ)
            </label>
            <input
              type="text"
              placeholder="เช่น จอคอมไม่ติด, ต่อเน็ต Wi-Fi ไม่ได้, ปริ้นเตอร์หมึกหมด"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              รายละเอียดอาการเสีย <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="อธิบายอาการเสียที่พบ เช่น ไฟไม่เข้า, มีข้อความ Error อะไรแสดงบนหน้าจอ..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Photo Attachment & Client Compression */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>แนบรูปถ่ายประกอบ (ถ่ายจากมือถือหรือเลือกไฟล์)</span>
            </label>

            {!previewImage ? (
              <label className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 transition group">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Camera className="w-8 h-8 text-slate-500 group-hover:text-blue-400 mb-2 transition" />
                <span className="text-xs text-slate-300 font-medium">กดเพื่อถ่ายรูป หรือ เลือกรูปถ่ายจากเครื่อง</span>
                <span className="text-[11px] text-slate-500 mt-0.5">ระบบจะบีบอัดรูปภาพเป็น WebP อัตโนมัติเพื่อประหยัดเน็ตมือถือ</span>
              </label>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImage}
                  alt="Preview"
                  className="w-full max-h-60 object-contain rounded-xl"
                />
                <div className="flex items-center justify-between mt-2 px-2 text-xs">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>บีบอัดแล้ว: {compressedSize}</span>
                  </span>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="text-red-400 hover:text-red-300 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบรูป</span>
                  </button>
                </div>
              </div>
            )}

            {isCompressing && (
              <p className="text-xs text-blue-400 mt-2 flex items-center gap-1.5 animate-pulse">
                <span>กำลังบีบอัดรูปภาพให้เหมาะสมกับอุปกรณ์พกพา...</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังส่งข้อมูลแจ้งซ่อม...' : 'ส่งใบแจ้งซ่อมเข้าฝ่ายไอที'}</span>
            </button>
          </div>

        </form>

      </main>
    </div>
  );
}
