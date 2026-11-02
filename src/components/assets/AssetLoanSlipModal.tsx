'use client';

import React from 'react';
import { BorrowLog } from '@/types/database';
import { Printer, X, Laptop, Scissors } from 'lucide-react';

interface AssetLoanSlipModalProps {
  loan: BorrowLog;
  onClose: () => void;
}

export default function AssetLoanSlipModal({ loan, onClose }: AssetLoanSlipModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const borrowDateObj = new Date(loan.borrow_date);
  const borrowDateFormatted = borrowDateObj.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const borrowTimeFormatted = borrowDateObj.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const returnDateObj = new Date(loan.expected_return_date);
  const returnDateFormatted = returnDateObj.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const renderSlipPart = (copyType: 'ต้นฉบับ (สำหรับฝ่ายไอที)' | 'สำเนา (สำหรับผู้ยืมอุปกรณ์)') => (
    <div className="p-5 border border-slate-300 rounded-xl bg-white text-slate-900 text-xs flex flex-col justify-between h-[132mm] print:h-[135mm] box-border">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-2 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              IT
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-950 uppercase tracking-tight">
                ศูนย์เทคโนโลยีสารสนเทศและแผนกสนับสนุนเทคนิค
              </h2>
              <p className="text-[10px] text-slate-600">
                แบบฟอร์มการขอยืมและส่งมอบอุปกรณ์คอมพิวเตอร์ (IT Equipment Loan Agreement Form)
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
              {copyType}
            </span>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              รหัสอ้างอิง: <strong className="text-slate-900">{loan.id}</strong>
            </div>
          </div>
        </div>

        {/* Borrower & Loan Info Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2.5 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 text-[11px]">
          <div>
            <span className="text-slate-500">ชื่อผู้ขอยืม / ผู้รับมอบ: </span>
            <strong className="text-slate-900">{loan.borrower_name}</strong>
          </div>
          <div>
            <span className="text-slate-500">ฝ่าย/แผนก: </span>
            <strong className="text-slate-900">{loan.borrower_dept_name || loan.borrower_division_name || '-'}</strong>
          </div>
          <div>
            <span className="text-slate-500">วัน-เวลาที่ยืม: </span>
            <strong className="text-slate-900">{borrowDateFormatted} ({borrowTimeFormatted} น.)</strong>
          </div>
          <div>
            <span className="text-slate-500">กำหนดส่งคืนภายใน: </span>
            <strong className="text-red-700 font-semibold">{returnDateFormatted}</strong>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500">สภาพอุปกรณ์ขณะส่งมอบ: </span>
            <span className="text-slate-800 font-medium">{loan.condition_out || 'สภาพสมบูรณ์ พร้อมอุปกรณ์สายชาร์จครบ'}</span>
          </div>
          {loan.notes && (
            <div className="col-span-2 text-[10px] text-slate-500">
              หมายเหตุ: {loan.notes}
            </div>
          )}
        </div>

        {/* Equipment Table */}
        <table className="w-full text-left border-collapse border border-slate-300 text-[11px] mb-2">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold">
              <th className="py-1.5 px-2 w-10 text-center border-r border-slate-300">ลำดับ</th>
              <th className="py-1.5 px-2 w-32 border-r border-slate-300">รหัสครุภัณฑ์/อุปกรณ์</th>
              <th className="py-1.5 px-2 border-r border-slate-300">รายการครุภัณฑ์และสเปก</th>
              <th className="py-1.5 px-2 w-20 text-center border-r border-slate-300">จำนวน</th>
              <th className="py-1.5 px-2 w-28 text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-2 text-center text-slate-500 border-r border-slate-300">1</td>
              <td className="py-1.5 px-2 font-mono text-blue-700 border-r border-slate-300">{loan.asset_code || '-'}</td>
              <td className="py-1.5 px-2 font-bold text-slate-900 border-r border-slate-300">{loan.asset_name}</td>
              <td className="py-1.5 px-2 text-center text-slate-900 border-r border-slate-300 font-semibold">1 เครื่อง</td>
              <td className="py-1.5 px-2 text-center text-emerald-700 font-medium">ยืมใช้งาน</td>
            </tr>
          </tbody>
        </table>

        {/* Terms Agreement Note */}
        <p className="text-[9.5px] text-slate-500 leading-tight mb-2 italic">
          * ข้าพเจ้ารับมอบอุปกรณ์ข้างต้นในสภาพสมบูรณ์ และจะดูแลรักษาอย่างระมัดระวัง พร้อมส่งคืนภายในวันที่กำหนด หากเกิดการชำรุดหรือสูญหาย ข้าพเจ้ายินดีรับผิดชอบตามระเบียบของหน่วยงาน
        </p>
      </div>

      {/* Dual Signature Blocks & Return Section */}
      <div className="border-t border-slate-200 pt-2 space-y-2">
        <div className="grid grid-cols-2 gap-4 text-center text-[10px]">
          {/* Borrower Signature */}
          <div className="space-y-0.5">
            <p className="text-slate-600 font-medium">ลงชื่อผู้ยืม / ผู้รับมอบอุปกรณ์</p>
            <div className="h-7 flex items-end justify-center">
              <span className="text-slate-400">....................................................................</span>
            </div>
            <p className="font-bold text-slate-900">({loan.borrower_name})</p>
            <p className="text-slate-500">วันที่: {borrowDateFormatted}</p>
          </div>

          {/* IT Staff Signature */}
          <div className="space-y-0.5">
            <p className="text-slate-600 font-medium">ลงชื่อเจ้าหน้าที่ไอทีผู้ส่งมอบ</p>
            <div className="h-7 flex items-end justify-center">
              <span className="text-slate-400">....................................................................</span>
            </div>
            <p className="font-bold text-slate-900">({loan.staff_name || 'เจ้าหน้าที่ประจำการคลัง IT'})</p>
            <p className="text-slate-500">วันที่: {borrowDateFormatted}</p>
          </div>
        </div>

        {/* Section: For Return Check-in (เซ็นรับคืนเมื่อนำมาส่ง) */}
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-[9.5px] grid grid-cols-3 gap-2 items-center">
          <div className="col-span-1 text-slate-600">
            <span className="font-bold text-slate-800 block">ส่วนบันทึกการส่งคืน:</span>
            วันที่ส่งคืนจริง: _____/_____/_________
          </div>
          <div className="col-span-1 text-slate-600">
            สภาพตอนส่งคืน:
            <div className="flex items-center gap-2 mt-0.5">
              <span>[ &nbsp; ] ปกติสมบูรณ์</span>
              <span>[ &nbsp; ] ชำรุด/สูญหาย</span>
            </div>
          </div>
          <div className="col-span-1 text-center">
            <span className="text-slate-400">..................................................</span>
            <span className="block text-slate-600 mt-0.5">(เจ้าหน้าที่ผู้ตรวจรับคืน)</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      {/* Top Action Toolbar (Hidden during print) */}
      <div className="w-full max-w-4xl space-y-4 my-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-2xl no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ตัวอย่างเอกสารก่อนพิมพ์ (Print Preview)
              </h3>
              <p className="text-xs text-slate-400">
                ใบยืม-คืนอุปกรณ์ #{loan.asset_code} (A4 แบ่ง 2 ส่วน: ต้นฉบับฝ่ายไอที + สำเนาผู้ยืม)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              พิมพ์เอกสาร (Print)
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Slip Container (A4 Portrait, 2 parts) */}
        <div
          id="loan-printable-sheet"
          className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-4 print:p-0 print:shadow-none print:rounded-none max-w-[210mm] mx-auto"
        >
          {/* Part 1: Original for IT */}
          {renderSlipPart('ต้นฉบับ (สำหรับฝ่ายไอที)')}

          {/* Cut Line */}
          <div className="flex items-center gap-2 text-slate-400 text-[10px] my-2 select-none">
            <Scissors className="w-3.5 h-3.5" />
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
            <span>ตัดตามรอยประ (Tear / Cut Here)</span>
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
          </div>

          {/* Part 2: Copy for Borrower */}
          {renderSlipPart('สำเนา (สำหรับผู้ยืมอุปกรณ์)')}
        </div>
      </div>

      {/* Scoped Print CSS for A4 Portrait */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 6mm 8mm;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #loan-printable-sheet,
          #loan-printable-sheet * {
            visibility: visible;
          }
          #loan-printable-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

