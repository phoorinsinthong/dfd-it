'use client';

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth/auth-context';
import {
  generateMonthlyReport,
  generateReportCsv,
  generateDetailedTicketsCsv,
  getMonthlyTickets,
  saveReportSignature,
} from '@/lib/services/report-service';
import { THAI_MONTH_NAMES } from '@/lib/services/roadmap-service';
import { MonthlyReportSummary, Ticket } from '@/types/database';
import {
  FileText,
  Printer,
  Download,
  PenTool,
  CheckCircle2,
  Calendar,
  Wrench,
  Laptop,
  ClipboardList,
  ShieldAlert,
  X,
  RotateCcw,
  Check,
  Clock,
  Building,
  MapPin,
  Stamp,
  Grid3X3,
  ListOrdered,
} from 'lucide-react';

export default function AdminReportsPage() {
  const { user } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState(10);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [report, setReport] = useState<MonthlyReportSummary | null>(null);
  const [monthlyTickets, setMonthlyTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Report Tab: Executive Summary vs Detailed Incident List
  const [activeReportTab, setActiveReportTab] = useState<'summary' | 'incidents'>('summary');

  // Signature Modal state
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signingRole, setSigningRole] = useState<'staff' | 'supervisor'>('staff');
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signMethod, setSignMethod] = useState<'drawn' | 'typed'>('drawn');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    const [data, tickets] = await Promise.all([
      generateMonthlyReport(selectedMonth, selectedYear),
      getMonthlyTickets(selectedMonth, selectedYear),
    ]);
    setReport(data);
    setMonthlyTickets(tickets);
    setLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const now = new Date();
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (!report) return;
    const csvContent = generateReportCsv(report);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `IT-Monthly-KPI-Summary-${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDetailedCsv = () => {
    if (!monthlyTickets) return;
    const csvContent = generateDetailedTicketsCsv(monthlyTickets, selectedMonth, selectedYear);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `IT-Incidents-Detail-${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1E293B';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const openSignModal = (role: 'staff' | 'supervisor') => {
    setSigningRole(role);
    if (role === 'staff') {
      setSignerName(report?.signature?.staff_name || user?.name || 'เจ้าหน้าที่ไอที');
      setSignerTitle(report?.signature?.staff_title || 'เจ้าหน้าที่ฝ่ายสนับสนุนเทคนิค (IT Staff)');
      setSignMethod(report?.signature?.staff_signature_type || 'drawn');
    } else {
      setSignerName(report?.signature?.supervisor_name || 'หัวหน้าฝ่ายไอที / ผู้จัดการ');
      setSignerTitle(report?.signature?.supervisor_title || 'ผู้อำนวยการกลุ่มงานเทคโนโลยีสารสนเทศ');
      setSignMethod(report?.signature?.supervisor_signature_type || 'drawn');
    }
    setHasDrawn(false);
    setIsSignModalOpen(true);
    setTimeout(() => clearCanvas(), 50);
  };

  const handleSaveSignature = async () => {
    if (!report) return;

    let signatureValue: string | undefined = undefined;

    if (signMethod === 'drawn') {
      const canvas = canvasRef.current;
      if (canvas && hasDrawn) {
        signatureValue = canvas.toDataURL('image/png');
      } else if (signingRole === 'staff' && report.signature?.staff_signature) {
        signatureValue = report.signature.staff_signature;
      } else if (signingRole === 'supervisor' && report.signature?.supervisor_signature) {
        signatureValue = report.signature.supervisor_signature;
      }
    } else {
      // Typed Certified Stamp
      signatureValue = `CERTIFIED:${new Date().toISOString()}`;
    }

    const input = {
      month: selectedMonth,
      year: selectedYear,
      ...(signingRole === 'staff'
        ? {
            staffSignature: signatureValue,
            staffName: signerName.trim(),
            staffTitle: signerTitle.trim(),
            staffSignatureType: signMethod,
          }
        : {
            supervisorSignature: signatureValue,
            supervisorName: signerName.trim(),
            supervisorTitle: signerTitle.trim(),
            supervisorSignatureType: signMethod,
          }),
    };

    await saveReportSignature(input);
    setIsSignModalOpen(false);
    loadReport();
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar activeSection="reports" />
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

  const monthName = THAI_MONTH_NAMES[selectedMonth - 1];

  // Helper renderer for signatures on the printable report
  const renderSignatureSection = () => (
    <div className="pt-6 border-t-2 border-slate-800 grid grid-cols-2 gap-8 text-center text-xs print:break-inside-avoid">
      {/* Left: Staff Signature */}
      <div className="flex flex-col items-center justify-between min-h-[150px] p-4 bg-slate-50/70 border border-slate-200 rounded-2xl print:bg-white print:border-slate-300">
        <span className="font-bold text-slate-700 mb-1">
          ผู้จัดทำและตรวจสอบรายงาน (Prepared by)
        </span>

        <div className="my-2 flex-1 flex items-center justify-center">
          {report?.signature?.staff_signature_type === 'typed' ? (
            <div className="border border-blue-600 bg-blue-50/80 text-blue-900 px-3 py-1.5 rounded-xl text-center space-y-0.5 print:border-blue-700">
              <div className="text-[10px] font-black tracking-wider uppercase text-blue-700 flex items-center justify-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                รับรองความถูกต้องทางดิจิทัล
              </div>
              <div className="text-xs font-bold text-slate-900">{report.signature.staff_name}</div>
              <div className="text-[9px] text-slate-500 font-mono">
                {report.signature.signed_at ? new Date(report.signature.signed_at).toLocaleString('th-TH') : ''}
              </div>
            </div>
          ) : report?.signature?.staff_signature ? (
            <img
              src={report.signature.staff_signature}
              alt="ลายเซ็นเจ้าหน้าที่ไอที"
              className="max-h-16 w-auto object-contain"
            />
          ) : (
            <div className="w-48 text-slate-400 font-mono text-[11px] py-3">
              ........................................................
              <span className="block text-[10px] text-slate-400 mt-1">(ลงลายมือชื่อด้วยปากกา)</span>
            </div>
          )}
        </div>

        <div className="text-slate-800 space-y-0.5">
          <div className="font-bold">({report?.signature?.staff_name || user.name})</div>
          <div className="text-[11px] text-slate-600">
            {report?.signature?.staff_title || 'เจ้าหน้าที่ฝ่ายสนับสนุนเทคนิค (IT Staff)'}
          </div>
          {report?.signature?.signed_at && (
            <div className="text-[10px] text-slate-400">
              วันที่: {new Date(report.signature.signed_at).toLocaleDateString('th-TH')}
            </div>
          )}
        </div>
      </div>

      {/* Right: Supervisor Signature */}
      <div className="flex flex-col items-center justify-between min-h-[150px] p-4 bg-slate-50/70 border border-slate-200 rounded-2xl print:bg-white print:border-slate-300">
        <span className="font-bold text-slate-700 mb-1">
          ผู้ตรวจรับรองรายงาน (Approved by)
        </span>

        <div className="my-2 flex-1 flex items-center justify-center">
          {report?.signature?.supervisor_signature_type === 'typed' ? (
            <div className="border border-emerald-600 bg-emerald-50/80 text-emerald-900 px-3 py-1.5 rounded-xl text-center space-y-0.5 print:border-emerald-700">
              <div className="text-[10px] font-black tracking-wider uppercase text-emerald-700 flex items-center justify-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                รับรองความถูกต้องทางดิจิทัล
              </div>
              <div className="text-xs font-bold text-slate-900">{report.signature.supervisor_name}</div>
              <div className="text-[9px] text-slate-500 font-mono">
                {report.signature.signed_at ? new Date(report.signature.signed_at).toLocaleString('th-TH') : ''}
              </div>
            </div>
          ) : report?.signature?.supervisor_signature ? (
            <img
              src={report.signature.supervisor_signature}
              alt="ลายเซ็นผู้จัดการ"
              className="max-h-16 w-auto object-contain"
            />
          ) : (
            <div className="w-48 text-slate-400 font-mono text-[11px] py-3">
              ........................................................
              <span className="block text-[10px] text-slate-400 mt-1">(ลงลายมือชื่อด้วยปากกา)</span>
            </div>
          )}
        </div>

        <div className="text-slate-800 space-y-0.5">
          <div className="font-bold">
            ({report?.signature?.supervisor_name || '...................................................'})
          </div>
          <div className="text-[11px] text-slate-600">
            {report?.signature?.supervisor_title || 'หัวหน้าฝ่ายไอที / ผู้จัดการ (IT Manager)'}
          </div>
          {report?.signature?.signed_at && (
            <div className="text-[10px] text-slate-400">
              วันที่: {new Date(report.signature.signed_at).toLocaleDateString('th-TH')}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans print:bg-white print:text-black">
      <Navbar activeSection="reports" />

      {/* Screen Control Bar (Hidden when printing) */}
      <div className="no-print bg-slate-900/90 border-b border-slate-800 sticky top-16 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Month/Year Selection */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">เลือกเดือน/ปี:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {THAI_MONTH_NAMES.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  ปี {y}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openSignModal('staff')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <PenTool className="w-3.5 h-3.5 text-blue-400" />
              ลงชื่อไอที
            </button>
            <button
              onClick={() => openSignModal('supervisor')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <PenTool className="w-3.5 h-3.5 text-emerald-400" />
              ลงชื่อผู้ตรวจรับรอง
            </button>

            {activeReportTab === 'summary' ? (
              <button
                onClick={handleExportCsv}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                สรุป KPI (.csv)
              </button>
            ) : (
              <button
                onClick={handleExportDetailedCsv}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-semibold border border-blue-500/40 transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                รายการแจ้งซ่อมละเอียด (.csv)
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ A4 แนวนอน
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Switcher Bar (Hidden when printing) */}
      <div className="no-print max-w-7xl w-full mx-auto px-4 sm:px-8 pt-6 pb-2">
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => setActiveReportTab('summary')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              activeReportTab === 'summary'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            1. รายงานสรุปภาพรวม KPI (Executive Summary)
          </button>

          <button
            onClick={() => setActiveReportTab('incidents')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              activeReportTab === 'incidents'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            2. รายงานรายละเอียดรายการแจ้งซ่อม (Incident Detail List)
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-blue-300">
              {monthlyTickets.length} งาน
            </span>
          </button>
        </div>
      </div>

      {/* Main Printable Report Sheets */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        {loading || !report ? (
          <div className="p-12 text-center text-slate-400 no-print">
            กำลังประมวลผลข้อมูลสรุปประจำเดือน...
          </div>
        ) : (
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl print:shadow-none print:p-0 print:rounded-none print:bg-white print:text-black">
            
            {/* TAB 1: EXECUTIVE SUMMARY SHEET */}
            {activeReportTab === 'summary' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="border-b-2 border-slate-800 pb-5 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        IT
                      </div>
                      <span className="text-xs uppercase tracking-widest font-bold text-blue-700">
                        Technical Support & IT Operations Department
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      รายงานสรุปผลการดำเนินงานประจำเดือน (Monthly Executive Summary)
                    </h1>
                    <p className="text-xs text-slate-600">
                      ประจำเดือน <strong className="text-slate-900">{monthName} {selectedYear}</strong> | ระบบบริหารจัดการทรัพยากรและแผนกสนับสนุนเทคนิค
                    </p>
                  </div>

                  <div className="text-right text-xs text-slate-500 print:text-black">
                    <div>วันที่ออกรายงาน: <strong>{new Date().toLocaleDateString('th-TH')}</strong></div>
                    <div>สถานะเอกสาร: <span className="text-emerald-700 font-bold">สมบูรณ์พร้อมรับรอง</span></div>
                  </div>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 print:border-slate-300">
                    <span className="text-xs text-slate-500 font-semibold block">งานแจ้งซ่อมทั้งหมด</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      {report.ticketStats.total} <span className="text-xs font-normal text-slate-500">งาน</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                      สำเร็จ: {report.ticketStats.resolved} ({report.ticketStats.resolutionRate}%)
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 print:border-slate-300">
                    <span className="text-xs text-slate-500 font-semibold block">การจองห้องประชุม</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      {report.bookingStats.total} <span className="text-xs font-normal text-slate-500">ครั้ง</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      ห้องกายภาพ: {report.bookingStats.onsite} | Zoom/Teams: {report.bookingStats.online}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 print:border-slate-300">
                    <span className="text-xs text-slate-500 font-semibold block">ยืม-คืนอุปกรณ์</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      {report.assetStats.totalLoans} <span className="text-xs font-normal text-slate-500">รายการ</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      คืนแล้ว: {report.assetStats.returned} | เกินกำหนด: {report.assetStats.overdue}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 print:border-slate-300">
                    <span className="text-xs text-slate-500 font-semibold block">แผนบำรุงรักษา PM</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      {report.pmStats.completionRate}%
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      สำเร็จ {report.pmStats.completedChecklists}/{report.pmStats.totalChecklists} แผน
                    </div>
                  </div>
                </div>

                {/* Tables Grid: Tickets by Category & by Department */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  
                  {/* Category Breakdown */}
                  <div className="border border-slate-200 rounded-2xl p-4 print:border-slate-300">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-blue-600" />
                      สถิติงานแจ้งซ่อมจำแนกตามประเภทปัญหา (Category)
                    </h3>
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="pb-2">หมวดหมู่อุปกรณ์</th>
                          <th className="pb-2 text-right">จำนวนงาน (รายการ)</th>
                          <th className="pb-2 text-right">สัดส่วน (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.keys(report.ticketStats.byCategory).length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-3 text-center text-slate-400">ไม่มีข้อมูลในเดือนนี้</td>
                          </tr>
                        ) : (
                          Object.entries(report.ticketStats.byCategory).map(([cat, count]) => {
                            const pct = report.ticketStats.total ? Math.round((count / report.ticketStats.total) * 100) : 0;
                            return (
                              <tr key={cat}>
                                <td className="py-2 font-medium text-slate-800">{cat}</td>
                                <td className="py-2 text-right font-bold text-slate-900">{count}</td>
                                <td className="py-2 text-right text-slate-500">{pct}%</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Department Breakdown */}
                  <div className="border border-slate-200 rounded-2xl p-4 print:border-slate-300">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                      สถิติงานแจ้งซ่อมจำแนกตามแผนกผู้แจ้ง (Department)
                    </h3>
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="pb-2">แผนก</th>
                          <th className="pb-2 text-right">จำนวนงาน (รายการ)</th>
                          <th className="pb-2 text-right">สัดส่วน (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.keys(report.ticketStats.byDepartment).length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-3 text-center text-slate-400">ไม่มีข้อมูลในเดือนนี้</td>
                          </tr>
                        ) : (
                          Object.entries(report.ticketStats.byDepartment).map(([dept, count]) => {
                            const pct = report.ticketStats.total ? Math.round((count / report.ticketStats.total) * 100) : 0;
                            return (
                              <tr key={dept}>
                                <td className="py-2 font-medium text-slate-800">{dept}</td>
                                <td className="py-2 text-right font-bold text-slate-900">{count}</td>
                                <td className="py-2 text-right text-slate-500">{pct}%</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signatures Block for Tab 1 */}
                {renderSignatureSection()}
              </div>
            )}

            {/* TAB 2: DETAILED INCIDENTS REPORT SHEET */}
            {activeReportTab === 'incidents' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="border-b-2 border-slate-800 pb-5 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        IT
                      </div>
                      <span className="text-xs uppercase tracking-widest font-bold text-blue-700">
                        Technical Support & IT Operations Department
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      รายงานรายละเอียดรายการแจ้งซ่อมประจำเดือน (Monthly Incident Detail Report)
                    </h1>
                    <p className="text-xs text-slate-600">
                      ประจำเดือน <strong className="text-slate-900">{monthName} {selectedYear}</strong> | รวมรายการแจ้งซ่อมทั้งหมด <strong className="text-blue-700">{monthlyTickets.length}</strong> รายการ
                    </p>
                  </div>

                  <div className="text-right text-xs text-slate-500 print:text-black">
                    <div>วันที่ออกรายงาน: <strong>{new Date().toLocaleDateString('th-TH')}</strong></div>
                    <div>สถานะเอกสาร: <span className="text-emerald-700 font-bold">สมบูรณ์พร้อมรับรอง</span></div>
                  </div>
                </div>

                {/* Full Incident Detail Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl print:border-slate-300">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50 print:bg-transparent">
                        <th className="py-2.5 px-2 w-10 text-center">#</th>
                        <th className="py-2.5 px-2 w-28">วันที่-เวลา</th>
                        <th className="py-2.5 px-2 w-24">รหัส Ticket</th>
                        <th className="py-2.5 px-2">ผู้แจ้ง / กองงาน - แผนก</th>
                        <th className="py-2.5 px-2">สถานที่ (อาคาร/ชั้น/ห้อง)</th>
                        <th className="py-2.5 px-2">หมวดหมู่ / หัวข้อปัญหา</th>
                        <th className="py-2.5 px-2 w-20 text-center">ความเร่งด่วน</th>
                        <th className="py-2.5 px-2 w-24 text-center">สถานะ</th>
                        <th className="py-2.5 px-2">ช่างผู้ดูแล / วิธีแก้ไข</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyTickets.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            ไม่มีรายการแจ้งซ่อมในเดือน {monthName} {selectedYear}
                          </td>
                        </tr>
                      ) : (
                        monthlyTickets.map((t, idx) => {
                          const dt = new Date(t.created_at);
                          const dateStr = dt.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
                          const timeStr = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

                          return (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="py-2 px-2 text-slate-700 font-mono text-[11px]">
                                {dateStr} <span className="text-slate-400">{timeStr}</span>
                              </td>
                              <td className="py-2 px-2 font-mono font-bold text-blue-700 text-[11px]">{t.id}</td>
                              <td className="py-2 px-2">
                                <div className="font-bold text-slate-900">{t.user_name}</div>
                                <div className="text-[11px] text-slate-500">
                                  {t.division_name ? `${t.division_name} › ` : ''}{t.department_name || '-'}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-slate-700">
                                {t.building ? `${t.building} ชั้น ${t.floor || '-'} ห้อง ${t.room || '-'}` : (t.location || '-')}
                                {t.location_note && <div className="text-[10px] text-slate-400">({t.location_note})</div>}
                              </td>
                              <td className="py-2 px-2">
                                <div className="font-bold text-slate-900">{t.title}</div>
                                <div className="text-[11px] text-blue-600 font-medium">{t.category_name || 'ทั่วไป'}</div>
                                <div className="text-[11px] text-slate-500 truncate max-w-xs">{t.description}</div>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    t.urgency === 'urgent'
                                      ? 'bg-red-100 text-red-800'
                                      : t.urgency === 'high'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {t.urgency === 'urgent' ? 'ด่วนที่สุด' : t.urgency === 'high' ? 'สูง' : 'ปกติ'}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    t.status === 'resolved'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : t.status === 'in_progress'
                                      ? 'bg-blue-100 text-blue-800'
                                      : t.status === 'cancelled'
                                      ? 'bg-slate-100 text-slate-500'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {t.status === 'resolved'
                                    ? 'เสร็จสิ้น'
                                    : t.status === 'in_progress'
                                    ? 'กำลังทำ'
                                    : t.status === 'cancelled'
                                    ? 'ยกเลิก'
                                    : 'รอรับเรื่อง'}
                                </span>
                              </td>
                              <td className="py-2 px-2">
                                {t.assigned_to_name && (
                                  <div className="font-bold text-slate-800 text-[11px]">ช่าง: {t.assigned_to_name}</div>
                                )}
                                <div className="text-[11px] text-slate-600 italic">
                                  {t.solution_note || t.root_cause || '-'}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signatures Block for Tab 2 */}
                {renderSignatureSection()}
              </div>
            )}

          </div>
        )}
      </main>

      {/* Signature & Position Modal */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PenTool className="w-5 h-5 text-blue-500" />
                ลงลายมือชื่อและรับรองรายงาน ({signingRole === 'staff' ? 'เจ้าหน้าที่ไอที' : 'ผู้ตรวจรับรอง'})
              </h3>
              <button
                onClick={() => setIsSignModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Sign Method Tab: Drawn vs Certified Stamp */}
              <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex items-center">
                <button
                  type="button"
                  onClick={() => setSignMethod('drawn')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    signMethod === 'drawn' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  วาดลายเซ็น (Drawn Pad)
                </button>
                <button
                  type="button"
                  onClick={() => setSignMethod('typed')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    signMethod === 'typed' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Stamp className="w-3.5 h-3.5" />
                  ประทับตรารับรองดิจิทัล
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ชื่อ-นามสกุล ผู้ลงลายมือชื่อ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นายสมชาย ช่างไอที"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ตำแหน่งทางการ (Official Title / Position) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นักวิชาการคอมพิวเตอร์ชำนาญการ, ผู้อำนวยการกลุ่มงานฯ"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {signMethod === 'drawn' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">
                      วาดลายเซ็น (เมาส์ นิ้ว หรือ Stylus)
                    </label>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> ล้างภาพ
                    </button>
                  </div>
                  <div className="bg-white rounded-2xl overflow-hidden border-2 border-slate-600">
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={150}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-36 cursor-crosshair touch-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-white">ตราประทับรับรองความถูกต้องดิจิทัล</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    ระบบจะสร้างตราประทับรับรองพร้อมระบุชื่อ: <strong>{signerName || '...'}</strong> ตำแหน่ง: <strong>{signerTitle || '...'}</strong> และวันเวลาปัจจุบันลงในรายงานโดยอัตโนมัติ
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSignModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveSignature}
                disabled={!signerName.trim() || (signMethod === 'drawn' && !hasDrawn && !(signingRole === 'staff' ? report?.signature?.staff_signature : report?.signature?.supervisor_signature))}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/30"
              >
                บันทึกลายมือชื่อรับรอง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Print CSS */}
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          table, tr, td, th {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
