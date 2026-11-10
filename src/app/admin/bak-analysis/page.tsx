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
  Laptop,
  Clock,
  AlertCircle,
  FileText,
  SlidersHorizontal,
  FolderArchive
} from 'lucide-react';
import { BakParseResult, BakEquipmentItem, AgeBracket } from '@/types/bak-equipment';
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

  // Source Type Selector: .bak vs Excel
  const [sourceMode, setSourceMode] = useState<'bak' | 'excel'>('bak');

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'crosstab' | 'report'>('dashboard');
  const [crosstabMode, setCrosstabMode] = useState<'age' | 'year'>('age');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAgeBracket, setSelectedAgeBracket] = useState<string>('all');
  const [selectedSourceFile, setSelectedSourceFile] = useState<string>('all');
  const [customAgeMin, setCustomAgeMin] = useState<string>('');
  const [customAgeMax, setCustomAgeMax] = useState<string>('');

  // Pagination for Table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  // Signatures for A4 Report
  const [prepName, setPrepName] = useState<string>('นายช่างเทคนิค ฝ่ายสนับสนุนระบบ');
  const [prepPos, setPrepPos] = useState<string>('เจ้าหน้าที่ผู้จัดทำรายงาน');
  const [apprName, setApprName] = useState<string>('ผู้อำนวยการกองเทคโนโลยีสารสนเทศ');
  const [apprPos, setApprPos] = useState<string>('ผู้ตรวจรับรองรายงาน');

  const bakFileInputRef = useRef<HTMLInputElement | null>(null);
  const excelFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Handle BAK file upload
  const handleProcessBakFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.bak')) {
      setErrorMsg('กรุณาเลือกไฟล์นามสกุล .bak เท่านั้น');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = parseBakBuffer(new Uint8Array(arrayBuffer), file.name);

      if (result.items.length === 0) {
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

  // Handle Excel files upload (multiple files)
  const handleProcessExcelFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => {
      const lower = f.name.toLowerCase();
      return lower.endsWith('.xls') || lower.endsWith('.xlsx');
    });

    if (fileArray.length === 0) {
      setErrorMsg('กรุณาเลือกไฟล์นามสกุล .xls หรือ .xlsx เท่านั้น');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      for (const f of fileArray) {
        formData.append('files', f);
      }
      formData.append('year', '2569');

      const res = await fetch('/api/bak-parser', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (json.success && json.data) {
        setParseResult(json.data);
        setSuccessMsg(
          `ประมวลผลไฟล์ Excel ${fileArray.length} ไฟล์สำเร็จ พบข้อมูลครุภัณฑ์รวม ${json.data.items.length} รายการ`
        );
      } else {
        setErrorMsg(json.error || 'เกิดข้อผิดพลาดในการอ่านข้อมูลจากไฟล์ Excel');
      }
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Excel processing error:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load Sample .bak
  const handleLoadSampleBak = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/bak-parser?sample=bak');
      const json = await res.json();
      if (json.success && json.data) {
        setParseResult(json.data);
        setSuccessMsg(`โหลดข้อมูลตัวอย่าง .bak "${json.data.fileName}" สำเร็จ (${json.data.items.length} รายการ)`);
      } else {
        setParseResult(sampleBakData as unknown as BakParseResult);
        setSuccessMsg('โหลดข้อมูลตัวอย่าง .bak จาก Cache สำเร็จ');
      }
      setCurrentPage(1);
    } catch {
      setParseResult(sampleBakData as unknown as BakParseResult);
      setSuccessMsg('โหลดข้อมูลตัวอย่างสำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  // Load Sample Excel (6 files bundle)
  const handleLoadSampleExcel = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/bak-parser?sample=excel');
      const json = await res.json();
      if (json.success && json.data) {
        setParseResult(json.data);
        setSuccessMsg(`โหลดชุดไฟล์ Excel ทะเบียนครุภัณฑ์ 6 ไฟล์สำเร็จ (รวม ${json.data.items.length} รายการ)`);
      } else {
        setErrorMsg(json.error || 'ไม่สามารถโหลดไฟล์ตัวอย่าง Excel ได้');
      }
      setCurrentPage(1);
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการโหลดตัวอย่าง Excel: ' + err.message);
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
      const firstFile = e.dataTransfer.files[0];
      const isBak = firstFile.name.toLowerCase().endsWith('.bak');
      if (isBak) {
        setSourceMode('bak');
        handleProcessBakFile(firstFile);
      } else {
        setSourceMode('excel');
        handleProcessExcelFiles(e.dataTransfer.files);
      }
    }
  };

  // Filtered Items (Includes Type, Year, Category, Age Bracket & Source File)
  const filteredItems = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.items.filter((item) => {
      // Type
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      // Year
      if (selectedYear !== 'all' && item.year !== selectedYear) return false;
      // Category
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      // Source File
      if (selectedSourceFile !== 'all' && item.sourceFile !== selectedSourceFile) return false;

      // Age Bracket Filter
      if (selectedAgeBracket === '1-7' && item.ageBracket !== '1-7') return false;
      if (selectedAgeBracket === '7-14' && item.ageBracket !== '7-14') return false;
      if (selectedAgeBracket === '14+' && item.ageBracket !== '14+') return false;
      if (selectedAgeBracket === 'unknown' && item.ageBracket !== 'unknown') return false;
      if (selectedAgeBracket === 'custom') {
        const min = parseInt(customAgeMin, 10);
        const max = parseInt(customAgeMax, 10);
        if (!isNaN(min) && item.ageYears < min) return false;
        if (!isNaN(max) && item.ageYears > max) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        const matchDept = item.deptName.toLowerCase().includes(q);
        const matchSerial = item.serial.toLowerCase().includes(q);
        const matchDoc = item.docNo.toLowerCase().includes(q);
        const matchRemark = item.remark.toLowerCase().includes(q);
        const matchFile = (item.sourceFile || '').toLowerCase().includes(q);
        return matchCode || matchName || matchDept || matchSerial || matchDoc || matchRemark || matchFile;
      }
      return true;
    });
  }, [
    parseResult,
    selectedType,
    selectedYear,
    selectedCategory,
    selectedSourceFile,
    selectedAgeBracket,
    customAgeMin,
    customAgeMax,
    searchQuery,
  ]);

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
    const ageSuffix = selectedAgeBracket !== 'all' ? `_อายุ${selectedAgeBracket}` : '';
    link.setAttribute('download', `DFD_Equipment_Report${yearSuffix}${ageSuffix}.csv`);
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
                Equipment Analytics & Lifecycle Management (FY 2569)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Database className="w-7 h-7 text-amber-400" />
              <span>แดชบอร์ดวิเคราะห์ครุภัณฑ์ & อายุการใช้งาน</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              วิเคราะห์จำแนกตามประเภท ช่วงอายุการใช้งาน (1-7 ปี, 7-14 ปี, 14+ ปี) และปีงบประมาณ รองรับทั้งไฟล์ .bak และไฟล์ Excel
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleLoadSampleBak}
              disabled={loading}
              className="px-3 py-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 text-amber-300 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-sm"
              title="โหลดไฟล์ตัวอย่าง DFDEquipment-20261109.bak ทันที"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>⚡ โหลดตัวอย่าง .bak</span>
            </button>
            <button
              onClick={handleLoadSampleExcel}
              disabled={loading}
              className="px-3 py-2 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-600/40 text-emerald-300 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-sm"
              title="โหลดชุดไฟล์ Excel ตัวอย่าง 6 ไฟล์ (คอมพิวเตอร์, ปริ้นเตอร์ ฯลฯ)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>⚡ โหลดตัวอย่าง Excel (6 ไฟล์)</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              disabled={!parseResult || filteredItems.length === 0}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>ส่งออก CSV</span>
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

        {/* Source Selector & Upload Zone (Hidden in print) */}
        <div className="mb-8 rounded-3xl bg-slate-900/60 border border-slate-800 p-6 sm:p-7 no-print">
          {/* Source Tabs: .bak vs Excel */}
          <div className="flex items-center gap-3 pb-5 border-b border-slate-800/80 mb-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              เลือกแหล่งข้อมูล:
            </span>
            <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setSourceMode('bak')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                  sourceMode === 'bak'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>ไฟล์สำรอง .bak (SQL Server)</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceMode('excel')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                  sourceMode === 'excel'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>ไฟล์ทะเบียน Excel (รวมหลายไฟล์ .xls, .xlsx)</span>
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center ${
              isDragging
                ? 'border-amber-400 bg-amber-950/20 scale-[1.01]'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
            }`}
          >
            {sourceMode === 'bak' ? (
              <>
                <input
                  type="file"
                  ref={bakFileInputRef}
                  accept=".bak"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessBakFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                  <Database className={`w-7 h-7 ${loading ? 'animate-bounce' : ''}`} />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                  {loading ? 'กำลังประมวลผลไฟล์ .bak...' : 'ลากและวางไฟล์สำรอง .bak หรือกดเลือกไฟล์'}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mb-4">
                  รองรับไฟล์ Microsoft SQL Server Backup (.bak) ทุกขนาด สกัดตารางครุภัณฑ์ภาษาไทย CP874 และคำนวณอายุอัตโนมัติ
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => bakFileInputRef.current?.click()}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition shadow-lg shadow-amber-500/20"
                  >
                    {loading ? 'กำลังอ่านไฟล์...' : 'เลือกไฟล์ .bak จากเครื่อง'}
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSampleBak}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm transition border border-slate-700"
                  >
                    ใช้ไฟล์ตัวอย่าง DFDEquipment (.bak)
                  </button>
                </div>
              </>
            ) : (
              <>
                <input
                  type="file"
                  ref={excelFileInputRef}
                  accept=".xls,.xlsx"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleProcessExcelFiles(e.target.files);
                    }
                  }}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <FileSpreadsheet className={`w-7 h-7 ${loading ? 'animate-bounce' : ''}`} />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                  {loading ? 'กำลังประมวลผลไฟล์ Excel...' : 'ลากและวางไฟล์ Excel หลายไฟล์พร้อมกัน (.xls, .xlsx)'}
                </h3>
                <p className="text-xs text-slate-400 max-w-lg mb-4">
                  เลือกหลายไฟล์พร้อมกัน เช่น คอมพิวเตอร์, ปริ้นเตอร์เลเซอร์, Inkjet ฯลฯ ระบบจะรวมตาราง คำนวณอายุ และสกัดสถิติให้อัตโนมัติ
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => excelFileInputRef.current?.click()}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition shadow-lg shadow-emerald-500/20"
                  >
                    {loading ? 'กำลังรวมไฟล์...' : 'เลือกไฟล์ Excel (เลือกได้หลายไฟล์)'}
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSampleExcel}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm transition border border-slate-700"
                  >
                    โหลดชุด Excel ตัวอย่าง 6 ไฟล์ (Downloads)
                  </button>
                </div>
              </>
            )}

            {parseResult && (
              <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Database className="w-3.5 h-3.5 text-amber-400" />
                  แหล่งข้อมูล: <strong className="text-white">{parseResult.fileName}</strong>
                </span>
                <span>•</span>
                <span>
                  ประเภทข้อมูล: <strong className="text-amber-400 uppercase">{parseResult.sourceType || 'bak'}</strong>
                </span>
                {parseResult.availableFiles && parseResult.availableFiles.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">
                      รวมทั้งหมด {parseResult.availableFiles.length} ไฟล์
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="text-emerald-400 font-medium">✓ คำนวณอายุใช้งานอิงปีงบประมาณ 2569</span>
              </div>
            )}
          </div>
        </div>

        {parseResult && (
          <>
            {/* KPI Cards: Total, Value, Types & 3 Lifecycle Age Brackets (Hidden in print) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 mb-8 no-print">
              {/* KPI 1: ครุภัณฑ์ทั้งหมด */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Total
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">จำนวนครุภัณฑ์รวม</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white">
                    {parseResult.summary.totalCount.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">ชิ้น</span>
                </div>
              </div>

              {/* KPI 2: มูลค่ารวม */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Value
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">มูลค่ารวมตามเอกสาร</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-emerald-400">
                    ฿{parseResult.summary.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* KPI 3: จำแนกประเภท */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Types
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">จำแนกประเภท</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white">
                    {parseResult.summary.uniqueTypesCount}
                  </span>
                  <span className="text-xs text-slate-500">ประเภท</span>
                </div>
              </div>

              {/* KPI 4: 🟢 อายุ 1 - 7 ปี (ใช้งานปกติ) */}
              <div
                onClick={() => {
                  setSelectedAgeBracket('1-7');
                  setActiveTab('table');
                }}
                className="bg-emerald-950/20 border border-emerald-500/30 hover:border-emerald-500/60 transition cursor-pointer rounded-2xl p-4 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    1 - 7 ปี
                  </span>
                </div>
                <p className="text-xs text-emerald-300/80 mb-1">ใช้งานปกติ (🟢)</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-emerald-400">
                    {parseResult.summary.age1To7Count.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-emerald-400/80 font-mono">
                    {parseResult.summary.totalCount > 0
                      ? `${Math.round((parseResult.summary.age1To7Count / parseResult.summary.totalCount) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 truncate">
                  ฿{parseResult.summary.age1To7Value.toLocaleString('th-TH')}
                </p>
              </div>

              {/* KPI 5: 🟡 อายุ 7 - 14 ปี (เริ่มเสื่อมสภาพ) */}
              <div
                onClick={() => {
                  setSelectedAgeBracket('7-14');
                  setActiveTab('table');
                }}
                className="bg-amber-950/20 border border-amber-500/30 hover:border-amber-500/60 transition cursor-pointer rounded-2xl p-4 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    7 - 14 ปี
                  </span>
                </div>
                <p className="text-xs text-amber-300/80 mb-1">เริ่มเสื่อมสภาพ (🟡)</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-amber-400">
                    {parseResult.summary.age7To14Count.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-amber-400/80 font-mono">
                    {parseResult.summary.totalCount > 0
                      ? `${Math.round((parseResult.summary.age7To14Count / parseResult.summary.totalCount) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 truncate">
                  ฿{parseResult.summary.age7To14Value.toLocaleString('th-TH')}
                </p>
              </div>

              {/* KPI 6: 🔴 อายุ 14 ปีขึ้นไป (เกินเกณฑ์/รอจำหน่าย) */}
              <div
                onClick={() => {
                  setSelectedAgeBracket('14+');
                  setActiveTab('table');
                }}
                className="bg-red-950/20 border border-red-500/30 hover:border-red-500/60 transition cursor-pointer rounded-2xl p-4 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                    14+ ปี
                  </span>
                </div>
                <p className="text-xs text-red-300/80 mb-1">เกินเกณฑ์/รอจำหน่าย (🔴)</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-red-400">
                    {parseResult.summary.age14PlusCount.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-red-400/80 font-mono">
                    {parseResult.summary.totalCount > 0
                      ? `${Math.round((parseResult.summary.age14PlusCount / parseResult.summary.totalCount) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 truncate">
                  ฿{parseResult.summary.age14PlusValue.toLocaleString('th-TH')}
                </p>
              </div>
            </div>

            {/* Quick Age Filter Pills Bar (Hidden in print) */}
            <div className="mb-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>กรองตามอายุใช้งาน:</span>
                </span>

                <button
                  onClick={() => {
                    setSelectedAgeBracket('all');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    selectedAgeBracket === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  ทุกช่วงอายุ ({parseResult.summary.totalCount})
                </button>

                <button
                  onClick={() => {
                    setSelectedAgeBracket('1-7');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    selectedAgeBracket === '1-7'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950 text-emerald-400 hover:bg-emerald-950/30 border border-emerald-500/30'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>1 - 7 ปี ({parseResult.summary.age1To7Count})</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedAgeBracket('7-14');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    selectedAgeBracket === '7-14'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-950 text-amber-400 hover:bg-amber-950/30 border border-amber-500/30'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>7 - 14 ปี ({parseResult.summary.age7To14Count})</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedAgeBracket('14+');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    selectedAgeBracket === '14+'
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                      : 'bg-slate-950 text-red-400 hover:bg-red-950/30 border border-red-500/30'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  <span>14 ปีขึ้นไป ({parseResult.summary.age14PlusCount})</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedAgeBracket('custom');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    selectedAgeBracket === 'custom'
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>กำหนดช่วงปีเอง</span>
                </button>
              </div>

              {/* Custom Age Inputs */}
              {selectedAgeBracket === 'custom' && (
                <div className="flex items-center gap-2 text-xs bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">อายุระหว่าง:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="ต่ำสุด"
                    value={customAgeMin}
                    onChange={(e) => {
                      setCustomAgeMin(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-slate-500">-</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="สูงสุด"
                    value={customAgeMax}
                    onChange={(e) => {
                      setCustomAgeMax(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-slate-400">ปี</span>
                </div>
              )}
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
                <span>เมทริกซ์ไขว้ (Cross-Tabulation)</span>
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

            {/* TAB 1: DASHBOARD (จำแนกตามประเภท, หมวดหมู่, ปีงบประมาณ, อายุใช้งาน) */}
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
                        <div
                          key={t.type}
                          onClick={() => {
                            setSelectedType(t.type);
                            setActiveTab('table');
                          }}
                          className="group cursor-pointer"
                        >
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

                  {/* Card 2: สถิติตามช่วงอายุการใช้งาน (By Equipment Lifecycle Age) */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">สถานะอายุการใช้งานครุภัณฑ์</h3>
                          <p className="text-xs text-slate-400">เกณฑ์การประเมินสภาพและวางแผนจัดซื้อทดแทน</p>
                        </div>
                      </div>
                      <span className="text-xs text-emerald-400 font-mono">
                        ปีงบ 2569
                      </span>
                    </div>

                    <div className="space-y-4">
                      {parseResult.byAge.map((a) => {
                        const is1To7 = a.bracket === '1-7';
                        const is7To14 = a.bracket === '7-14';
                        const is14Plus = a.bracket === '14+';

                        let barColor = 'from-slate-600 to-slate-400';
                        let textColor = 'text-slate-300';
                        if (is1To7) {
                          barColor = 'from-emerald-500 to-teal-400';
                          textColor = 'text-emerald-400';
                        } else if (is7To14) {
                          barColor = 'from-amber-500 to-yellow-400';
                          textColor = 'text-amber-400';
                        } else if (is14Plus) {
                          barColor = 'from-red-500 to-rose-400';
                          textColor = 'text-red-400';
                        }

                        return (
                          <div
                            key={a.bracket}
                            onClick={() => {
                              setSelectedAgeBracket(a.bracket);
                              setActiveTab('table');
                            }}
                            className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition cursor-pointer group"
                          >
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className={`font-bold ${textColor} flex items-center gap-2`}>
                                <span className={`w-2 h-2 rounded-full ${is1To7 ? 'bg-emerald-400' : is7To14 ? 'bg-amber-400' : is14Plus ? 'bg-red-400' : 'bg-slate-400'}`}></span>
                                <span>{a.label}</span>
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-slate-400">
                                  {a.totalValue > 0 ? `฿${a.totalValue.toLocaleString('th-TH')}` : '-'}
                                </span>
                                <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg min-w-16 text-right">
                                  {a.count} ({a.percent}%)
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
                                style={{ width: `${Math.min(100, Math.max(5, a.percent))}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
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
                        <p className="text-xs text-slate-400">จำนวนครุภัณฑ์ที่ขึ้นทะเบียนในแต่ละปีงบประมาณ (คลิกเพื่อดูรายการย่อย)</p>
                      </div>
                    </div>
                    <span className="text-xs text-amber-400 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-xl self-start sm:self-auto font-medium">
                      ครอบคลุม {parseResult.byYear.length} ปีงบประมาณ
                    </span>
                  </div>

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

            {/* TAB 2: CROSSTAB MATRIX (Type x Age OR Year x Type) */}
            {activeTab === 'crosstab' && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl overflow-hidden no-print">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>ตารางเปรียบเทียบไขว้ (Cross-Tabulation Matrix)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ดูการกระจายตัวของประเภทครุภัณฑ์เทียบกับช่วงอายุการใช้งานและปีงบประมาณ
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => setCrosstabMode('age')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          crosstabMode === 'age'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ประเภท x ช่วงอายุ
                      </button>
                      <button
                        onClick={() => setCrosstabMode('year')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          crosstabMode === 'year'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ปีงบ x ประเภท
                      </button>
                    </div>

                    <button
                      onClick={handleDownloadCsv}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลด</span>
                    </button>
                  </div>
                </div>

                {/* MATRIX 1: TYPE x AGE BRACKET */}
                {crosstabMode === 'age' && (
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                          <th className="py-3 px-3 min-w-44 sticky left-0 bg-slate-950 z-10">ประเภทครุภัณฑ์</th>
                          <th className="py-3 px-3 min-w-32">หมวดหมู่</th>
                          <th className="py-3 px-3 text-right">รวมทั้งหมด</th>
                          <th className="py-3 px-3 text-right text-emerald-400">🟢 1 - 7 ปี</th>
                          <th className="py-3 px-3 text-right text-amber-400">🟡 7 - 14 ปี</th>
                          <th className="py-3 px-3 text-right text-red-400">🔴 14 ปีขึ้นไป</th>
                          <th className="py-3 px-3 text-right text-slate-500">ไม่ระบุปี</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {parseResult.crossTabAge.map((row) => (
                          <tr key={row.type} className="hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-3 font-bold text-white sticky left-0 bg-slate-900 z-10">
                              {row.type}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">{row.category}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                              {row.total}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                              {row.age1To7 > 0 ? row.age1To7 : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                              {row.age7To14 > 0 ? row.age7To14 : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-red-400">
                              {row.age14Plus > 0 ? row.age14Plus : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              {row.unknownAge > 0 ? row.unknownAge : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-950 font-bold text-white border-t-2 border-slate-700">
                          <td colSpan={2} className="py-3 px-3 sticky left-0 bg-slate-950 z-10">
                            รวมทุกประเภท
                          </td>
                          <td className="py-3 px-3 text-right text-amber-400 font-mono">
                            {parseResult.summary.totalCount}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-400 font-mono">
                            {parseResult.summary.age1To7Count}
                          </td>
                          <td className="py-3 px-3 text-right text-amber-400 font-mono">
                            {parseResult.summary.age7To14Count}
                          </td>
                          <td className="py-3 px-3 text-right text-red-400 font-mono">
                            {parseResult.summary.age14PlusCount}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-500 font-mono">
                            {parseResult.summary.unknownAgeCount}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* MATRIX 2: YEAR x TYPE */}
                {crosstabMode === 'year' && (
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
                )}
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
                      placeholder="ค้นหารหัสครุภัณฑ์, ชื่อรุ่น, หน่วยงาน, เอกสาร, ไฟล์..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  {/* Multi-Filter Dropdowns */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Age Bracket Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">ช่วงอายุ:</span>
                      <select
                        value={selectedAgeBracket}
                        onChange={(e) => {
                          setSelectedAgeBracket(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                      >
                        <option value="all">ทุกช่วงอายุ</option>
                        <option value="1-7">🟢 1 - 7 ปี (ปกติ)</option>
                        <option value="7-14">🟡 7 - 14 ปี (เสื่อมสภาพ)</option>
                        <option value="14+">🔴 14 ปีขึ้นไป (รอจำหน่าย)</option>
                        <option value="custom">กำหนดช่วงปีเอง</option>
                      </select>
                    </div>

                    {/* Source File Filter (If multiple files loaded) */}
                    {parseResult.availableFiles && parseResult.availableFiles.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">ไฟล์:</span>
                        <select
                          value={selectedSourceFile}
                          onChange={(e) => {
                            setSelectedSourceFile(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 max-w-40 truncate"
                        >
                          <option value="all">ทุกไฟล์ ({parseResult.availableFiles.length})</option>
                          {parseResult.availableFiles.map((fn) => (
                            <option key={fn} value={fn}>
                              {fn}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

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
                        <option value="all">ทุกปี</option>
                        {parseResult.availableYears.map((y) => (
                          <option key={y} value={y}>
                            ปี {y}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reset button */}
                    {(selectedYear !== 'all' ||
                      selectedType !== 'all' ||
                      selectedCategory !== 'all' ||
                      selectedAgeBracket !== 'all' ||
                      selectedSourceFile !== 'all' ||
                      searchQuery) && (
                      <button
                        onClick={() => {
                          setSelectedYear('all');
                          setSelectedType('all');
                          setSelectedCategory('all');
                          setSelectedAgeBracket('all');
                          setSelectedSourceFile('all');
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
                        <th className="py-3 px-3 min-w-32">ประเภท</th>
                        <th className="py-3 px-2 text-center">ปีงบ</th>
                        <th className="py-3 px-3 text-center">อายุใช้งาน</th>
                        <th className="py-3 px-3 text-center">สถานะอายุ</th>
                        <th className="py-3 px-3 min-w-36">หน่วยงาน</th>
                        <th className="py-3 px-3 text-right">ราคา/หน่วย</th>
                        <th className="py-3 px-3 min-w-28">เอกสาร</th>
                        {parseResult.sourceType === 'excel' && (
                          <th className="py-3 px-3 min-w-32">ไฟล์ต้นทาง</th>
                        )}
                        <th className="py-3 px-3 min-w-32">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {paginatedItems.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-12 text-center text-slate-500">
                            ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
                          </td>
                        </tr>
                      ) : (
                        paginatedItems.map((item, idx) => {
                          const is1To7 = item.ageBracket === '1-7';
                          const is7To14 = item.ageBracket === '7-14';
                          const is14Plus = item.ageBracket === '14+';

                          return (
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
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                                {item.ageYears > 0 ? `${item.ageYears} ปี` : item.year !== 'ไม่ระบุปี' ? '0 ปี' : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    is1To7
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                      : is7To14
                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                      : is14Plus
                                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                      : 'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}
                                >
                                  {item.ageStatusLabel || 'ไม่ระบุปี'}
                                </span>
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
                              {parseResult.sourceType === 'excel' && (
                                <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-32" title={item.sourceFile}>
                                  {item.sourceFile || '-'}
                                </td>
                              )}
                              <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-36" title={item.remark}>
                                {item.remark || '-'}
                              </td>
                            </tr>
                          );
                        })
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

            {/* TAB 4: A4 PRINTABLE REPORT (พร้อมส่งออกและสั่งพิมพ์) */}
            {activeTab === 'report' && (
              <div className="space-y-6">
                {/* Print Control Toolbar (Hidden in print) */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                  <div className="flex items-center gap-2">
                    <Printer className="w-5 h-5 text-blue-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">มุมมองตัวอย่างพิมพ์รายงาน A4 แนวนอน</h4>
                      <p className="text-xs text-slate-400">
                        จัดรูปแบบเอกสารราชการมาตรฐาน จำแนกประเภทและอายุการใช้งาน พร้อมส่วนลงนาม
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

                {/* Printable Document Sheet */}
                <div className="print-report-container bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-2xl border border-slate-200 font-sans print:shadow-none print:border-none print:p-0">
                  {/* Document Header */}
                  <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
                      รายงานสรุปการสำรวจและวิเคราะห์อายุครุภัณฑ์คอมพิวเตอร์และสารสนเทศ
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      แหล่งข้อมูล: {parseResult.fileName} • เกณฑ์ปีงบประมาณ 2569 • ข้อมูล ณ วันที่{' '}
                      {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
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

                  {/* Section A: Lifecycle Age Breakdown */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-900 mb-2 border-b border-slate-300 pb-1">
                      1. สรุปสถานะอายุการใช้งานครุภัณฑ์ (Equipment Lifecycle Breakdown)
                    </h3>
                    <table className="w-full text-xs border border-slate-300 border-collapse">
                      <thead>
                        <tr className="bg-slate-200 text-slate-800">
                          <th className="border border-slate-300 p-2 text-center w-12">ลำดับ</th>
                          <th className="border border-slate-300 p-2 text-left">ช่วงอายุการใช้งาน</th>
                          <th className="border border-slate-300 p-2 text-left">เกณฑ์การประเมิน</th>
                          <th className="border border-slate-300 p-2 text-right w-28">จำนวน (รายการ)</th>
                          <th className="border border-slate-300 p-2 text-right w-24">สัดส่วน (%)</th>
                          <th className="border border-slate-300 p-2 text-right w-36">มูลค่ารวม (บาท)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.byAge.map((a, idx) => (
                          <tr key={a.bracket} className="hover:bg-slate-50">
                            <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                            <td className="border border-slate-300 p-1.5 font-bold">{a.label}</td>
                            <td className="border border-slate-300 p-1.5 text-slate-600">
                              {a.bracket === '1-7'
                                ? 'อุปกรณ์อยู่ในเกณฑ์ปกติ มีประสิทธิภาพพร้อมใช้งาน'
                                : a.bracket === '7-14'
                                ? 'อุปกรณ์เริ่มเสื่อมสภาพ ควรตรวจสอบและเตรียมแผนทดแทน'
                                : a.bracket === '14+'
                                ? 'เกินอายุมาตรฐานราชการ ควรจำหน่ายและจัดหาใหม่'
                                : 'ไม่สามารถระบุปีจัดซื้อได้'}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">
                              {a.count.toLocaleString()}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-right font-mono">{a.percent}%</td>
                            <td className="border border-slate-300 p-1.5 text-right font-mono font-semibold">
                              {a.totalValue > 0 ? `฿${a.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold">
                          <td colSpan={3} className="border border-slate-300 p-2 text-center">รวมทั้งสิ้น</td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                            {parseResult.summary.totalCount.toLocaleString()}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold">100.0%</td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                            ฿{parseResult.summary.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Section B: Breakdown by Type */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-900 mb-2 border-b border-slate-300 pb-1">
                      2. สรุปจำแนกตามประเภทครุภัณฑ์
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

                  {/* Section C: Breakdown by Year */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-900 mb-2 border-b border-slate-300 pb-1">
                      3. สรุปจำแนกตามปีงบประมาณ
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
