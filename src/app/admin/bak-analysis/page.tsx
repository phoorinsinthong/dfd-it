'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import {
  Database,
  Upload,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Package,
  Layers,
  Calendar,
  DollarSign,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Download,
  Info,
  Check,
  Building,
  User,
  Hash,
  Laptop
} from 'lucide-react';
import { BakParseResult, BakEquipmentItem } from '@/types/bak-equipment';
import { parseBakBuffer, generateBakCsvReport } from '@/lib/services/bak-parser-service';
import sampleBakData from '@/lib/data/sample-bak-data.json';

export default function BakAnalysisPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [parseResult, setParseResult] = useState<BakParseResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'crosstab' | 'report'>('dashboard');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Pagination for Table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  // Signatures for A4 Report
  const [prepName, setPrepName] = useState<string>('นายช่างเทคนิค ฝ่ายสนับสนุนระบบ');
  const [prepPos, setPrepPos] = useState<string>('เจ้าหน้าที่ผู้จัดทำรายงาน');
  const [apprName, setApprName] = useState<string>('ผู้อำนวยการกองเทคโนโลยีสารสนเทศ');
  const [apprPos, setApprPos] = useState<string>('ผู้ตรวจรับรองรายงาน');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Role guard
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Load sample on mount if no data loaded yet
  useEffect(() => {
    if (sampleBakData && sampleBakData.items && sampleBakData.items.length > 0) {
      setParseResult(sampleBakData as unknown as BakParseResult);
    }
  }, []);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-slate-400 text-sm mb-6">หน้านี้สงวนไว้สำหรับเจ้าหน้าที่ไอทีเท่านั้น</p>
          <Link href="/portal" className="inline-block py-2.5 px-5 bg-blue-600 rounded-xl text-white text-xs font-semibold">
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  // Handle File Upload and Parse
  const handleProcessFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.bak')) {
      setErrorMsg('กรุณาเลือกไฟล์นามสกุล .bak เท่านั้น');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Fast client-side binary parsing
      const result = parseBakBuffer(new Uint8Array(arrayBuffer), file.name);

      if (result.items.length === 0) {
        // Fallback: try server API
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/bak-parser', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        if (json.success && json.data) {
          setParseResult(json.data);
          setSuccessMsg(`ประมวลผลไฟล์ "${file.name}" สำเร็จ พบครุภัณฑ์ ${json.data.items.length} รายการ`);
        } else {
          setErrorMsg(json.error || 'ไม่พบโครงสร้างข้อมูลครุภัณฑ์ที่รองรับในไฟล์ .bak นี้');
        }
      } else {
        setParseResult(result);
        setSuccessMsg(`ประมวลผลไฟล์ "${file.name}" สำเร็จ พบครุภัณฑ์ ${result.items.length} รายการ (สแกน ${result.totalPagesScanned} เพจ)`);
      }
      setCurrentPage(1);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการอ่านไฟล์ .bak: ' + (err.message || 'โครงสร้างไฟล์ไม่ถูกต้อง'));
    } finally {
      setLoading(false);
    }
  };

  // Load Desktop Sample directly
  const handleLoadSample = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/bak-parser?sample=true');
      const json = await res.json();
      if (json.success && json.data) {
        setParseResult(json.data);
        setSuccessMsg(`โหลดข้อมูลตัวอย่าง "${json.data.fileName}" สำเร็จ (ทั้งหมด ${json.data.items.length} รายการ)`);
      } else {
        setParseResult(sampleBakData as unknown as BakParseResult);
        setSuccessMsg('โหลดข้อมูลตัวอย่างจาก Local Cache สำเร็จ');
      }
      setCurrentPage(1);
    } catch {
      setParseResult(sampleBakData as unknown as BakParseResult);
      setSuccessMsg('โหลดข้อมูลตัวอย่างสำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => {
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.items.filter((item) => {
      // Type
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      // Year
      if (selectedYear !== 'all' && item.year !== selectedYear) return false;
      // Category
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        const matchDept = item.deptName.toLowerCase().includes(q);
        const matchSerial = item.serial.toLowerCase().includes(q);
        const matchDoc = item.docNo.toLowerCase().includes(q);
        const matchRemark = item.remark.toLowerCase().includes(q);
        return matchCode || matchName || matchDept || matchSerial || matchDoc || matchRemark;
      }
      return true;
    });
  }, [parseResult, selectedType, selectedYear, selectedCategory, searchQuery]);

  // Paginated Items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;

  // Export CSV
  const handleDownloadCsv = () => {
    if (!parseResult) return;
    const csvContent = generateBakCsvReport(filteredItems);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const yearSuffix = selectedYear !== 'all' ? `_ปี${selectedYear}` : '';
    link.setAttribute('download', `DFD_Equipment_BAK_Report${yearSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar activeSection="bak-analysis" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section (Hidden in print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 no-print">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">
                Legacy Database Analytics (.bak)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Database className="w-7 h-7 text-amber-400" />
              <span>แดชบอร์ดวิเคราะห์ครุภัณฑ์จากไฟล์ .bak</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              ระบบถอดรหัสฐานข้อมูล Microsoft SQL Server (CP874) วิเคราะห์สถิติจำแนกตามประเภท จำนวน และปีงบประมาณ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleLoadSample}
              disabled={loading}
              className="px-3.5 py-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 text-amber-300 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-sm"
              title="โหลดไฟล์ตัวอย่าง DFDEquipment-20261109.bak ทันที"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>⚡ โหลดตัวอย่าง DFDEquipment</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              disabled={!parseResult || filteredItems.length === 0}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>ส่งออก CSV (Excel)</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={!parseResult}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-md shadow-blue-950/40"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์รายงาน A4</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs sm:text-sm flex items-center gap-3 no-print">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm flex items-center gap-3 no-print">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Upload Zone (Hidden in print) */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`mb-8 p-6 sm:p-8 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center no-print ${
            isDragging
              ? 'border-amber-400 bg-amber-950/20 scale-[1.01]'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".bak"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleProcessFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
            <Upload className={`w-7 h-7 ${loading ? 'animate-bounce' : ''}`} />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white mb-1">
            {loading ? 'กำลังประมวลผลไฟล์ .bak...' : 'ลากและวางไฟล์สำรอง .bak ที่นี่ หรือกดเพื่อเลือกไฟล์'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mb-4">
            รองรับไฟล์ Microsoft SQL Server Backup (.bak) ทุกขนาด ระบบจะถอดรหัสเพจข้อมูล 8KB และตารางภาษาไทย CP874 โดยอัตโนมัติ
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition shadow-lg shadow-amber-500/20"
            >
              {loading ? 'กำลังอ่านไฟล์...' : 'เลือกไฟล์ .bak จากเครื่อง'}
            </button>
            <button
              type="button"
              onClick={handleLoadSample}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm transition border border-slate-700"
            >
              ใช้ไฟล์ตัวอย่าง DFDEquipment
            </button>
          </div>

          {parseResult && (
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                ไฟล์ปัจจุบัน: <strong className="text-white">{parseResult.fileName}</strong>
              </span>
              <span>•</span>
              <span>ขนาด: {(parseResult.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
              <span>•</span>
              <span>เพจฐานข้อมูล: {parseResult.totalPagesScanned.toLocaleString()} เพจ</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">✓ ถอดรหัสภาษาไทย TIS-620/CP874 สำเร็จ</span>
            </div>
          )}
        </div>

        {parseResult && (
          <>
            {/* 5 Core KPI Summary Cards (Hidden in print) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 no-print">
              {/* KPI 1: ครุภัณฑ์ทั้งหมด */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Total
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">จำนวนครุภัณฑ์รวม</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">
                    {parseResult.summary.totalCount.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">รายการ</span>
                </div>
              </div>

              {/* KPI 2: มูลค่ารวม */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Value
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">มูลค่ารวมตามเอกสาร</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-bold text-emerald-400">
                    ฿{parseResult.summary.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* KPI 3: ประเภทครุภัณฑ์ */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Types
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">จำแนกประเภท</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">
                    {parseResult.summary.uniqueTypesCount}
                  </span>
                  <span className="text-xs text-slate-500">ประเภท</span>
                </div>
              </div>

              {/* KPI 4: หมวดหมู่หลัก */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Building className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Categories
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">หมวดหมู่หลัก</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">
                    {parseResult.summary.uniqueCategoriesCount}
                  </span>
                  <span className="text-xs text-slate-500">หมวด</span>
                </div>
              </div>

              {/* KPI 5: ช่วงปีงบประมาณ */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Span
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">ช่วงปีงบประมาณ</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg sm:text-xl font-bold text-amber-300">
                    {parseResult.summary.yearSpan}
                  </span>
                </div>
              </div>
            </div>

            {/* View Tabs Bar (Hidden in print) */}
            <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar no-print">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 shrink-0 ${
                  activeTab === 'dashboard'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>แดชบอร์ดสรุปสถิติ (Overview)</span>
              </button>

              <button
                onClick={() => setActiveTab('crosstab')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 shrink-0 ${
                  activeTab === 'crosstab'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>เมทริกซ์ ประเภท x ปีงบประมาณ</span>
              </button>

              <button
                onClick={() => setActiveTab('table')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 shrink-0 ${
                  activeTab === 'table'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>ตารางค้นหารายการ ({filteredItems.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('report')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 shrink-0 ${
                  activeTab === 'report'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>มุมมองพิมพ์รายงาน A4</span>
              </button>
            </div>

            {/* TAB 1: DASHBOARD (แบ่งตามประเภท จำนวน ตามปี) */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8 no-print">
                {/* 2-Column Analytics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Card 1: จำแนกตามประเภท (By Equipment Type) */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                          <Laptop className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">จำแนกตามประเภทครุภัณฑ์</h3>
                          <p className="text-xs text-slate-400">สัดส่วนจำนวนและมูลค่ารวมตามประเภท</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {parseResult.byType.length} ประเภท
                      </span>
                    </div>

                    <div className="space-y-4">
                      {parseResult.byType.map((t, idx) => (
                        <div key={t.type} className="group">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-semibold text-white group-hover:text-blue-300 transition flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-slate-800 text-[10px] text-slate-400 flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span>{t.type}</span>
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-slate-400">
                                {t.totalValue > 0 ? `฿${t.totalValue.toLocaleString('th-TH')}` : '-'}
                              </span>
                              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg min-w-16 text-right">
                                {t.count} ({t.percent}%)
                              </span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(5, t.percent))}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 2: สถิติตามหมวดหมู่หลัก (By Category) */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">จำแนกตามหมวดหมู่หลัก</h3>
                          <p className="text-xs text-slate-400">การจัดกลุ่มตามระเบียบพัสดุราชการ</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {parseResult.byCategory.length} หมวด
                      </span>
                    </div>

                    <div className="space-y-4">
                      {parseResult.byCategory.map((c, idx) => (
                        <div key={c.category} className="group">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-semibold text-white group-hover:text-purple-300 transition flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-slate-800 text-[10px] text-slate-400 flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span>{c.category}</span>
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-slate-400">
                                {c.totalValue > 0 ? `฿${c.totalValue.toLocaleString('th-TH')}` : '-'}
                              </span>
                              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg min-w-16 text-right">
                                {c.count} ({c.percent}%)
                              </span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(5, c.percent))}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Card 3: สถิติการจัดซื้อ/ขึ้นทะเบียนตามปีงบประมาณ (Distribution By Fiscal Year) */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">การกระจายตัวตามปีงบประมาณ (Yearly Timeline)</h3>
                        <p className="text-xs text-slate-400">จำนวนครุภัณฑ์ที่ขึ้นทะเบียนในแต่ละปีงบประมาณ (2542 - 2569)</p>
                      </div>
                    </div>
                    <span className="text-xs text-amber-400 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-xl self-start sm:self-auto font-medium">
                      ครอบคลุม {parseResult.byYear.length} ปีงบประมาณ
                    </span>
                  </div>

                  {/* Horizontal Bar Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {parseResult.byYear.map((y) => {
                      const maxYearCount = Math.max(...parseResult.byYear.map((item) => item.count));
                      const barPercent = Math.round((y.count / maxYearCount) * 100);
                      const isHighVolume = y.count >= 30;

                      return (
                        <div
                          key={y.year}
                          onClick={() => {
                            setSelectedYear(y.year);
                            setActiveTab('table');
                          }}
                          className={`p-3.5 rounded-2xl border transition cursor-pointer group ${
                            isHighVolume
                              ? 'bg-amber-950/20 border-amber-600/30 hover:border-amber-500/60'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-bold text-white group-hover:text-amber-300 transition flex items-center gap-1.5">
                              <span>ปี {y.year}</span>
                              {isHighVolume && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">
                                  สูง
                                </span>
                              )}
                            </span>
                            <span className="font-mono font-bold text-slate-200">
                              {y.count} รายการ
                            </span>
                          </div>

                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-1">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isHighVolume
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                  : 'bg-gradient-to-r from-slate-600 to-slate-400'
                              }`}
                              style={{ width: `${Math.max(8, barPercent)}%` }}
                            ></div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>สัดส่วน: {y.percent}%</span>
                            <span className="font-mono">
                              {y.totalValue > 0 ? `฿${y.totalValue.toLocaleString('th-TH')}` : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CROSSTAB MATRIX (ประเภท x ปีงบประมาณ) */}
            {activeTab === 'crosstab' && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl overflow-hidden no-print">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>ตารางเปรียบเทียบไขว้ (Cross-Tabulation Matrix: ปีงบประมาณ x ประเภทครุภัณฑ์)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ดูจำนวนครุภัณฑ์แต่ละประเภทในแต่ละปีงบประมาณ
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadCsv}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition self-start sm:self-auto"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลดตาราง</span>
                  </button>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                        <th className="py-3 px-3 min-w-28 sticky left-0 bg-slate-950 z-10">ปีงบประมาณ</th>
                        <th className="py-3 px-2 text-right">รวมทั้งสิ้น</th>
                        {parseResult.availableTypes.map((type) => (
                          <th key={type} className="py-3 px-3 min-w-36 text-right">
                            {type}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {parseResult.crossTab.map((row) => (
                        <tr key={row.year} className="hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-3 font-bold text-white sticky left-0 bg-slate-900 z-10">
                            ปี {row.year}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-400">
                            {row.total}
                          </td>
                          {parseResult.availableTypes.map((type) => {
                            const val = row.byType[type] || 0;
                            return (
                              <td
                                key={type}
                                className={`py-2.5 px-3 text-right font-mono ${
                                  val > 0 ? 'text-slate-100 font-semibold bg-blue-500/5' : 'text-slate-600'
                                }`}
                              >
                                {val > 0 ? val : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-950 font-bold text-white border-t-2 border-slate-700">
                        <td className="py-3 px-3 sticky left-0 bg-slate-950 z-10">รวมทุกปี</td>
                        <td className="py-3 px-2 text-right text-amber-400 font-mono">
                          {parseResult.summary.totalCount}
                        </td>
                        {parseResult.availableTypes.map((type) => {
                          const colTotal = parseResult.byType.find((t) => t.type === type)?.count || 0;
                          return (
                            <td key={type} className="py-3 px-3 text-right font-mono text-blue-300">
                              {colTotal}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: DATA EXPLORER & DETAILED TABLE */}
            {activeTab === 'table' && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl no-print">
                {/* Search & Filter Toolbar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800 mb-6">
                  {/* Search Bar */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="ค้นหารหัสครุภัณฑ์, ชื่อรุ่น, แผนก, เอกสาร..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    {/* Year Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">ปีงบ:</span>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          setSelectedYear(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="all">ทุกปีงบประมาณ ({parseResult.items.length})</option>
                        {parseResult.availableYears.map((y) => (
                          <option key={y} value={y}>
                            ปี {y}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Type Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">ประเภท:</span>
                      <select
                        value={selectedType}
                        onChange={(e) => {
                          setSelectedType(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 max-w-44 truncate"
                      >
                        <option value="all">ทุกประเภท</option>
                        {parseResult.availableTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">หมวดหมู่:</span>
                      <select
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="all">ทุกหมวดหมู่</option>
                        {parseResult.availableCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reset button */}
                    {(selectedYear !== 'all' || selectedType !== 'all' || selectedCategory !== 'all' || searchQuery) && (
                      <button
                        onClick={() => {
                          setSelectedYear('all');
                          setSelectedType('all');
                          setSelectedCategory('all');
                          setSearchQuery('');
                          setCurrentPage(1);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs transition"
                      >
                        ล้างตัวกรอง
                      </button>
                    )}
                  </div>
                </div>

                {/* Table Header Info */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span>
                    แสดงผลรายการที่ <strong className="text-white">{(currentPage - 1) * pageSize + 1}</strong> ถึง{' '}
                    <strong className="text-white">
                      {Math.min(currentPage * pageSize, filteredItems.length)}
                    </strong>{' '}
                    จากทั้งหมด <strong className="text-amber-400">{filteredItems.length}</strong> รายการ
                  </span>
                  <button
                    onClick={handleDownloadCsv}
                    className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลดผลลัพธ์นี้ (.csv)</span>
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                        <th className="py-3 px-3 w-12 text-center">#</th>
                        <th className="py-3 px-3 min-w-36">รหัสครุภัณฑ์</th>
                        <th className="py-3 px-3 min-w-44">ชื่อครุภัณฑ์ / รุ่น</th>
                        <th className="py-3 px-3 min-w-36">ประเภท</th>
                        <th className="py-3 px-2 text-center">ปีงบ</th>
                        <th className="py-3 px-3 min-w-44">หน่วยงานที่ครอบครอง</th>
                        <th className="py-3 px-3 text-right">ราคา/หน่วย</th>
                        <th className="py-3 px-3 min-w-28">เอกสาร</th>
                        <th className="py-3 px-3 min-w-36">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {paginatedItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-500">
                            ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
                          </td>
                        </tr>
                      ) : (
                        paginatedItems.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                              {(currentPage - 1) * pageSize + idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                              {item.code || '-'}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-white">
                              {item.name || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] border border-slate-700">
                                {item.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-slate-200">
                              {item.year}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                              {item.deptName || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                              {item.price > 0 ? `฿${item.price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                              {item.docNo || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-44" title={item.remark}>
                              {item.remark || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-5 text-xs">
                    <span className="text-slate-400">
                      หน้า {currentPage} จาก {totalPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                      >
                        ก่อนหน้า
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                      >
                        ถัดไป
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: A4 PRINTABLE REPORT (พร้อมสามารถโหลดเป็นรายงานได้ด้วย) */}
            {activeTab === 'report' && (
              <div className="space-y-6">
                {/* Print Control Toolbar (Hidden in print) */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                  <div className="flex items-center gap-2">
                    <Printer className="w-5 h-5 text-blue-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">มุมมองตัวอย่างพิมพ์รายงาน A4 แนวนอน</h4>
                      <p className="text-xs text-slate-400">
                        จัดรูปแบบเอกสารราชการมาตรฐาน พร้อมส่วนลงนามเจ้าหน้าที่และผู้ตรวจรับรอง
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleDownloadCsv}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>ดาวน์โหลด CSV</span>
                    </button>
                    <button
                      onClick={handlePrint}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-950/40"
                    >
                      <Printer className="w-4 h-4" />
                      <span>สั่งพิมพ์ A4 ทันที (Print)</span>
                    </button>
                  </div>
                </div>

                {/* Printable Document Sheet (Rendered for both preview and physical print) */}
                <div className="print-report-container bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-2xl border border-slate-200 font-sans print:shadow-none print:border-none print:p-0">
                  {/* Document Header */}
                  <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
                      รายงานสรุปการสำรวจและจำแนกครุภัณฑ์ไอที (DFDEquipment)
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      แหล่งข้อมูล: ไฟล์สำรองฐานข้อมูล {parseResult.fileName} • สกัดข้อมูลเมื่อวันที่ {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
                    </p>
                  </div>

                  {/* Executive Summary Metrics in Report */}
                  <div className="grid grid-cols-4 gap-4 p-4 rounded-xl bg-slate-100 border border-slate-300 mb-6 text-center text-xs">
                    <div>
                      <p className="text-slate-500">จำนวนครุภัณฑ์รวม</p>
                      <p className="text-lg font-bold text-slate-900 mt-0.5">
                        {parseResult.summary.totalCount.toLocaleString()} รายการ
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">มูลค่ารวมตามเอกสาร</p>
                      <p className="text-lg font-bold text-emerald-700 mt-0.5">
                        ฿{parseResult.summary.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">จำนวนประเภทครุภัณฑ์</p>
                      <p className="text-lg font-bold text-slate-900 mt-0.5">
                        {parseResult.summary.uniqueTypesCount} ประเภท
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">ช่วงปีงบประมาณ</p>
                      <p className="text-lg font-bold text-amber-700 mt-0.5">
                        ปี {parseResult.summary.yearSpan}
                      </p>
                    </div>
                  </div>

                  {/* Section A: Breakdown by Type */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-900 mb-2 border-b border-slate-300 pb-1">
                      1. สรุปจำแนกตามประเภทครุภัณฑ์
                    </h3>
                    <table className="w-full text-xs border border-slate-300 border-collapse">
                      <thead>
                        <tr className="bg-slate-200 text-slate-800">
                          <th className="border border-slate-300 p-2 text-center w-12">ลำดับ</th>
                          <th className="border border-slate-300 p-2 text-left">ประเภทครุภัณฑ์</th>
                          <th className="border border-slate-300 p-2 text-left">หมวดหมู่</th>
                          <th className="border border-slate-300 p-2 text-right w-24">จำนวน (ชิ้น)</th>
                          <th className="border border-slate-300 p-2 text-right w-24">สัดส่วน (%)</th>
                          <th className="border border-slate-300 p-2 text-right w-36">มูลค่ารวม (บาท)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.byType.map((t, idx) => (
                          <tr key={t.type} className="hover:bg-slate-50">
                            <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                            <td className="border border-slate-300 p-1.5 font-semibold">{t.type}</td>
                            <td className="border border-slate-300 p-1.5 text-slate-600">{t.category}</td>
                            <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">{t.count}</td>
                            <td className="border border-slate-300 p-1.5 text-right font-mono">{t.percent}%</td>
                            <td className="border border-slate-300 p-1.5 text-right font-mono font-semibold">
                              {t.totalValue > 0 ? `฿${t.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold">
                          <td colSpan={3} className="border border-slate-300 p-2 text-center">รวมทั้งสิ้น</td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                            {parseResult.summary.totalCount}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold">100.0%</td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                            ฿{parseResult.summary.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Section B: Breakdown by Year */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-900 mb-2 border-b border-slate-300 pb-1">
                      2. สรุปจำแนกตามปีงบประมาณ
                    </h3>
                    <table className="w-full text-xs border border-slate-300 border-collapse">
                      <thead>
                        <tr className="bg-slate-200 text-slate-800">
                          <th className="border border-slate-300 p-2 text-center w-12">ลำดับ</th>
                          <th className="border border-slate-300 p-2 text-left">ปีงบประมาณ</th>
                          <th className="border border-slate-300 p-2 text-right w-28">จำนวน (รายการ)</th>
                          <th className="border border-slate-300 p-2 text-right w-24">สัดส่วน (%)</th>
                          <th className="border border-slate-300 p-2 text-right w-36">มูลค่ารวม (บาท)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.byYear.map((y, idx) => (
                          <tr key={y.year} className="hover:bg-slate-50">
                            <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                            <td className="border border-slate-300 p-1.5 font-bold">ปี {y.year}</td>
                            <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">{y.count}</td>
                            <td className="border border-slate-300 p-1.5 text-right font-mono">{y.percent}%</td>
                            <td className="border border-slate-300 p-1.5 text-right font-mono font-semibold">
                              {y.totalValue > 0 ? `฿${y.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures Block */}
                  <div className="grid grid-cols-2 gap-8 pt-8 border-t-2 border-slate-900 text-center text-xs mt-8 break-inside-avoid">
                    {/* Reporter Signature */}
                    <div className="space-y-2">
                      <p className="text-slate-600">ลงชื่อ..............................................................</p>
                      <input
                        type="text"
                        value={prepName}
                        onChange={(e) => setPrepName(e.target.value)}
                        className="text-center font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full bg-transparent no-print"
                      />
                      <p className="font-bold text-slate-900 hidden print:block">({prepName})</p>
                      <input
                        type="text"
                        value={prepPos}
                        onChange={(e) => setPrepPos(e.target.value)}
                        className="text-center text-slate-500 text-[11px] border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full bg-transparent no-print"
                      />
                      <p className="text-slate-500 text-[11px] hidden print:block">{prepPos}</p>
                      <p className="text-[11px] text-slate-400">วันที่: {new Date().toLocaleDateString('th-TH')}</p>
                    </div>

                    {/* Approver Signature */}
                    <div className="space-y-2">
                      <p className="text-slate-600">ลงชื่อ..............................................................</p>
                      <input
                        type="text"
                        value={apprName}
                        onChange={(e) => setApprName(e.target.value)}
                        className="text-center font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full bg-transparent no-print"
                      />
                      <p className="font-bold text-slate-900 hidden print:block">({apprName})</p>
                      <input
                        type="text"
                        value={apprPos}
                        onChange={(e) => setApprPos(e.target.value)}
                        className="text-center text-slate-500 text-[11px] border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full bg-transparent no-print"
                      />
                      <p className="text-slate-500 text-[11px] hidden print:block">{apprPos}</p>
                      <p className="text-[11px] text-slate-400">วันที่: ......................................................</p>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* Print Specific CSS */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-report-container {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          @page {
            size: A4 landscape;
            margin: 1.5cm 1cm;
          }
        }
      `}</style>
    </div>
  );
}
