'use client';

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth/auth-context';
import {
  generateMonthlyReport,
  generateReportCsv,
  saveReportSignature,
} from '@/lib/services/report-service';
import { THAI_MONTH_NAMES } from '@/lib/services/roadmap-service';
import { MonthlyReportSummary } from '@/types/database';
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
} from 'lucide-react';

export default function AdminReportsPage() {
  const { user } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState(10); // October default
  const [selectedYear, setSelectedYear] = useState(2026);
  const [report, setReport] = useState<MonthlyReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Signature Modal state
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signingRole, setSigningRole] = useState<'staff' | 'supervisor'>('staff');
  const [signerName, setSignerName] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    const data = await generateMonthlyReport(selectedMonth, selectedYear);
    setReport(data);
    setLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, [selectedMonth, selectedYear]);

  // Set default current month inside useEffect to avoid Next.js prerender issues
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
    link.setAttribute('download', `IT-Monthly-Report-${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.csv`);
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
    ctx.strokeStyle = '#1E293B'; // Dark ink
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
    setSignerName(role === 'staff' ? user?.name || 'เจ้าหน้าที่ไอที' : 'หัวหน้าแผนก / ผู้จัดการ');
    setIsSignModalOpen(true);
    setTimeout(() => clearCanvas(), 50);
  };

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !report) return;

    const signatureDataUrl = canvas.toDataURL('image/png');
    const input = {
      month: selectedMonth,
      year: selectedYear,
      ...(signingRole === 'staff'
        ? { staffSignature: signatureDataUrl, staffName: signerName }
        : { supervisorSignature: signatureDataUrl, supervisorName: signerName }),
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans print:bg-white print:text-black">
      <Navbar activeSection="reports" />

      {/* Screen Control Bar (Hidden when printing) */}
      <div className="no-print bg-slate-900/90 border-b border-slate-800 sticky top-16 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
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

          <div className="flex items-center gap-2.5">
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
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              ส่งออก CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              พิมพ์รายงาน A4 แนวนอน
            </button>
          </div>
        </div>
      </div>

      {/* Main Printable Report Sheet */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        {loading || !report ? (
          <div className="p-12 text-center text-slate-400 no-print">กำลังประมวลผลข้อมูลสรุปประจำเดือน...</div>
        ) : (
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl print:shadow-none print:p-0 print:rounded-none print:bg-white print:text-black">
            
            {/* Report Header */}
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

            {/* Dual Signature Block (Touch/Stylus Canvas or Blank Dotted Ink Pen Lines) */}
            <div className="mt-8 pt-6 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
              
              {/* Left: Staff Signature */}
              <div className="flex flex-col items-center justify-between min-h-[140px] p-4 bg-slate-50/70 border border-slate-200 rounded-2xl print:bg-white print:border-slate-300">
                <span className="font-bold text-slate-700 mb-1">ผู้จัดทำรายงาน (Reported by)</span>
                
                <div className="my-2 flex-1 flex items-center justify-center">
                  {report.signature?.staff_signature ? (
                    <img
                      src={report.signature.staff_signature}
                      alt="ลายเซ็นเจ้าหน้าที่"
                      className="max-h-16 w-auto object-contain"
                    />
                  ) : (
                    <div className="w-48 text-slate-400 font-mono text-[11px] py-3">
                      ........................................................
                      <span className="block text-[10px] text-slate-400 mt-1">(ลงลายมือชื่อด้วยปากกา)</span>
                    </div>
                  )}
                </div>

                <div className="text-slate-800">
                  <div className="font-bold">({report.signature?.staff_name || user.name})</div>
                  <div className="text-[11px] text-slate-500">เจ้าหน้าที่ฝ่ายสนับสนุนเทคนิค (IT Staff)</div>
                </div>
              </div>

              {/* Right: Supervisor Signature */}
              <div className="flex flex-col items-center justify-between min-h-[140px] p-4 bg-slate-50/70 border border-slate-200 rounded-2xl print:bg-white print:border-slate-300">
                <span className="font-bold text-slate-700 mb-1">ผู้ตรวจรับรองรายงาน (Approved by)</span>
                
                <div className="my-2 flex-1 flex items-center justify-center">
                  {report.signature?.supervisor_signature ? (
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

                <div className="text-slate-800">
                  <div className="font-bold">({report.signature?.supervisor_name || '...................................................'})</div>
                  <div className="text-[11px] text-slate-500">หัวหน้าฝ่ายไอที / ผู้จัดการ (IT Manager)</div>
                </div>
              </div>

            </div>

          </div>
        )}
      </main>

      {/* Signature Canvas Drawing Modal */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PenTool className="w-5 h-5 text-blue-500" />
                ลงลายมือชื่อดิจิทัล ({signingRole === 'staff' ? 'เจ้าหน้าที่ไอที' : 'ผู้ตรวจรับรอง'})
              </h3>
              <button
                onClick={() => setIsSignModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ชื่อ-นามสกุล ผู้ลงลายมือชื่อ
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-40 cursor-crosshair touch-none"
                  />
                </div>
              </div>
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
                disabled={!hasDrawn}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
              >
                บันทึกลายมือชื่อ
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
