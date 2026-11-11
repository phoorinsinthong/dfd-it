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
  FolderArchive,
  Scale,
  ArrowLeftRight,
} from 'lucide-react';
import {
  BakParseResult,
  BakEquipmentItem,
  AgeBracket,
  ReconciliationStatus,
  ReconciliationResult,
  ReconciliationItem,
} from '@/types/bak-equipment';
import {
  parseBakBuffer,
  parseExcelFiles,
  generateBakCsvReport,
  isWarehouse12,
  filterReportItems,
  countWarehouse12Excluded,
  normalizeEquipmentCode,
  reconcileEquipmentData,
  generateReconciliationCsv,
} from '@/lib/services/bak-parser-service';
import sampleBakData from '@/lib/data/sample-bak-data.json';

export default function BakAnalysisPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [parseResult, setParseResult] = useState<BakParseResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Source Type Selector: .bak vs Excel vs Compare (Reconciliation)
  const [sourceMode, setSourceMode] = useState<'bak' | 'excel' | 'compare'>('bak');
  const [bakParseResult, setBakParseResult] = useState<BakParseResult | null>(null);
  const [excelParseResult, setExcelParseResult] = useState<BakParseResult | null>(null);

  // Reconciliation Filters & Pagination (.bak vs Excel)
  const [reconcileFilter, setReconcileFilter] = useState<'all' | 'matched' | 'discrepancy' | 'only_bak' | 'only_excel'>('all');
  const [reconcileSearch, setReconcileSearch] = useState<string>('');
  const [reconcilePage, setReconcilePage] = useState<number>(1);
  const reconcilePageSize = 25;

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

  // Report-Specific Custom Filters
  const [reportCategory, setReportCategory] = useState<string>('all');
  const [reportType, setReportType] = useState<string>('all');
  const [reportAgeFilterMode, setReportAgeFilterMode] = useState<'bracket' | 'yearRange'>('bracket');
  const [reportAgeBracket, setReportAgeBracket] = useState<string>('all');
  const [reportYearStart, setReportYearStart] = useState<string>('');
  const [reportYearEnd, setReportYearEnd] = useState<string>('');
  const [reportRowLimit, setReportRowLimit] = useState<string>('all');
  const [reportExcludeWarehouse12, setReportExcludeWarehouse12] = useState<boolean>(true);
  // .bak Specific Report Filters: Status = "ปกติ", Procurement = "all" (Default)
  const [reportBakStatus, setReportBakStatus] = useState<string>('ปกติ');
  const [reportBakProcurement, setReportBakProcurement] = useState<string>('all');
  const [reportBakIncludeDeptMatch, setReportBakIncludeDeptMatch] = useState<boolean>(true);

  // Search Table Filters for Status & Procurement (.bak)
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProcurement, setSelectedProcurement] = useState<string>('all');

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
      const data = { ...(sampleBakData as unknown as BakParseResult) };
      data.byAge = data.byAge || [];
      data.crossTabAge = data.crossTabAge || [];
      data.summary = {
        ...data.summary,
        age1To7Count: data.summary?.age1To7Count ?? 0,
        age1To7Value: data.summary?.age1To7Value ?? 0,
        age7To14Count: data.summary?.age7To14Count ?? 0,
        age7To14Value: data.summary?.age7To14Value ?? 0,
        age14PlusCount: data.summary?.age14PlusCount ?? 0,
        age14PlusValue: data.summary?.age14PlusValue ?? 0,
        unknownAgeCount: data.summary?.unknownAgeCount ?? 0,
      };
      setBakParseResult(data);
      setParseResult(data);
    }
  }, []);

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
          setBakParseResult(json.data);
          if (sourceMode === 'bak' || sourceMode === 'compare') {
            setParseResult(json.data);
          }
          setSuccessMsg(`ประมวลผลไฟล์ "${file.name}" สำเร็จ พบครุภัณฑ์ ${json.data.items.length} รายการ`);
        } else {
          setErrorMsg(json.error || 'ไม่พบโครงสร้างข้อมูลครุภัณฑ์ที่รองรับในไฟล์ .bak นี้');
        }
      } else {
        setBakParseResult(result);
        if (sourceMode === 'bak' || sourceMode === 'compare') {
          setParseResult(result);
        }
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
        setExcelParseResult(json.data);
        if (sourceMode === 'excel') {
          setParseResult(json.data);
        }
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
        setBakParseResult(json.data);
        if (sourceMode === 'bak' || sourceMode === 'compare') {
          setParseResult(json.data);
        }
        setSuccessMsg(`โหลดข้อมูลตัวอย่าง .bak "${json.data.fileName}" สำเร็จ (${json.data.items.length} รายการ)`);
      } else {
        const fallback = sampleBakData as unknown as BakParseResult;
        setBakParseResult(fallback);
        if (sourceMode === 'bak' || sourceMode === 'compare') setParseResult(fallback);
        setSuccessMsg('โหลดข้อมูลตัวอย่าง .bak จาก Cache สำเร็จ');
      }
      setCurrentPage(1);
    } catch {
      const fallback = sampleBakData as unknown as BakParseResult;
      setBakParseResult(fallback);
      if (sourceMode === 'bak' || sourceMode === 'compare') setParseResult(fallback);
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
        setExcelParseResult(json.data);
        if (sourceMode === 'excel') {
          setParseResult(json.data);
        }
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

  // Load Sample for Comparison Mode (both .bak and Excel)
  const handleLoadCompareSample = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/bak-parser?sample=compare');
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.bak) {
          setBakParseResult(json.data.bak);
          if (sourceMode === 'bak') setParseResult(json.data.bak);
        }
        if (json.data.excel) {
          setExcelParseResult(json.data.excel);
          if (sourceMode === 'excel') setParseResult(json.data.excel);
        }
        setSuccessMsg(
          `โหลดข้อมูลตัวอย่างกระทบยอด 2 แหล่งสำเร็จ (.bak ${json.data.bak?.items?.length || 0} รายการ, Excel ${json.data.excel?.items?.length || 0} รายการ)`
        );
      } else {
        // Fallback: load both individually
        await handleLoadSampleBak();
        await handleLoadSampleExcel();
      }
      setReconcilePage(1);
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการโหลดตัวอย่างเปรียบเทียบ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Switch Data Source Mode
  const handleSwitchSourceMode = (mode: 'bak' | 'excel' | 'compare') => {
    setSourceMode(mode);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (mode === 'bak') {
      if (bakParseResult) {
        setParseResult(bakParseResult);
      }
    } else if (mode === 'excel') {
      if (excelParseResult) {
        setParseResult(excelParseResult);
      } else {
        handleLoadSampleExcel();
      }
    } else if (mode === 'compare') {
      if (!excelParseResult) {
        handleLoadSampleExcel();
      }
      if (!bakParseResult) {
        handleLoadSampleBak();
      }
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

      // Status Filter (.bak)
      if (selectedStatus !== 'all') {
        const matchesStatus =
          item.statusName === selectedStatus ||
          (selectedStatus === 'ปกติ' && (item.statusId === 1 || item.statusName === 'ใช้งานปกติ')) ||
          (selectedStatus === 'ส่งซ่อม' && item.statusId === 2) ||
          (selectedStatus === 'ส่งคืน' && item.statusId === 3);
        if (!matchesStatus) return false;
      }

      // Procurement Filter (.bak)
      if (selectedProcurement !== 'all') {
        const matchesProc =
          item.procurementName === selectedProcurement ||
          (selectedProcurement === 'ทสอ.' && (item.procurementId === 1 || item.procurementName?.startsWith('ทสอ'))) ||
          (selectedProcurement === 'กง.กห.' && (item.procurementId === 2 || item.procurementName === 'กง.กห.' || item.deptName?.includes('กง.กห.'))) ||
          (selectedProcurement === 'สม.' && (item.procurementId === 3 || item.procurementName === 'สม.'));
        if (!matchesProc) return false;
      }

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
    selectedStatus,
    selectedProcurement,
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

  // Cascading Types for Report Category
  const availableTypesForCategory = useMemo(() => {
    if (!parseResult) return [];
    if (reportCategory === 'all') return parseResult.availableTypes;
    const typesInCat = new Set(
      parseResult.items
        .filter((item) => item.category === reportCategory)
        .map((item) => item.type)
    );
    return Array.from(typesInCat).sort();
  }, [parseResult, reportCategory]);

  const handleReportCategoryChange = (cat: string) => {
    setReportCategory(cat);
    setReportType('all');
  };

  // Whether the current active dataset is from Excel
  const isExcelSource = parseResult?.sourceType === 'excel';

  // Count of items located in "คลัง 12" that are excluded from Excel reports under current filters
  const warehouse12ExcludedCount = useMemo(() => {
    if (!parseResult || !isExcelSource) return 0;
    return countWarehouse12Excluded(parseResult.items, {
      category: reportCategory,
      type: reportType,
      ageBracket: reportAgeFilterMode === 'bracket' ? reportAgeBracket : undefined,
      yearStart: reportAgeFilterMode === 'yearRange' ? reportYearStart : undefined,
      yearEnd: reportAgeFilterMode === 'yearRange' ? reportYearEnd : undefined,
      isExcelSource,
    });
  }, [
    parseResult,
    isExcelSource,
    reportCategory,
    reportType,
    reportAgeFilterMode,
    reportAgeBracket,
    reportYearStart,
    reportYearEnd,
  ]);

  // Filtered Items for A4 Printable Report (sorted oldest-first, Warehouse 12 toggleable, .bak status & procurement filtered)
  const reportFilteredItems = useMemo(() => {
    if (!parseResult) return [];

    return filterReportItems(parseResult.items, {
      category: reportCategory,
      type: reportType,
      ageBracket: reportAgeFilterMode === 'bracket' ? reportAgeBracket : undefined,
      yearStart: reportAgeFilterMode === 'yearRange' ? reportYearStart : undefined,
      yearEnd: reportAgeFilterMode === 'yearRange' ? reportYearEnd : undefined,
      isExcelSource,
      excludeWarehouse12ForExcel: reportExcludeWarehouse12,
      bakStatusFilter: reportBakStatus,
      bakProcurementFilter: reportBakProcurement,
      bakIncludeDeptMatch: reportBakIncludeDeptMatch,
    });
  }, [
    parseResult,
    isExcelSource,
    reportCategory,
    reportType,
    reportAgeFilterMode,
    reportAgeBracket,
    reportYearStart,
    reportYearEnd,
    reportExcludeWarehouse12,
    reportBakStatus,
    reportBakProcurement,
    reportBakIncludeDeptMatch,
  ]);

  // Display items considering print row limit
  const reportDisplayItems = useMemo(() => {
    if (reportRowLimit === 'all') return reportFilteredItems;
    const limit = parseInt(reportRowLimit, 10);
    return isNaN(limit) ? reportFilteredItems : reportFilteredItems.slice(0, limit);
  }, [reportFilteredItems, reportRowLimit]);

  // Report Summary Metrics & Breakdown for Filtered Scope
  const reportSummary = useMemo(() => {
    const totalCount = reportFilteredItems.length;
    let totalValue = 0;
    let age1To7Count = 0;
    let age1To7Value = 0;
    let age7To14Count = 0;
    let age7To14Value = 0;
    let age14PlusCount = 0;
    let age14PlusValue = 0;
    let unknownAgeCount = 0;
    let maxAge = 0;
    let sumAge = 0;
    let ageCountValid = 0;

    for (const item of reportFilteredItems) {
      totalValue += item.price || 0;
      if (item.ageBracket === '1-7') {
        age1To7Count++;
        age1To7Value += item.price || 0;
      } else if (item.ageBracket === '7-14') {
        age7To14Count++;
        age7To14Value += item.price || 0;
      } else if (item.ageBracket === '14+') {
        age14PlusCount++;
        age14PlusValue += item.price || 0;
      } else {
        unknownAgeCount++;
      }

      if (item.ageYears > 0) {
        if (item.ageYears > maxAge) maxAge = item.ageYears;
        sumAge += item.ageYears;
        ageCountValid++;
      }
    }

    const avgAge = ageCountValid > 0 ? (sumAge / ageCountValid).toFixed(1) : '0';

    const ageBreakdown = [
      {
        bracket: '1-7' as AgeBracket,
        label: '1 - 7 ปี (ใช้งานปกติ 🟢)',
        desc: 'อุปกรณ์อยู่ในเกณฑ์ปกติ มีประสิทธิภาพพร้อมใช้งาน',
        count: age1To7Count,
        percent: totalCount > 0 ? Math.round((age1To7Count / totalCount) * 1000) / 10 : 0,
        totalValue: age1To7Value,
      },
      {
        bracket: '7-14' as AgeBracket,
        label: '7 - 14 ปี (เริ่มเสื่อมสภาพ 🟡)',
        desc: 'อุปกรณ์เริ่มเสื่อมสภาพ ควรตรวจสอบและเตรียมแผนทดแทน',
        count: age7To14Count,
        percent: totalCount > 0 ? Math.round((age7To14Count / totalCount) * 1000) / 10 : 0,
        totalValue: age7To14Value,
      },
      {
        bracket: '14+' as AgeBracket,
        label: '14 ปีขึ้นไป (เกินเกณฑ์/รอจำหน่าย 🔴)',
        desc: 'เกินอายุมาตรฐานราชการ ควรพิจารณาจำหน่ายและจัดหาใหม่',
        count: age14PlusCount,
        percent: totalCount > 0 ? Math.round((age14PlusCount / totalCount) * 1000) / 10 : 0,
        totalValue: age14PlusValue,
      },
    ];

    if (unknownAgeCount > 0) {
      ageBreakdown.push({
        bracket: 'unknown' as AgeBracket,
        label: 'ไม่ระบุปีงบประมาณ',
        desc: 'ไม่พบข้อมูลปีที่จัดซื้อในเอกสารต้นทาง',
        count: unknownAgeCount,
        percent: totalCount > 0 ? Math.round((unknownAgeCount / totalCount) * 1000) / 10 : 0,
        totalValue: 0,
      });
    }

    return {
      totalCount,
      totalValue,
      maxAge,
      avgAge,
      age1To7Count,
      age1To7Value,
      age7To14Count,
      age7To14Value,
      age14PlusCount,
      age14PlusValue,
      unknownAgeCount,
      ageBreakdown,
    };
  }, [reportFilteredItems]);

  // Dynamic Dashboard Breakdowns (Synchronized 100% with Report Filters)
  const dashboardByType = useMemo(() => {
    const typeMap = new Map<string, { count: number; totalValue: number; category: string }>();
    for (const item of reportFilteredItems) {
      const t = item.type || 'ไม่ระบุประเภท';
      const existing = typeMap.get(t) || { count: 0, totalValue: 0, category: item.category };
      existing.count += 1;
      existing.totalValue += item.price || 0;
      typeMap.set(t, existing);
    }
    const total = reportFilteredItems.length;
    return Array.from(typeMap.entries())
      .map(([type, data]) => ({
        type,
        category: data.category,
        count: data.count,
        totalValue: data.totalValue,
        percent: total > 0 ? Math.round((data.count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [reportFilteredItems]);

  const dashboardByCategory = useMemo(() => {
    const catMap = new Map<string, { count: number; totalValue: number }>();
    for (const item of reportFilteredItems) {
      const c = item.category || 'ไม่ระบุหมวดหมู่';
      const existing = catMap.get(c) || { count: 0, totalValue: 0 };
      existing.count += 1;
      existing.totalValue += item.price || 0;
      catMap.set(c, existing);
    }
    const total = reportFilteredItems.length;
    return Array.from(catMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        totalValue: data.totalValue,
        percent: total > 0 ? Math.round((data.count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [reportFilteredItems]);

  const dashboardByYear = useMemo(() => {
    const yearMap = new Map<string, { count: number; totalValue: number }>();
    for (const item of reportFilteredItems) {
      const y = item.year || 'ไม่ระบุปี';
      const existing = yearMap.get(y) || { count: 0, totalValue: 0 };
      existing.count += 1;
      existing.totalValue += item.price || 0;
      yearMap.set(y, existing);
    }
    const total = reportFilteredItems.length;
    return Array.from(yearMap.entries())
      .map(([year, data]) => ({
        year,
        count: data.count,
        totalValue: data.totalValue,
        percent: total > 0 ? Math.round((data.count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => {
        const nA = parseInt(a.year, 10) || 0;
        const nB = parseInt(b.year, 10) || 0;
        return nB - nA;
      });
  }, [reportFilteredItems]);

  // Reconciliation between .bak and Excel Data Sources
  const reconciliationResult = useMemo<ReconciliationResult>(() => {
    const bakItems = bakParseResult?.items || [];
    const excelItems = excelParseResult?.items || [];
    return reconcileEquipmentData(bakItems, excelItems);
  }, [bakParseResult, excelParseResult]);

  // Filtered Reconciliation Items
  const filteredReconciliationItems = useMemo(() => {
    return reconciliationResult.items.filter((item) => {
      if (reconcileFilter !== 'all' && item.status !== reconcileFilter) return false;
      if (reconcileSearch.trim()) {
        const q = reconcileSearch.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(q) || item.normalizedCode.toLowerCase().includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        const matchType = (item.type || '').toLowerCase().includes(q);
        const matchDeptBak = (item.bakItem?.deptName || '').toLowerCase().includes(q);
        const matchDeptExcel = (item.excelItem?.deptName || '').toLowerCase().includes(q);
        const matchSerialBak = (item.bakItem?.serial || '').toLowerCase().includes(q);
        const matchSerialExcel = (item.excelItem?.serial || '').toLowerCase().includes(q);
        return matchCode || matchName || matchType || matchDeptBak || matchDeptExcel || matchSerialBak || matchSerialExcel;
      }
      return true;
    });
  }, [reconciliationResult, reconcileFilter, reconcileSearch]);

  // Paginated Reconciliation Items
  const paginatedReconciliationItems = useMemo(() => {
    const start = (reconcilePage - 1) * reconcilePageSize;
    return filteredReconciliationItems.slice(start, start + reconcilePageSize);
  }, [filteredReconciliationItems, reconcilePage, reconcilePageSize]);

  const reconcileTotalPages = Math.ceil(filteredReconciliationItems.length / reconcilePageSize) || 1;

  // Export CSV for Reconciliation
  const handleDownloadReconciliationCsv = () => {
    if (!reconciliationResult || reconciliationResult.items.length === 0) return;
    const csvContent = generateReconciliationCsv(reconciliationResult);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'DFD_Equipment_Reconciliation_Bak_vs_Excel.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV for Report Tab (Exact filtered and oldest-first sorted items)
  const handleDownloadReportCsv = () => {
    if (!reportFilteredItems || reportFilteredItems.length === 0) return;
    const csvContent = generateBakCsvReport(reportFilteredItems);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const catSuffix = reportCategory !== 'all' ? `_${reportCategory}` : '';
    const typeSuffix = reportType !== 'all' ? `_${reportType}` : '';
    link.setAttribute('download', `DFD_Equipment_Report${catSuffix}${typeSuffix}_OldestFirst.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportAgeFilterDescription = useMemo(() => {
    if (reportAgeFilterMode === 'bracket') {
      if (reportAgeBracket === '1-7') return 'อายุ 1 - 7 ปี (ใช้งานปกติ 🟢)';
      if (reportAgeBracket === '7-14') return 'อายุ 7 - 14 ปี (เริ่มเสื่อมสภาพ 🟡)';
      if (reportAgeBracket === '14+') return 'อายุ 14 ปีขึ้นไป (เกินเกณฑ์/รอจำหน่าย 🔴)';
      if (reportAgeBracket === 'unknown') return 'ไม่ระบุปีงบประมาณ';
      return 'ทุกช่วงอายุ';
    } else {
      if (reportYearStart && reportYearEnd) return `ปีงบประมาณ พ.ศ. ${reportYearStart} - ${reportYearEnd}`;
      if (reportYearStart) return `ตั้งแต่ปีงบประมาณ พ.ศ. ${reportYearStart} ขึ้นไป`;
      if (reportYearEnd) return `ถึงปีงบประมาณ พ.ศ. ${reportYearEnd}`;
      return 'ทุกปีงบประมาณ';
    }
  }, [reportAgeFilterMode, reportAgeBracket, reportYearStart, reportYearEnd]);

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  // Auth Guards (Rendered after all hooks to strictly adhere to React Rules of Hooks)
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
            <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 flex-wrap">
              <button
                type="button"
                onClick={() => handleSwitchSourceMode('bak')}
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
                onClick={() => handleSwitchSourceMode('excel')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                  sourceMode === 'excel'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>ไฟล์ทะเบียน Excel (รวมหลายไฟล์ .xls, .xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchSourceMode('compare')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                  sourceMode === 'compare'
                    ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>แบบรวม / ตรวจสอบความตรงกัน (.bak vs Excel)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                  Reconciliation
                </span>
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
                ? 'border-purple-400 bg-purple-950/20 scale-[1.01]'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
            }`}
          >
            {sourceMode === 'compare' ? (
              <div className="w-full space-y-4">
                {/* One-click Load Both Sample Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-blue-950/40 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>โหมดตรวจสอบและกระทบยอดบัญชีครุภัณฑ์ (.bak vs Excel)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-normal">
                          Dual-Source Audit
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300">
                        จับคู่รหัสครุภัณฑ์ (EquipmentCode) ตรวจสอบความตรงกันและชี้เป้าความขัดแย้งของข้อมูลอัตโนมัติ
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadCompareSample}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>⚡ โหลดชุดตัวอย่างทั้ง .bak + Excel ทันที</span>
                  </button>
                </div>

                {/* Dual Ingestion Grid: Left = .bak, Right = Excel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  {/* Left: .bak Source */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <Database className="w-4 h-4" />
                          <span>แหล่งที่ 1: ไฟล์สำรอง .bak (SQL Server)</span>
                        </span>
                        {bakParseResult ? (
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>โหลดแล้ว ({bakParseResult.items.length} รายการ)</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400/80 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            ยังไม่โหลด
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mb-3 truncate">
                        {bakParseResult ? `ไฟล์: ${bakParseResult.fileName}` : 'ลากไฟล์ .bak มาวาง หรือกดเลือกไฟล์จากเครื่อง'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <button
                        type="button"
                        onClick={() => bakFileInputRef.current?.click()}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition"
                      >
                        {bakParseResult ? 'เปลี่ยนไฟล์ .bak' : 'เลือกไฟล์ .bak'}
                      </button>
                      {!bakParseResult && (
                        <button
                          type="button"
                          onClick={handleLoadSampleBak}
                          disabled={loading}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                        >
                          ใช้ตัวอย่าง .bak
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: Excel Source */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>แหล่งที่ 2: ทะเบียนพัสดุ Excel (.xls, .xlsx)</span>
                        </span>
                        {excelParseResult ? (
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>โหลดแล้ว ({excelParseResult.items.length} รายการ)</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-400/80 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            ยังไม่โหลด
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mb-3 truncate">
                        {excelParseResult
                          ? `รวม ${excelParseResult.availableFiles?.length || 1} ไฟล์ Excel (${excelParseResult.items.length} รายการ)`
                          : 'เลือกไฟล์ Excel ได้หลายไฟล์พร้อมกัน'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <button
                        type="button"
                        onClick={() => excelFileInputRef.current?.click()}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition"
                      >
                        {excelParseResult ? 'เปลี่ยนไฟล์ Excel' : 'เลือกไฟล์ Excel'}
                      </button>
                      {!excelParseResult && (
                        <button
                          type="button"
                          onClick={handleLoadSampleExcel}
                          disabled={loading}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                        >
                          ใช้ตัวอย่าง Excel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : sourceMode === 'bak' ? (
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
            {/* KPI Cards: Either Reconciliation KPIs (compare mode) or Synchronized Lifecycle KPIs (standard mode) */}
            {sourceMode === 'compare' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 mb-8 no-print">
                {/* Compare KPI 1: ครุภัณฑ์ทั้งหมด */}
                <div
                  onClick={() => {
                    setReconcileFilter('all');
                    setReconcilePage(1);
                  }}
                  className={`rounded-2xl p-4 border transition cursor-pointer group ${
                    reconcileFilter === 'all'
                      ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/20'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <Package className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      Total
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">รหัสครุภัณฑ์รวม (2 แหล่ง)</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-white">
                      {reconciliationResult.totalUnique.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500">รหัส</span>
                  </div>
                  <p className="text-[10px] text-purple-300 mt-1 truncate">
                    .bak: {bakParseResult?.items?.length || 0} | Excel: {excelParseResult?.items?.length || 0}
                  </p>
                </div>

                {/* Compare KPI 2: ตรงกันทั้ง 2 แหล่ง 🟢 */}
                <div
                  onClick={() => {
                    setReconcileFilter('matched');
                    setReconcilePage(1);
                  }}
                  className={`rounded-2xl p-4 border transition cursor-pointer group ${
                    reconcileFilter === 'matched'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/20'
                      : 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ตรงกัน 🟢
                    </span>
                  </div>
                  <p className="text-xs text-emerald-300/80 mb-1">ตรงกันทั้ง 2 แหล่ง</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-emerald-400">
                      {reconciliationResult.matchedCount.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-emerald-400/80 font-mono">
                      {reconciliationResult.totalUnique > 0
                        ? `${Math.round((reconciliationResult.matchedCount / reconciliationResult.totalUnique) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">ข้อมูลหลักตรงกันสมบูรณ์</p>
                </div>

                {/* Compare KPI 3: ข้อมูลขัดแย้ง 🟡 */}
                <div
                  onClick={() => {
                    setReconcileFilter('discrepancy');
                    setReconcilePage(1);
                  }}
                  className={`rounded-2xl p-4 border transition cursor-pointer group ${
                    reconcileFilter === 'discrepancy'
                      ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/20'
                      : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ขัดแย้ง 🟡
                    </span>
                  </div>
                  <p className="text-xs text-amber-300/80 mb-1">ข้อมูลไม่ตรงกัน</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-amber-400">
                      {reconciliationResult.discrepancyCount.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-amber-400/80 font-mono">
                      {reconciliationResult.totalUnique > 0
                        ? `${Math.round((reconciliationResult.discrepancyCount / reconciliationResult.totalUnique) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">รหัสตรงแต่รายละเอียดต่าง</p>
                </div>

                {/* Compare KPI 4: มีเฉพาะใน .bak 🔵 */}
                <div
                  onClick={() => {
                    setReconcileFilter('only_bak');
                    setReconcilePage(1);
                  }}
                  className={`rounded-2xl p-4 border transition cursor-pointer group ${
                    reconcileFilter === 'only_bak'
                      ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/20'
                      : 'bg-blue-950/20 border-blue-500/30 hover:border-blue-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      เฉพาะ .bak 🔵
                    </span>
                  </div>
                  <p className="text-xs text-blue-300/80 mb-1">มีเฉพาะในฐาน .bak</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-blue-400">
                      {reconciliationResult.onlyBakCount.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-blue-400/80 font-mono">
                      {reconciliationResult.totalUnique > 0
                        ? `${Math.round((reconciliationResult.onlyBakCount / reconciliationResult.totalUnique) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">ไม่พบในไฟล์ Excel</p>
                </div>

                {/* Compare KPI 5: มีเฉพาะใน Excel 🟣 */}
                <div
                  onClick={() => {
                    setReconcileFilter('only_excel');
                    setReconcilePage(1);
                  }}
                  className={`rounded-2xl p-4 border transition cursor-pointer group ${
                    reconcileFilter === 'only_excel'
                      ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/20'
                      : 'bg-purple-950/20 border-purple-500/30 hover:border-purple-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      เฉพาะ Excel 🟣
                    </span>
                  </div>
                  <p className="text-xs text-purple-300/80 mb-1">มีเฉพาะใน Excel</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-purple-400">
                      {reconciliationResult.onlyExcelCount.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-purple-400/80 font-mono">
                      {reconciliationResult.totalUnique > 0
                        ? `${Math.round((reconciliationResult.onlyExcelCount / reconciliationResult.totalUnique) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">ไม่พบในฐาน .bak</p>
                </div>

                {/* Compare KPI 6: อัตราความสอดคล้อง 📈 */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Rate
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">อัตราความสอดคล้อง</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-white">
                      {reconciliationResult.reconciliationRate}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full"
                      style={{ width: `${Math.min(100, reconciliationResult.reconciliationRate)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 mb-8 no-print">
                {/* KPI 1: ครุภัณฑ์ทั้งหมด (Synchronized with Report Filter) */}
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
                      {(reportSummary?.totalCount ?? 0).toLocaleString()}
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
                      ฿{(reportSummary?.totalValue ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                      {dashboardByType.length}
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
                      {(reportSummary?.age1To7Count ?? 0).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-emerald-400/80 font-mono">
                      {(reportSummary?.totalCount ?? 0) > 0
                        ? `${Math.round(((reportSummary?.age1To7Count ?? 0) / reportSummary.totalCount) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">
                    ฿{(reportSummary?.age1To7Value ?? 0).toLocaleString('th-TH')}
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
                      {(reportSummary?.age7To14Count ?? 0).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-amber-400/80 font-mono">
                      {(reportSummary?.totalCount ?? 0) > 0
                        ? `${Math.round(((reportSummary?.age7To14Count ?? 0) / reportSummary.totalCount) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">
                    ฿{(reportSummary?.age7To14Value ?? 0).toLocaleString('th-TH')}
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
                      {(reportSummary?.age14PlusCount ?? 0).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-red-400/80 font-mono">
                      {(reportSummary?.totalCount ?? 0) > 0
                        ? `${Math.round(((reportSummary?.age14PlusCount ?? 0) / reportSummary.totalCount) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">
                    ฿{(reportSummary?.age14PlusValue ?? 0).toLocaleString('th-TH')}
                  </p>
                </div>
              </div>
            )}

            {/* MAIN CONTENT: Either Reconciliation Mode (.bak vs Excel) or Standard 4-Tabs View */}
            {sourceMode === 'compare' ? (
              <div className="space-y-6">
                {/* Reconciliation Toolbar (Hidden in print) */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print shadow-xl">
                  {/* Title and Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        <Scale className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>ตารางตรวจสอบความตรงกันและกระทบยอดบัญชีครุภัณฑ์ (.bak vs Excel)</span>
                          <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                            จับคู่ตามรหัสครุภัณฑ์ (Normalized Code)
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          เปรียบเทียบข้อมูลระหว่างฐานข้อมูลสำรอง .bak กับ ทะเบียนพัสดุ Excel แยกเป็น 4 กลุ่ม: ตรงกัน, ขัดแย้ง, เฉพาะ .bak, เฉพาะ Excel
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        onClick={handleDownloadReconciliationCsv}
                        disabled={reconciliationResult.items.length === 0}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                        title="ดาวน์โหลดไฟล์ CSV ผลการตรวจกระทบยอดพัสดุ (UTF-8 BOM)"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>ส่งออก CSV กระทบยอด ({filteredReconciliationItems.length})</span>
                      </button>
                      <button
                        onClick={handlePrint}
                        disabled={reconciliationResult.items.length === 0}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-purple-950/40"
                      >
                        <Printer className="w-4 h-4" />
                        <span>สั่งพิมพ์รายงานกระทบยอด (Print A4)</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills & Search Input */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Status Filter Tabs */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-slate-400 font-semibold mr-1">สถานะกระทบยอด:</span>
                      <button
                        onClick={() => {
                          setReconcileFilter('all');
                          setReconcilePage(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                          reconcileFilter === 'all'
                            ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        ทั้งหมด ({reconciliationResult.totalUnique})
                      </button>
                      <button
                        onClick={() => {
                          setReconcileFilter('matched');
                          setReconcilePage(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                          reconcileFilter === 'matched'
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-950 text-emerald-400 hover:bg-emerald-950/30 border border-emerald-500/30'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>ตรงกันทั้ง 2 แหล่ง 🟢 ({reconciliationResult.matchedCount})</span>
                      </button>
                      <button
                        onClick={() => {
                          setReconcileFilter('discrepancy');
                          setReconcilePage(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                          reconcileFilter === 'discrepancy'
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'bg-slate-950 text-amber-400 hover:bg-amber-950/30 border border-amber-500/30'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span>ข้อมูลขัดแย้ง 🟡 ({reconciliationResult.discrepancyCount})</span>
                      </button>
                      <button
                        onClick={() => {
                          setReconcileFilter('only_bak');
                          setReconcilePage(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                          reconcileFilter === 'only_bak'
                            ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                            : 'bg-slate-950 text-blue-400 hover:bg-blue-950/30 border border-blue-500/30'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span>มีเฉพาะใน .bak 🔵 ({reconciliationResult.onlyBakCount})</span>
                      </button>
                      <button
                        onClick={() => {
                          setReconcileFilter('only_excel');
                          setReconcilePage(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                          reconcileFilter === 'only_excel'
                            ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                            : 'bg-slate-950 text-purple-400 hover:bg-purple-950/30 border border-purple-500/30'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        <span>มีเฉพาะใน Excel 🟣 ({reconciliationResult.onlyExcelCount})</span>
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-64">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="ค้นหารหัส, ชื่อ, หน่วยงาน, S/N..."
                        value={reconcileSearch}
                        onChange={(e) => {
                          setReconcileSearch(e.target.value);
                          setReconcilePage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Comparison Table (Screen Display) */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl no-print overflow-hidden">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-bold text-white">
                        รายการเปรียบเทียบเคียงข้าง (Side-by-Side Comparison)
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">
                        (แสดง {paginatedReconciliationItems.length} จาก {filteredReconciliationItems.length} รายการ)
                      </span>
                    </div>

                    {/* Pagination Top Controls */}
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => setReconcilePage((p) => Math.max(1, p - 1))}
                        disabled={reconcilePage === 1}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                      >
                        ก่อนหน้า
                      </button>
                      <span className="text-slate-400 font-mono">
                        {reconcilePage} / {reconcileTotalPages}
                      </span>
                      <button
                        onClick={() => setReconcilePage((p) => Math.min(reconcileTotalPages, p + 1))}
                        disabled={reconcilePage === reconcileTotalPages}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                      >
                        ถัดไป
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/60">
                          <th className="py-3 px-3 text-center w-12">ลำดับ</th>
                          <th className="py-3 px-3 min-w-44">หมายเลขครุภัณฑ์</th>
                          <th className="py-3 px-3 min-w-52">ชื่อครุภัณฑ์ / ประเภท</th>
                          <th className="py-3 px-3 text-center min-w-36">สถานะการตรวจ</th>
                          <th className="py-3 px-3 min-w-36">ปีงบประมาณ (.bak vs Excel)</th>
                          <th className="py-3 px-3 min-w-56">หน่วยงาน / ที่ตั้ง</th>
                          <th className="py-3 px-3 text-center min-w-36">สถานะการใช้งาน</th>
                          <th className="py-3 px-3 min-w-52">ข้อแตกต่างที่พบ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {paginatedReconciliationItems.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-500">
                              ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                            </td>
                          </tr>
                        ) : (
                          paginatedReconciliationItems.map((item, idx) => {
                            const rowNo = (reconcilePage - 1) * reconcilePageSize + idx + 1;
                            const isMatched = item.status === 'matched';
                            const isDiscrepancy = item.status === 'discrepancy';
                            const isOnlyBak = item.status === 'only_bak';
                            const isOnlyExcel = item.status === 'only_excel';

                            return (
                              <tr
                                key={item.id}
                                className={`hover:bg-slate-800/40 transition ${
                                  isDiscrepancy
                                    ? 'bg-amber-950/10'
                                    : isOnlyBak
                                    ? 'bg-blue-950/10'
                                    : isOnlyExcel
                                    ? 'bg-purple-950/10'
                                    : ''
                                }`}
                              >
                                <td className="py-3 px-3 text-center font-mono text-slate-400">
                                  {rowNo}
                                </td>
                                <td className="py-3 px-3 font-mono font-medium text-white">
                                  <div className="flex flex-col">
                                    <span>{item.code}</span>
                                    {item.bakItem?.code && item.excelItem?.code && item.bakItem.code !== item.excelItem.code && (
                                      <span className="text-[10px] text-amber-400">
                                        (bak: {item.bakItem.code} | xls: {item.excelItem.code})
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-200">{item.name}</div>
                                  <div className="text-[10px] text-slate-400">{item.type}</div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {isMatched && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>ตรงกัน 🟢</span>
                                    </span>
                                  )}
                                  {isDiscrepancy && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>ข้อมูลขัดแย้ง 🟡</span>
                                    </span>
                                  )}
                                  {isOnlyBak && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                      <Database className="w-3 h-3" />
                                      <span>เฉพาะ .bak 🔵</span>
                                    </span>
                                  )}
                                  {isOnlyExcel && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                      <FileSpreadsheet className="w-3 h-3" />
                                      <span>เฉพาะ Excel 🟣</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-mono text-[11px]">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-amber-400">.bak:</span>
                                      <span className={item.bakItem?.year ? 'text-slate-200' : 'text-slate-600'}>
                                        {item.bakItem?.year || '-'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-emerald-400">Excel:</span>
                                      <span className={item.excelItem?.year ? 'text-slate-200' : 'text-slate-600'}>
                                        {item.excelItem?.year || '-'}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-[11px]">
                                  <div className="space-y-0.5 max-w-xs">
                                    {item.bakItem?.deptName && (
                                      <div className="truncate text-slate-300">
                                        <span className="text-[10px] text-amber-400 mr-1">.bak:</span>
                                        {item.bakItem.deptName}
                                      </div>
                                    )}
                                    {item.excelItem?.deptName && (
                                      <div className="truncate text-slate-300">
                                        <span className="text-[10px] text-emerald-400 mr-1">Excel:</span>
                                        {item.excelItem.deptName}
                                      </div>
                                    )}
                                    {!item.bakItem?.deptName && !item.excelItem?.deptName && (
                                      <span className="text-slate-600">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center text-[11px]">
                                  <div className="space-y-0.5">
                                    <div>
                                      <span className="text-[10px] text-amber-400 mr-1">.bak:</span>
                                      <span className="text-slate-300 font-medium">
                                        {item.bakItem?.statusName || '-'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-emerald-400 mr-1">Excel:</span>
                                      <span className="text-slate-300 font-medium">
                                        {item.excelItem?.statusName || '-'}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-[11px]">
                                  {item.discrepancies.length > 0 ? (
                                    <div className="space-y-1">
                                      {item.discrepancies.map((d, dIdx) => (
                                        <span
                                          key={dIdx}
                                          className="inline-block bg-amber-950/60 border border-amber-600/40 text-amber-300 text-[10px] px-2 py-0.5 rounded-lg mr-1 mb-1"
                                        >
                                          {d.fieldLabel}: .bak [{d.bakValue}] ≠ Excel [{d.excelValue}]
                                        </span>
                                      ))}
                                    </div>
                                  ) : isMatched ? (
                                    <span className="text-emerald-400 text-[10px]">✓ ข้อมูลตรงกัน</span>
                                  ) : (
                                    <span className="text-slate-500 text-[10px]">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400 mt-4">
                    <span>
                      แสดงรายการ {Math.min(filteredReconciliationItems.length, (reconcilePage - 1) * reconcilePageSize + 1)} ถึง{' '}
                      {Math.min(filteredReconciliationItems.length, reconcilePage * reconcilePageSize)} จากทั้งหมด{' '}
                      {filteredReconciliationItems.length} รายการ
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReconcilePage((p) => Math.max(1, p - 1))}
                        disabled={reconcilePage === 1}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                      >
                        ก่อนหน้า
                      </button>
                      <button
                        onClick={() => setReconcilePage((p) => Math.min(reconcileTotalPages, p + 1))}
                        disabled={reconcilePage === reconcileTotalPages}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                      >
                        ถัดไป
                      </button>
                    </div>
                  </div>
                </div>

                {/* Printable A4 View for Reconciliation (Visible only during printing) */}
                <div className="hidden print:block print-report-container text-slate-900 bg-white">
                  <div className="text-center pb-4 mb-4 border-b-2 border-slate-900">
                    <h2 className="text-lg font-bold">
                      รายงานผลการตรวจสอบความสอดคล้องและกระทบยอดบัญชีครุภัณฑ์คอมพิวเตอร์และสารสนเทศ
                    </h2>
                    <h3 className="text-sm font-semibold text-slate-700">
                      เปรียบเทียบระหว่างฐานข้อมูลสำรองระบบ DFDEquipment (.bak) และ ทะเบียนพัสดุ Excel
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      ประจำปีงบประมาณ พ.ศ. 2569 • ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH')}
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="grid grid-cols-5 gap-3 p-3 bg-slate-100 rounded border border-slate-300 mb-4 text-center text-xs">
                    <div>
                      <p className="text-slate-600 font-medium">รหัสทั้งหมด</p>
                      <p className="text-base font-bold font-mono">{reconciliationResult.totalUnique} รายการ</p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium">ตรงกันทั้ง 2 แหล่ง 🟢</p>
                      <p className="text-base font-bold font-mono text-emerald-800">{reconciliationResult.matchedCount} รายการ</p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium">ข้อมูลขัดแย้ง 🟡</p>
                      <p className="text-base font-bold font-mono text-amber-800">{reconciliationResult.discrepancyCount} รายการ</p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium">มีเฉพาะใน .bak 🔵</p>
                      <p className="text-base font-bold font-mono text-blue-800">{reconciliationResult.onlyBakCount} รายการ</p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium">มีเฉพาะใน Excel 🟣</p>
                      <p className="text-base font-bold font-mono text-purple-800">{reconciliationResult.onlyExcelCount} รายการ</p>
                    </div>
                  </div>

                  {/* Table */}
                  <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-200 text-slate-800 font-bold">
                        <th className="border border-slate-300 p-1.5 text-center w-8">ลำดับ</th>
                        <th className="border border-slate-300 p-1.5 min-w-36">หมายเลขครุภัณฑ์</th>
                        <th className="border border-slate-300 p-1.5 min-w-44">ชื่อครุภัณฑ์</th>
                        <th className="border border-slate-300 p-1.5 text-center min-w-28">ผลการตรวจ</th>
                        <th className="border border-slate-300 p-1.5 text-center min-w-24">ปีงบ (.bak vs Excel)</th>
                        <th className="border border-slate-300 p-1.5 min-w-40">ที่ตั้ง (.bak vs Excel)</th>
                        <th className="border border-slate-300 p-1.5 text-center min-w-24">สถานะ (.bak vs Excel)</th>
                        <th className="border border-slate-300 p-1.5">ข้อแตกต่าง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReconciliationItems.slice(0, 100).map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 1 ? 'bg-slate-50' : ''}>
                          <td className="border border-slate-300 p-1 text-center font-mono">{idx + 1}</td>
                          <td className="border border-slate-300 p-1 font-mono font-medium">{item.code}</td>
                          <td className="border border-slate-300 p-1">{item.name}</td>
                          <td className="border border-slate-300 p-1 text-center font-semibold">
                            {item.status === 'matched'
                              ? 'ตรงกัน 🟢'
                              : item.status === 'discrepancy'
                              ? 'ขัดแย้ง 🟡'
                              : item.status === 'only_bak'
                              ? 'เฉพาะ .bak 🔵'
                              : 'เฉพาะ Excel 🟣'}
                          </td>
                          <td className="border border-slate-300 p-1 text-center font-mono text-[9px]">
                            {item.bakItem?.year || '-'} / {item.excelItem?.year || '-'}
                          </td>
                          <td className="border border-slate-300 p-1 text-[9px]">
                            {item.bakItem?.deptName || item.excelItem?.deptName || '-'}
                          </td>
                          <td className="border border-slate-300 p-1 text-center text-[9px]">
                            {item.bakItem?.statusName || '-'} / {item.excelItem?.statusName || '-'}
                          </td>
                          <td className="border border-slate-300 p-1 text-[9px]">
                            {item.discrepancies.map((d) => `${d.fieldLabel}: [${d.bakValue}] ≠ [${d.excelValue}]`).join(', ') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-8 pt-8 border-t-2 border-slate-900 text-center text-xs mt-8 break-inside-avoid">
                    <div className="space-y-2">
                      <p className="text-slate-600">ลงชื่อ..............................................................</p>
                      <p className="font-bold text-slate-900">({prepName})</p>
                      <p className="text-slate-500 text-[11px]">{prepPos}</p>
                      <p className="text-[11px] text-slate-400">วันที่: {new Date().toLocaleDateString('th-TH')}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-slate-600">ลงชื่อ..............................................................</p>
                      <p className="font-bold text-slate-900">({apprName})</p>
                      <p className="text-slate-500 text-[11px]">{apprPos}</p>
                      <p className="text-[11px] text-slate-400">วันที่: ......................................................</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
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
                  ทุกช่วงอายุ ({parseResult.summary?.totalCount ?? 0})
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
                  <span>1 - 7 ปี ({parseResult.summary?.age1To7Count ?? 0})</span>
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
                  <span>7 - 14 ปี ({parseResult.summary?.age7To14Count ?? 0})</span>
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
                  <span>14 ปีขึ้นไป ({parseResult.summary?.age14PlusCount ?? 0})</span>
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

            {/* TAB 1: DASHBOARD (จำแนกตามประเภท, หมวดหมู่, ปีงบประมาณ, อายุใช้งาน - Synchronized 100% with Report Filters) */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8 no-print">
                {/* Dashboard Filter Sync Banner */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          แดชบอร์ดซิงค์ข้อมูลตามตัวกรองรายงานสรุป 100%
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                          {reportSummary.totalCount} รายการ
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ตัวเลขและแผนภูมิในแดชบอร์ดคำนวณจากชุดข้อมูลที่ผ่านการกรองตรงตามเงื่อนไขเดียวกับรายงานพิมพ์ A4
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {isExcelSource ? (
                      <button
                        type="button"
                        onClick={() => setReportExcludeWarehouse12(!reportExcludeWarehouse12)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                          reportExcludeWarehouse12
                            ? 'bg-rose-950/60 border-rose-700/80 text-rose-300 hover:bg-rose-900/60'
                            : 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60'
                        }`}
                        title="คลิกเพื่อสลับให้มีหรือไม่มีรายการคลัง 12 ในแดชบอร์ดและรายงาน"
                      >
                        <span className={`w-2 h-2 rounded-full ${reportExcludeWarehouse12 ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                        <span>{reportExcludeWarehouse12 ? `คลัง 12: ไม่รวม (${warehouse12ExcludedCount})` : 'คลัง 12: รวมในแดชบอร์ด'}</span>
                      </button>
                    ) : (
                      <>
                        {/* Status Dropdown */}
                        <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                          <span className="text-slate-400 text-[11px]">สถานะ:</span>
                          <select
                            value={reportBakStatus}
                            onChange={(e) => setReportBakStatus(e.target.value)}
                            className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
                          >
                            <option value="ปกติ" className="bg-slate-900">ปกติ 🟢</option>
                            <option value="ส่งซ่อม" className="bg-slate-900">ส่งซ่อม 🟡</option>
                            <option value="ส่งคืน" className="bg-slate-900">ส่งคืน 🔴</option>
                            <option value="all" className="bg-slate-900">ทุกสถานะ</option>
                          </select>
                        </div>

                        {/* Procurement Dropdown */}
                        <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                          <span className="text-slate-400 text-[11px]">หน่วยจัดซื้อ:</span>
                          <select
                            value={reportBakProcurement}
                            onChange={(e) => setReportBakProcurement(e.target.value)}
                            className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
                          >
                            <option value="all" className="bg-slate-900">ทั้งหมด</option>
                            <option value="ทสอ." className="bg-slate-900">ทสอ.</option>
                            <option value="กง.กห." className="bg-slate-900">กง.กห.</option>
                            <option value="สม." className="bg-slate-900">สม.</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>

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
                          <p className="text-xs text-slate-400">สัดส่วนจำนวนและมูลค่ารวมตามประเภท (กรองตามเงื่อนไข)</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {dashboardByType.length} ประเภท
                      </span>
                    </div>

                    <div className="space-y-4">
                      {(dashboardByType || []).map((t, idx) => (
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
                                {(t.totalValue ?? 0) > 0 ? `฿${(t.totalValue ?? 0).toLocaleString('th-TH')}` : '-'}
                              </span>
                              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg min-w-16 text-right">
                                {t.count ?? 0} ({t.percent ?? 0}%)
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
                          <p className="text-xs text-slate-400">เกณฑ์การประเมินสภาพและวางแผนจัดซื้อทดแทน (กรองตามเงื่อนไข)</p>
                        </div>
                      </div>
                      <span className="text-xs text-emerald-400 font-mono">
                        ปีงบ 2569
                      </span>
                    </div>

                    <div className="space-y-4">
                      {(reportSummary.ageBreakdown || []).map((a) => {
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
                                  {(a.totalValue ?? 0) > 0 ? `฿${(a.totalValue ?? 0).toLocaleString('th-TH')}` : '-'}
                                </span>
                                <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg min-w-16 text-right">
                                  {a.count ?? 0} ({a.percent ?? 0}%)
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
                        <p className="text-xs text-slate-400">จำนวนครุภัณฑ์ที่ขึ้นทะเบียนในแต่ละปีงบประมาณ (กรองตามเงื่อนไข)</p>
                      </div>
                    </div>
                    <span className="text-xs text-amber-400 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-xl self-start sm:self-auto font-medium">
                      ครอบคลุม {dashboardByYear.length} ปีงบประมาณ
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dashboardByYear.map((y) => {
                      const maxYearCount = Math.max(...dashboardByYear.map((item) => item.count), 1);
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
                              {(y.totalValue ?? 0) > 0 ? `฿${(y.totalValue ?? 0).toLocaleString('th-TH')}` : ''}
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
                        {(parseResult.crossTabAge || []).map((row) => (
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
                            {parseResult.summary?.totalCount ?? 0}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-400 font-mono">
                            {parseResult.summary?.age1To7Count ?? 0}
                          </td>
                          <td className="py-3 px-3 text-right text-amber-400 font-mono">
                            {parseResult.summary?.age7To14Count ?? 0}
                          </td>
                          <td className="py-3 px-3 text-right text-red-400 font-mono">
                            {parseResult.summary?.age14PlusCount ?? 0}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-500 font-mono">
                            {parseResult.summary?.unknownAgeCount ?? 0}
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

                    {/* Status Filter (.bak) */}
                    {parseResult.sourceType === 'bak' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">สถานะ:</span>
                        <select
                          value={selectedStatus}
                          onChange={(e) => {
                            setSelectedStatus(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                          <option value="all">ทุกสถานะ</option>
                          <option value="ปกติ">ปกติ 🟢</option>
                          <option value="ส่งซ่อม">ส่งซ่อม 🟡</option>
                          <option value="ส่งคืน">ส่งคืน 🔴</option>
                        </select>
                      </div>
                    )}

                    {/* Procurement Filter (.bak) */}
                    {parseResult.sourceType === 'bak' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">หน่วยจัดซื้อ:</span>
                        <select
                          value={selectedProcurement}
                          onChange={(e) => {
                            setSelectedProcurement(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                          <option value="all">ทุกหน่วยจัดซื้อ</option>
                          <option value="ทสอ.">ทสอ.</option>
                          <option value="กง.กห.">กง.กห.</option>
                          <option value="สม.">สม.</option>
                        </select>
                      </div>
                    )}

                    {/* Reset button */}
                    {(selectedYear !== 'all' ||
                      selectedType !== 'all' ||
                      selectedCategory !== 'all' ||
                      selectedAgeBracket !== 'all' ||
                      selectedSourceFile !== 'all' ||
                      selectedStatus !== 'all' ||
                      selectedProcurement !== 'all' ||
                      searchQuery) && (
                      <button
                        onClick={() => {
                          setSelectedYear('all');
                          setSelectedType('all');
                          setSelectedCategory('all');
                          setSelectedAgeBracket('all');
                          setSelectedSourceFile('all');
                          setSelectedStatus('all');
                          setSelectedProcurement('all');
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
                        {parseResult.sourceType === 'bak' && (
                          <>
                            <th className="py-3 px-3 text-center">หน่วยจัดซื้อ</th>
                            <th className="py-3 px-3 text-center">สถานะ</th>
                          </>
                        )}
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
                          <td colSpan={parseResult.sourceType === 'bak' ? 14 : 12} className="py-12 text-center text-slate-500">
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
                              {parseResult.sourceType === 'bak' && (
                                <>
                                  <td className="py-2.5 px-3 text-center text-slate-300 font-medium">
                                    {item.procurementName || '-'}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        item.statusName === 'ปกติ' || item.statusName === 'ใช้งานปกติ'
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                          : item.statusName === 'ส่งซ่อม'
                                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                      }`}
                                    >
                                      {item.statusName || 'ปกติ'}
                                    </span>
                                  </td>
                                </>
                              )}
                              <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                                {item.deptName || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                                {(item.price ?? 0) > 0 ? `฿${(item.price ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}
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

            {/* TAB 4: A4 PRINTABLE REPORT (พร้อมตัวกรองหมวดหมู่ ประเภท ช่วงปี และเรียงลำดับอายุใช้งานมากสุดไปน้อยสุด) */}
            {activeTab === 'report' && (
              <div className="space-y-6">
                {/* Print Control & Filter Toolbar (Hidden in print) */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 no-print shadow-xl">
                  {/* Top bar: title + actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        <Printer className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>มุมมองและเครื่องมือพิมพ์รายงานราชการ A4 แนวนอน</span>
                          <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                            เรียงตามอายุใช้งานมากสุดไปน้อยสุด
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          เลือกหมวดหมู่ ประเภท และช่วงปี/อายุ เพื่อสร้างรายงานตารางสรุปสถานะอายุและรายละเอียดครุภัณฑ์เฉพาะกลุ่ม
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      {isExcelSource ? (
                        <button
                          type="button"
                          onClick={() => setReportExcludeWarehouse12(!reportExcludeWarehouse12)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition border ${
                            reportExcludeWarehouse12
                              ? 'bg-rose-950/60 border-rose-700/80 text-rose-300 hover:bg-rose-900/60'
                              : 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60'
                          }`}
                          title="คลิกเพื่อสลับให้มีหรือไม่มีรายการคลัง 12 ในรายงาน"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              reportExcludeWarehouse12 ? 'bg-rose-400' : 'bg-emerald-400'
                            }`}
                          />
                          <span>
                            {reportExcludeWarehouse12
                              ? `คลัง 12: ไม่รวม (${warehouse12ExcludedCount})`
                              : 'คลัง 12: รวมในรายงาน'}
                          </span>
                        </button>
                      ) : (
                        reportBakProcurement === 'กง.กห.' && (
                          <button
                            type="button"
                            onClick={() => setReportBakIncludeDeptMatch(!reportBakIncludeDeptMatch)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition border ${
                              reportBakIncludeDeptMatch
                                ? 'bg-blue-950/60 border-blue-700/80 text-blue-300 hover:bg-blue-900/60'
                                : 'bg-amber-950/60 border-amber-700/80 text-amber-300 hover:bg-amber-900/60'
                            }`}
                            title="สลับโหมดการจับคู่ กง.กห. ระหว่างรวมหน่วยงาน กง.กห. กับเฉพาะรหัสจัดซื้อ"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                reportBakIncludeDeptMatch ? 'bg-blue-400' : 'bg-amber-400'
                              }`}
                            />
                            <span>
                              {reportBakIncludeDeptMatch
                                ? 'จัดซื้อ/หน่วยงาน: รวม กง.กห.'
                                : 'จัดซื้อ: เฉพาะรหัสจัดซื้อ'}
                            </span>
                          </button>
                        )
                      )}
                      <button
                        onClick={handleDownloadReportCsv}
                        disabled={reportFilteredItems.length === 0}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                        title="ดาวน์โหลดไฟล์ CSV เฉพาะข้อมูลที่ผ่านการกรองและจัดเรียงอายุใช้งานมากสุดแล้ว"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>ส่งออก CSV ตามตัวกรอง ({reportFilteredItems.length})</span>
                      </button>
                      <button
                        onClick={handlePrint}
                        disabled={reportFilteredItems.length === 0}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-950/40"
                      >
                        <Printer className="w-4 h-4" />
                        <span>สั่งพิมพ์ A4 (Print)</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Toolbar Controls */}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${isExcelSource ? 'lg:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-6'} gap-3 text-xs`}>
                    {/* 1. หมวดหมู่ (Category) */}
                    <div>
                      <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1">
                        <FolderArchive className="w-3.5 h-3.5 text-slate-400" />
                        <span>หมวดหมู่ครุภัณฑ์</span>
                      </label>
                      <select
                        value={reportCategory}
                        onChange={(e) => handleReportCategoryChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 transition"
                      >
                        <option value="all">ทุกหมวดหมู่ ({parseResult.items.length})</option>
                        {parseResult.availableCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. ประเภท (Type - Cascading) */}
                    <div>
                      <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>ประเภทครุภัณฑ์</span>
                      </label>
                      <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 transition"
                      >
                        <option value="all">ทุกประเภทในหมวดนี้</option>
                        {availableTypesForCategory.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2.1 For .bak: สถานะ (Status) */}
                    {!isExcelSource && (
                      <div>
                        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>สถานะ (.bak)</span>
                        </label>
                        <select
                          value={reportBakStatus}
                          onChange={(e) => setReportBakStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 transition font-medium"
                        >
                          <option value="ปกติ">ปกติ (ค่าเริ่มต้น 🟢)</option>
                          <option value="ส่งซ่อม">ส่งซ่อม 🟡</option>
                          <option value="ส่งคืน">ส่งคืน 🔴</option>
                          <option value="all">ทุกสถานะ</option>
                        </select>
                      </div>
                    )}

                    {/* 2.2 For .bak: หน่วยจัดซื้อ (Procurement) */}
                    {!isExcelSource && (
                      <div>
                        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-blue-400" />
                          <span>หน่วยจัดซื้อ (.bak)</span>
                        </label>
                        <select
                          value={reportBakProcurement}
                          onChange={(e) => setReportBakProcurement(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 transition font-medium"
                        >
                          <option value="all">ทุกหน่วยจัดซื้อ (ค่าเริ่มต้น)</option>
                          <option value="ทสอ.">ทสอ. (ศูนย์เทคโนโลยีฯ)</option>
                          <option value="กง.กห.">กง.กห. (กรมการเงินกลาโหม)</option>
                          <option value="สม.">สม. (สำนักรัฐมนตรี)</option>
                        </select>
                      </div>
                    )}

                    {/* 3. โหมดช่วงอายุ/ช่วงปี พ.ศ. */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>เกณฑ์อายุ / ปีงบประมาณ</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setReportAgeFilterMode(reportAgeFilterMode === 'bracket' ? 'yearRange' : 'bracket')}
                          className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                        >
                          {reportAgeFilterMode === 'bracket' ? 'สลับเป็นระบุช่วงปี' : 'สลับเป็นช่วงอายุ'}
                        </button>
                      </div>

                      {reportAgeFilterMode === 'bracket' ? (
                        <select
                          value={reportAgeBracket}
                          onChange={(e) => setReportAgeBracket(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 transition"
                        >
                          <option value="all">ทุกช่วงอายุ (1-7, 7-14, 14+ ปี)</option>
                          <option value="1-7">1 - 7 ปี (ใช้งานปกติ 🟢)</option>
                          <option value="7-14">7 - 14 ปี (เริ่มเสื่อมสภาพ 🟡)</option>
                          <option value="14+">14 ปีขึ้นไป (เกินเกณฑ์/รอจำหน่าย 🔴)</option>
                          <option value="unknown">ไม่ระบุปีงบประมาณ</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            placeholder="ปีเริ่ม เช่น 2540"
                            value={reportYearStart}
                            onChange={(e) => setReportYearStart(e.target.value)}
                            className="w-1/2 px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-xs"
                          />
                          <span className="text-slate-500">-</span>
                          <input
                            type="number"
                            placeholder="ปีสิ้นสุด เช่น 2560"
                            value={reportYearEnd}
                            onChange={(e) => setReportYearEnd(e.target.value)}
                            className="w-1/2 px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-xs"
                          />
                        </div>
                      )}
                    </div>

                    {/* 4. ขอบเขตการพิมพ์ / ล้างตัวกรอง */}
                    <div>
                      <label className="block text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                          <span>จำนวนรายการในเอกสาร</span>
                        </span>
                        {(reportCategory !== 'all' ||
                          reportType !== 'all' ||
                          reportAgeBracket !== 'all' ||
                          reportYearStart ||
                          reportYearEnd ||
                          reportRowLimit !== 'all' ||
                          (!isExcelSource && (reportBakStatus !== 'ปกติ' || reportBakProcurement !== 'all'))) && (
                          <button
                            type="button"
                            onClick={() => {
                              setReportCategory('all');
                              setReportType('all');
                              setReportAgeBracket('all');
                              setReportYearStart('');
                              setReportYearEnd('');
                              setReportRowLimit('all');
                              setReportBakStatus('ปกติ');
                              setReportBakProcurement('all');
                            }}
                            className="text-[10px] text-amber-400 hover:text-amber-300"
                          >
                            ล้างตัวกรอง
                          </button>
                        )}
                      </label>
                      <select
                        value={reportRowLimit}
                        onChange={(e) => setReportRowLimit(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 transition"
                      >
                        <option value="all">แสดงทั้งหมด ({reportFilteredItems.length} รายการ)</option>
                        <option value="30">30 รายการแรกที่อายุมากที่สุด</option>
                        <option value="50">50 รายการแรกที่อายุมากที่สุด</option>
                        <option value="100">100 รายการแรกที่อายุมากที่สุด</option>
                      </select>
                    </div>
                  </div>

                  {/* Summary Bar of Current Selection */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-400 border-t border-slate-800/60">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-500">เงื่อนไขรายงาน:</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-medium border border-slate-700">
                        หมวดหมู่: {reportCategory === 'all' ? 'ทั้งหมด' : reportCategory}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-medium border border-slate-700">
                        ประเภท: {reportType === 'all' ? 'ทั้งหมด' : reportType}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-medium border border-slate-700">
                        {reportAgeFilterDescription}
                      </span>
                      {!isExcelSource && (
                        <>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 font-medium border border-emerald-800">
                            สถานะ: {reportBakStatus === 'all' ? 'ทุกสถานะ' : reportBakStatus}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-950/80 text-blue-300 font-medium border border-blue-800">
                            หน่วยจัดซื้อ: {reportBakProcurement === 'all' ? 'ทุกหน่วยจัดซื้อ' : reportBakProcurement}
                            {reportBakProcurement === 'กง.กห.' && reportBakIncludeDeptMatch && ' (รวมหน่วยงาน กง.กห.)'}
                          </span>
                        </>
                      )}
                      {isExcelSource && (
                        <button
                          type="button"
                          onClick={() => setReportExcludeWarehouse12(!reportExcludeWarehouse12)}
                          className={`px-2 py-0.5 rounded-md font-medium border text-[11px] transition cursor-pointer flex items-center gap-1 ${
                            reportExcludeWarehouse12
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800 hover:bg-amber-900/80'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900/80'
                          }`}
                          title="คลิกเพื่อสลับระหว่าง 'ไม่รวมคลัง 12' หรือ 'รวมคลัง 12'"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              reportExcludeWarehouse12 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                          />
                          <span>
                            {reportExcludeWarehouse12
                              ? `คลัง 12: ไม่รวมในรายงาน${warehouse12ExcludedCount > 0 ? ` (${warehouse12ExcludedCount} รายการ)` : ''} (คลิกเพื่อรวม)`
                              : `คลัง 12: รวมในรายงานทั้งหมด (คลิกเพื่อตัดออก)`}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="text-slate-400 font-mono">
                      พบ <strong className="text-blue-400 font-bold">{reportFilteredItems.length.toLocaleString()}</strong> รายการ
                      {reportRowLimit !== 'all' && (
                        <span> (แสดงในรายงานฉบับนี้ {reportDisplayItems.length.toLocaleString()} รายการ)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Printable Document Sheet (A4 Landscape Formatted) */}
                <div className="print-report-container bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-2xl border border-slate-200 font-sans print:shadow-none print:border-none print:p-0">
                  {/* Document Header */}
                  <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
                      รายงานสรุปการสำรวจและวิเคราะห์อายุครุภัณฑ์คอมพิวเตอร์และสารสนเทศ
                    </h2>
                    <div className="mt-2 text-xs text-slate-700 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                      <span><strong>หมวดหมู่:</strong> {reportCategory === 'all' ? 'ทุกหมวดหมู่' : reportCategory}</span>
                      <span>•</span>
                      <span><strong>ประเภท:</strong> {reportType === 'all' ? 'ทุกประเภท' : reportType}</span>
                      <span>•</span>
                      <span><strong>เงื่อนไขอายุ/ปี:</strong> {reportAgeFilterDescription}</span>
                      {!isExcelSource ? (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold">
                            สถานะ: {reportBakStatus === 'all' ? 'ทุกสถานะ' : reportBakStatus}
                          </span>
                          <span>•</span>
                          <span className="text-blue-700 font-semibold">
                            หน่วยจัดซื้อ: {reportBakProcurement === 'all' ? 'ทุกหน่วยจัดซื้อ' : reportBakProcurement}
                            {reportBakProcurement === 'กง.กห.' && reportBakIncludeDeptMatch && ' (รวมหน่วยงาน กง.กห.)'}
                          </span>
                        </>
                      ) : (
                        isExcelSource && (
                          <>
                            <span>•</span>
                            <span className={reportExcludeWarehouse12 ? 'text-rose-700 font-semibold' : 'text-slate-600'}>
                              {reportExcludeWarehouse12
                                ? `* ไม่รวมรายการครุภัณฑ์ประจำคลัง 12${warehouse12ExcludedCount > 0 ? ` (จำนวน ${warehouse12ExcludedCount} รายการ)` : ''}`
                                : `(รวมรายการประจำคลัง 12 จำนวน ${warehouse12ExcludedCount} รายการ)`}
                            </span>
                          </>
                        )
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      แหล่งข้อมูล: {parseResult.fileName} • เกณฑ์ปีงบประมาณ 2569 • ข้อมูล ณ วันที่{' '}
                      {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
                    </p>
                  </div>

                  {/* Executive Summary Metrics in Report (ไม่แสดงมูลค่า) */}
                  <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-100 border border-slate-300 mb-6 text-center text-xs">
                    <div>
                      <p className="text-slate-500 font-medium">จำนวนครุภัณฑ์ในกลุ่มนี้</p>
                      <p className="text-lg font-bold text-slate-900 mt-0.5">
                        {reportSummary.totalCount.toLocaleString()} รายการ
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">อายุใช้งานสูงสุด / เฉลี่ย</p>
                      <p className="text-lg font-bold text-amber-700 mt-0.5">
                        {reportSummary.maxAge > 0 ? `${reportSummary.maxAge} ปี (เฉลี่ย ${reportSummary.avgAge} ปี)` : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">สัดส่วนเกินเกณฑ์ (14 ปีขึ้นไป)</p>
                      <p className="text-lg font-bold text-rose-700 mt-0.5">
                        {reportSummary.age14PlusCount.toLocaleString()} รายการ (
                        {reportSummary.totalCount > 0
                          ? ((reportSummary.age14PlusCount / reportSummary.totalCount) * 100).toFixed(1)
                          : '0.0'}
                        %)
                      </p>
                    </div>
                  </div>

                  {/* Section 1: Lifecycle Age Breakdown of Selected Scope (ไม่แสดงมูลค่า) */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2 border-b border-slate-300 pb-1">
                      <h3 className="text-sm font-bold text-slate-900">
                        1. สรุปสถานะอายุการใช้งานของกลุ่มครุภัณฑ์ที่เลือก (Lifecycle Age Summary)
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        รวมทั้งหมด {reportSummary.totalCount.toLocaleString()} รายการ
                      </span>
                    </div>
                    <table className="w-full text-xs border border-slate-300 border-collapse">
                      <thead>
                        <tr className="bg-slate-200 text-slate-800">
                          <th className="border border-slate-300 p-2 text-center w-12">ลำดับ</th>
                          <th className="border border-slate-300 p-2 text-left">ช่วงอายุการใช้งาน</th>
                          <th className="border border-slate-300 p-2 text-left">เกณฑ์การประเมินสภาพ</th>
                          <th className="border border-slate-300 p-2 text-right w-28">จำนวน (รายการ)</th>
                          <th className="border border-slate-300 p-2 text-right w-24">สัดส่วน (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportSummary.ageBreakdown.map((a, idx) => (
                          <tr key={a.bracket} className="hover:bg-slate-50">
                            <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                            <td className="border border-slate-300 p-1.5 font-bold">{a.label}</td>
                            <td className="border border-slate-300 p-1.5 text-slate-600">{a.desc}</td>
                            <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">
                              {(a.count ?? 0).toLocaleString()}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-right font-mono">{a.percent ?? 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold">
                          <td colSpan={3} className="border border-slate-300 p-2 text-center">รวมทั้งสิ้น</td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                            {reportSummary.totalCount.toLocaleString()}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold">100.0%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Section 2: Detailed Items List (Sorted Oldest First - ไม่แสดงมูลค่า) */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2 border-b border-slate-300 pb-1">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>2. รายละเอียดรายการครุภัณฑ์ (Itemized Equipment Details)</span>
                        <span className="text-[11px] font-normal text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          เรียงจากอายุใช้งานมากที่สุดไปหาน้อยที่สุด
                        </span>
                      </h3>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {reportDisplayItems.length === reportFilteredItems.length
                          ? `แสดงครบทั้ง ${reportDisplayItems.length.toLocaleString()} รายการ`
                          : `แสดง ${reportDisplayItems.length.toLocaleString()} จากทั้งหมด ${reportFilteredItems.length.toLocaleString()} รายการ`}
                      </span>
                    </div>

                    {reportDisplayItems.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl text-slate-500 text-xs space-y-2">
                        <p className="font-semibold text-slate-700">
                          ไม่พบรายการครุภัณฑ์ที่ตรงกับเงื่อนไขตัวกรองที่เลือก
                        </p>
                        {!isExcelSource && (
                          <p className="text-[11px] text-slate-500 max-w-lg mx-auto">
                            เงื่อนไขปัจจุบัน: สถานะ "{reportBakStatus}" • หน่วยจัดซื้อ "{reportBakProcurement}"
                            {reportBakProcurement === 'กง.กห.' && !reportBakIncludeDeptMatch && (
                              <span className="block mt-1 text-blue-600 font-medium">
                                แนะนำ: กดปุ่ม "จัดซื้อ/หน่วยงาน: รวม กง.กห." ด้านบนเพื่อดึงครุภัณฑ์ที่หน่วยงานในสังกัด กง.กห. ครอบครองอยู่
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-slate-300 border-collapse">
                          <thead>
                            <tr className="bg-slate-200 text-slate-800">
                              <th className="border border-slate-300 p-2 text-center w-10">ลำดับ</th>
                              <th className="border border-slate-300 p-2 text-left w-36">รหัสครุภัณฑ์</th>
                              <th className="border border-slate-300 p-2 text-left">ชื่อรายการครุภัณฑ์ / รุ่น / รายละเอียด</th>
                              <th className="border border-slate-300 p-2 text-left w-28">ประเภท</th>
                              <th className="border border-slate-300 p-2 text-center w-20">ปีงบฯ</th>
                              <th className="border border-slate-300 p-2 text-center w-24">อายุใช้งาน</th>
                              {!isExcelSource && (
                                <>
                                  <th className="border border-slate-300 p-2 text-center w-24">หน่วยจัดซื้อ</th>
                                  <th className="border border-slate-300 p-2 text-center w-24">สถานะ</th>
                                </>
                              )}
                              <th className="border border-slate-300 p-2 text-left w-44">หน่วยงาน / ที่ตั้ง</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportDisplayItems.map((item, idx) => (
                              <tr key={`${item.code}-${idx}`} className="hover:bg-slate-50">
                                <td className="border border-slate-300 p-1.5 text-center font-mono text-[11px]">
                                  {idx + 1}
                                </td>
                                <td className="border border-slate-300 p-1.5 font-mono font-medium text-slate-900 text-[11px]">
                                  {item.code || '-'}
                                </td>
                                <td className="border border-slate-300 p-1.5 font-semibold text-slate-900">
                                  {item.name}
                                  {item.serial && (
                                    <span className="block text-[10px] text-slate-500 font-normal">
                                      S/N: {item.serial}
                                    </span>
                                  )}
                                </td>
                                <td className="border border-slate-300 p-1.5 text-slate-700 text-[11px]">
                                  {item.type}
                                </td>
                                <td className="border border-slate-300 p-1.5 text-center font-mono text-[11px]">
                                  {item.year || '-'}
                                </td>
                                <td className="border border-slate-300 p-1.5 text-center">
                                  {item.ageYears > 0 ? (
                                    <span
                                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                                        item.ageBracket === '14+'
                                          ? 'bg-rose-100 text-rose-800'
                                          : item.ageBracket === '7-14'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}
                                    >
                                      {item.ageYears} ปี
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">-</span>
                                  )}
                                </td>
                                {!isExcelSource && (
                                  <>
                                    <td className="border border-slate-300 p-1.5 text-center text-[11px] font-medium text-slate-700">
                                      {item.procurementName || '-'}
                                    </td>
                                    <td className="border border-slate-300 p-1.5 text-center text-[11px]">
                                      <span
                                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                          item.statusName === 'ปกติ' || item.statusName === 'ใช้งานปกติ'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : item.statusName === 'ส่งซ่อม'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-rose-100 text-rose-800'
                                        }`}
                                      >
                                        {item.statusName || 'ปกติ'}
                                      </span>
                                    </td>
                                  </>
                                )}
                                <td className="border border-slate-300 p-1.5 text-slate-600 text-[11px]">
                                  {item.deptName || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-100 font-bold">
                              <td colSpan={!isExcelSource ? 9 : 7} className="border border-slate-300 p-2 text-center">
                                รวมรายการที่แสดง ({reportDisplayItems.length.toLocaleString()} รายการ)
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
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
