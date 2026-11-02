'use client';

import React from 'react';
import { SupplyRequisition } from '@/types/database';
import { Printer, X, FileText, CheckCircle2, Scissors } from 'lucide-react';

interface SupplyRequisitionSlipModalProps {
  requisition: SupplyRequisition;
  onClose: () => void;
}

export default function SupplyRequisitionSlipModal({
  requisition,
  onClose,
}: SupplyRequisitionSlipModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const reqDate = new Date(requisition.requisition_date || requisition.created_at);
  const dateFormatted = reqDate.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatted = reqDate.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const renderSlipPart = (copyType: 'ต้นฉบับ (สำหรับฝ่ายไอที)' | 'สำเนา (สำหรับผู้ขอเบิก)') => (
    <div className="p-5 border border-slate-300 rounded-xl bg-white text-slate-900 text-xs flex flex-col justify-between h-[132mm] print:h-[135mm] box-border">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              IT
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-950 uppercase tracking-tight">
                ศูนย์เทคโนโลยีสารสนเทศและแผนกสนับสนุนเทคนิค
              </h2>
              <p className="text-[10px] text-slate-600">
                ใบสำคัญการเบิกจ่ายพัสดุและวัสดุสิ้นเปลือง (IT Supplies Requisition Slip)
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
              {copyType}
            </span>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              เลขที่: <strong className="text-slate-900">{requisition.requisition_number}</strong>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 text-[11px]">
          <div>
            <span className="text-slate-500">วันที่-เวลาทำรายการ: </span>
            <strong className="text-slate-900">{dateFormatted} เวลา {timeFormatted} น.</strong>
          </div>
          <div>
            <span className="text-slate-500">ใบแจ้งซ่อมที่เกี่ยวข้อง: </span>
            <strong className="text-blue-700 font-mono">{requisition.ticket_id || '-'}</strong>
          </div>
          <div>
            <span className="text-slate-500">ผู้ขอเบิก / ผู้รับพัสดุ: </span>
            <strong className="text-slate-900">{requisition.recipient_name}</strong>
            {requisition.recipient_employee_id && (
              <span className="text-slate-500 font-mono text-[10px]"> ({requisition.recipient_employee_id})</span>
            )}
          </div>
          <div>
            <span className="text-slate-500">ฝ่าย/แผนก: </span>
            <strong className="text-slate-900">{requisition.department_name || '-'}</strong>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500">วัตถุประสงค์การนำไปใช้: </span>
            <span className="text-slate-900">{requisition.purpose}</span>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-left border-collapse border border-slate-300 text-[11px] mb-3">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold">
              <th className="py-1.5 px-2 w-10 text-center border-r border-slate-300">ลำดับ</th>
              <th className="py-1.5 px-2 w-28 border-r border-slate-300">รหัสพัสดุ</th>
              <th className="py-1.5 px-2 border-r border-slate-300">ชื่อรายการพัสดุ / วัสดุ</th>
              <th className="py-1.5 px-2 w-20 text-center border-r border-slate-300">จำนวนที่เบิก</th>
              <th className="py-1.5 px-2 w-16 text-center">หน่วยนับ</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-2 px-2 text-center text-slate-500 border-r border-slate-300">1</td>
              <td className="py-2 px-2 font-mono text-blue-700 border-r border-slate-300">{requisition.item_code || '-'}</td>
              <td className="py-2 px-2 font-bold text-slate-900 border-r border-slate-300">{requisition.item_name}</td>
              <td className="py-2 px-2 text-center font-bold text-slate-900 border-r border-slate-300">{requisition.quantity}</td>
              <td className="py-2 px-2 text-center text-slate-700">{requisition.unit || 'ชิ้น'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature Section */}
      <div className="border-t border-slate-200 pt-3 grid grid-cols-2 gap-6 text-center text-[10px]">
        {/* Recipient Signature */}
        <div className="space-y-1">
          <p className="text-slate-600 font-medium">ลงชื่อผู้ขอเบิก / ผู้รับมอบพัสดุ</p>
          <div className="h-9 flex items-end justify-center">
            <span className="text-slate-400">....................................................................</span>
          </div>
          <p className="font-bold text-slate-900">({requisition.recipient_name})</p>
          <p className="text-slate-500">วันที่: {dateFormatted}</p>
        </div>

        {/* Staff Issuer Signature */}
        <div className="space-y-1">
          <p className="text-slate-600 font-medium">ลงชื่อเจ้าหน้าที่ไอทีผู้จ่ายพัสดุ</p>
          <div className="h-9 flex items-end justify-center">
            <span className="text-slate-400">....................................................................</span>
          </div>
          <p className="font-bold text-slate-900">({requisition.issuer_staff_name || 'เจ้าหน้าที่ประจำการคลัง IT'})</p>
          <p className="text-slate-500">วันที่: {dateFormatted}</p>
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
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ตัวอย่างเอกสารก่อนพิมพ์ (Print Preview)
              </h3>
              <p className="text-xs text-slate-400">
                ใบสำคัญเบิกพัสดุ #{requisition.requisition_number} (A4 แบ่ง 2 ส่วน: ต้นฉบับ + สำเนา)
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
          id="requisition-printable-sheet"
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

          {/* Part 2: Copy for Recipient */}
          {renderSlipPart('สำเนา (สำหรับผู้ขอเบิก)')}
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
          #requisition-printable-sheet,
          #requisition-printable-sheet * {
            visibility: visible;
          }
          #requisition-printable-sheet {
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
