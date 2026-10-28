'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth/auth-context';
import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  borrowAsset,
  returnAsset,
  getActiveLoans,
  getOverdueLoans,
  getAllBorrowLogs,
} from '@/lib/services/asset-service';
import { getDepartments } from '@/lib/services/master-data-service';
import { Asset, BorrowLog, AssetStatus, Department } from '@/types/database';
import {
  Laptop,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  Check,
  X,
  User,
  Building,
  RotateCcw,
  ShieldAlert,
  Calendar,
  Layers,
  Pencil,
  Trash2,
} from 'lucide-react';

export default function AdminAssetsPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'inventory' | 'active_loans' | 'history'>('inventory');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeLoans, setActiveLoans] = useState<BorrowLog[]>([]);
  const [overdueLoans, setOverdueLoans] = useState<BorrowLog[]>([]);
  const [allLogs, setAllLogs] = useState<BorrowLog[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);
  const [newAssetCode, setNewAssetCode] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState('Laptop');

  // Edit Asset Modal
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editAssetCode, setEditAssetCode] = useState('');
  const [editAssetName, setEditAssetName] = useState('');
  const [editAssetCategory, setEditAssetCategory] = useState('Laptop');
  const [editAssetStatus, setEditAssetStatus] = useState<AssetStatus>('available');

  // Delete Asset Modal
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);

  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [selectedAssetForBorrow, setSelectedAssetForBorrow] = useState<Asset | null>(null);
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerDeptId, setBorrowerDeptId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [conditionOut, setConditionOut] = useState('สภาพสมบูรณ์ พร้อมอุปกรณ์สายชาร์จครบ');
  const [borrowNotes, setBorrowNotes] = useState('');

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<BorrowLog | null>(null);
  const [conditionIn, setConditionIn] = useState('สภาพสมบูรณ์ พร้อมอุปกรณ์ครบ');
  const [returnNotes, setReturnNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [fetchedAssets, active, overdue, logs, depts] = await Promise.all([
      getAssets({
        status: statusFilter,
        category: categoryFilter || undefined,
        search: searchQuery || undefined,
      }),
      getActiveLoans(),
      getOverdueLoans(),
      getAllBorrowLogs(),
      getDepartments(),
    ]);

    setAssets(fetchedAssets);
    setActiveLoans(active);
    setOverdueLoans(overdue);
    setAllLogs(logs);
    setDepartments(depts);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, categoryFilter, searchQuery]);

  // Set default expected return date (tomorrow 17:00) inside useEffect
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);
    setExpectedReturnDate(tomorrow.toISOString().slice(0, 16));
  }, []);

  // Actor for audit logging
  const currentActor = user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  } : undefined;

  // Handle Create Asset
  const handleCreateAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetCode.trim() || !newAssetName.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = await createAsset({
      assetCode: newAssetCode.trim(),
      name: newAssetName.trim(),
      category: newAssetCategory,
      actor: currentActor,
    });

    setSubmitting(false);
    if (res.success) {
      setIsNewAssetModalOpen(false);
      setNewAssetCode('');
      setNewAssetName('');
      setSuccessMsg(`เพิ่มครุภัณฑ์ "${res.data?.asset_code}" เรียบร้อยแล้ว`);
      loadData();
    } else {
      setErrorMsg(res.error || 'เกิดข้อผิดพลาดในการเพิ่มครุภัณฑ์');
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (asset: Asset) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setEditingAsset(asset);
    setEditAssetCode(asset.asset_code);
    setEditAssetName(asset.name);
    setEditAssetCategory(asset.category);
    setEditAssetStatus(asset.status);
  };

  // Handle Save Edit Asset
  const handleSaveEditAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await updateAsset({
      assetId: editingAsset.id,
      assetCode: editAssetCode.trim(),
      name: editAssetName.trim(),
      category: editAssetCategory.trim(),
      status: editAssetStatus,
      actor: currentActor,
    });

    setSubmitting(false);
    if (res.success) {
      setSuccessMsg(`แก้ไขข้อมูลครุภัณฑ์ "${res.data?.asset_code}" เรียบร้อยแล้ว`);
      setEditingAsset(null);
      loadData();
    } else {
      setErrorMsg(res.error || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลครุภัณฑ์');
    }
  };

  // Handle Delete Asset
  const handleDeleteAsset = async () => {
    if (!deletingAsset) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await deleteAsset(deletingAsset.id, currentActor);
    setSubmitting(false);

    if (res.success) {
      setSuccessMsg(
        res.message || (res.softDeleted ? 'เปลี่ยนสถานะเป็นส่งซ่อมเนื่องจากมีประวัติการยืม' : 'ลบครุภัณฑ์เรียบร้อยแล้ว')
      );
      setDeletingAsset(null);
      loadData();
    } else {
      setErrorMsg(res.error || 'ไม่สามารถลบครุภัณฑ์ได้');
    }
  };

  // Open Borrow Modal
  const handleOpenBorrowModal = (asset?: Asset) => {
    setErrorMsg(null);
    if (asset) {
      setSelectedAssetForBorrow(asset);
    } else {
      const avail = assets.find((a) => a.status === 'available');
      setSelectedAssetForBorrow(avail || null);
    }
    setBorrowerName('');
    setIsBorrowModalOpen(true);
  };

  // Handle Borrow Submit
  const handleBorrowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedAssetForBorrow || !borrowerName.trim() || !expectedReturnDate) return;

    setSubmitting(true);
    setErrorMsg(null);
    const dept = departments.find((d) => d.id === borrowerDeptId);

    const res = await borrowAsset({
      assetId: selectedAssetForBorrow.id,
      borrowerName: borrowerName.trim(),
      borrowerDivisionId: dept?.division_id,
      borrowerDivisionName: dept?.division_name,
      borrowerDeptId: borrowerDeptId || undefined,
      borrowerDeptName: dept?.name,
      expectedReturnDate: new Date(expectedReturnDate).toISOString(),
      staffId: user.id,
      staffName: user.name,
      conditionOut: conditionOut.trim(),
      notes: borrowNotes.trim() || undefined,
    });

    setSubmitting(false);
    if (res.success) {
      setIsBorrowModalOpen(false);
      setSelectedAssetForBorrow(null);
      loadData();
    } else {
      setErrorMsg(res.error || 'เกิดข้อผิดพลาดในการบันทึกการยืม');
    }
  };

  // Open Return Modal
  const handleOpenReturnModal = (loan: BorrowLog) => {
    setErrorMsg(null);
    setSelectedLoanForReturn(loan);
    setConditionIn('สภาพสมบูรณ์ พร้อมอุปกรณ์ครบ');
    setReturnNotes('');
    setIsReturnModalOpen(true);
  };

  // Handle Return Submit
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForReturn) return;

    setSubmitting(true);
    setErrorMsg(null);
    const res = await returnAsset({
      logId: selectedLoanForReturn.id,
      conditionIn: conditionIn.trim(),
      notes: returnNotes.trim() || undefined,
    });

    setSubmitting(false);
    if (res.success) {
      setIsReturnModalOpen(false);
      setSelectedLoanForReturn(null);
      loadData();
    } else {
      setErrorMsg(res.error || 'เกิดข้อผิดพลาดในการบันทึกการคืน');
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar activeSection="assets" />
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

  // Count available assets
  const availableCount = assets.filter((a) => a.status === 'available').length;
  const borrowedCount = assets.filter((a) => a.status === 'borrowed').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar activeSection="assets" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Laptop className="w-7 h-7 text-blue-500" />
              จัดการครุภัณฑ์และบริการยืม-คืน (IT Asset & Loan Desk)
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              บันทึกรายการยืม-คืนอุปกรณ์ Walk-in ตรวจสอบสถานะครุภัณฑ์ และแจ้งเตือนอุปกรณ์เกินกำหนดส่งคืน
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleOpenBorrowModal()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/20 transition flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-4 h-4" />
              บันทึกการยืมเครื่อง (Walk-in)
            </button>
            <button
              onClick={() => {
                setErrorMsg(null);
                setSuccessMsg(null);
                setIsNewAssetModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              เพิ่มครุภัณฑ์
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Overdue Warning Alert Banner */}
        {overdueLoans.length > 0 && (
          <div className="bg-red-950/40 border border-red-500/60 p-4 sm:p-5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
              <span>แจ้งเตือน: มีอุปกรณ์เกินกำหนดส่งคืน ({overdueLoans.length} รายการ)!</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {overdueLoans.map((loan) => (
                <div key={loan.id} className="bg-slate-900/90 border border-red-500/40 p-3.5 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-red-400">{loan.asset_code}</span>
                    <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full font-bold">
                      เกินกำหนดส่งคืน
                    </span>
                  </div>
                  <div className="text-white font-medium">{loan.asset_name}</div>
                  <div className="text-slate-400 space-y-0.5">
                    <div>👤 ผู้ยืม: <span className="text-slate-200">{loan.borrower_name}</span> ({loan.borrower_dept_name || '-'})</div>
                    <div>⏰ กำหนดคืน: <span className="text-red-300 font-mono">{new Date(loan.expected_return_date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                  </div>
                  <button
                    onClick={() => handleOpenReturnModal(loan)}
                    className="w-full mt-2 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-[11px] font-semibold transition"
                  >
                    บันทึกการคืนทันที
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 font-medium">ครุภัณฑ์ทั้งหมด</span>
            <div className="text-2xl font-bold text-white mt-1">{assets.length}</div>
          </div>
          <div className="bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-xl">
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมใช้งาน (Available)
            </span>
            <div className="text-2xl font-bold text-emerald-300 mt-1">{availableCount}</div>
          </div>
          <div className="bg-blue-950/20 border border-blue-800/40 p-4 rounded-xl">
            <span className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5" /> กำลังถูกยืม (Borrowed)
            </span>
            <div className="text-2xl font-bold text-blue-300 mt-1">{borrowedCount}</div>
          </div>
          <div className="bg-red-950/20 border border-red-800/40 p-4 rounded-xl">
            <span className="text-xs text-red-400 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> เกินกำหนด (Overdue)
            </span>
            <div className="text-2xl font-bold text-red-300 mt-1">{overdueLoans.length}</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'inventory'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            คลังครุภัณฑ์ทั้งหมด ({assets.length})
          </button>
          <button
            onClick={() => setActiveTab('active_loans')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'active_loans'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            รายการกำลังถูกยืม ({activeLoans.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            ประวัติการยืม-คืน ({allLogs.length})
          </button>
        </div>

        {/* Tab 1: Inventory List */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาตามรหัสครุภัณฑ์ (NB-IT-...), ชื่อรุ่น, หรือหมวดหมู่..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทุกสถานะครุภัณฑ์</option>
                <option value="available">พร้อมใช้งาน (Available)</option>
                <option value="borrowed">กำลังถูกยืม (Borrowed)</option>
                <option value="maintenance">ซ่อมบำรุง (Maintenance)</option>
              </select>
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-800/40">
                        {asset.asset_code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                            asset.status === 'available'
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                              : asset.status === 'borrowed'
                              ? 'bg-blue-950/40 text-blue-300 border-blue-800/50'
                              : 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                          }`}
                        >
                          {asset.status === 'available' && 'พร้อมใช้งาน'}
                          {asset.status === 'borrowed' && 'กำลังถูกยืม'}
                          {asset.status === 'maintenance' && 'ส่งซ่อม/บำรุง'}
                        </span>
                        <button
                          onClick={() => handleOpenEditModal(asset)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="แก้ไขข้อมูลครุภัณฑ์"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingAsset(asset)}
                          className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 transition"
                          title="ลบครุภัณฑ์"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1">{asset.name}</h3>
                    <div className="text-xs text-slate-400">
                      หมวดหมู่: <span className="text-slate-300 font-medium">{asset.category}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800">
                    {asset.status === 'available' ? (
                      <button
                        onClick={() => handleOpenBorrowModal(asset)}
                        className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        ทำรายการยืม (Walk-in)
                      </button>
                    ) : asset.status === 'borrowed' ? (
                      <div className="text-xs text-slate-400 text-center py-2 bg-slate-800/50 rounded-xl">
                        กำลังถูกยืมใช้งาน
                      </div>
                    ) : (
                      <div className="text-xs text-amber-400 text-center py-2 bg-amber-950/30 rounded-xl border border-amber-800/40">
                        อยู่ระหว่างส่งซ่อม
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Active Loans & Check-in Return */}
        {activeTab === 'active_loans' && (
          <div className="space-y-4">
            {activeLoans.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">ไม่มีอุปกรณ์ที่ถูกยืมอยู่ในขณะนี้</h3>
                <p className="text-xs text-slate-500 mt-1">ครุภัณฑ์ทุกชิ้นอยู่ในคลังพร้อมให้บริการ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className={`bg-slate-900/70 border rounded-2xl p-5 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      loan.is_overdue ? 'border-red-500/60 bg-red-950/10' : 'border-slate-800'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                          {loan.asset_code}
                        </span>
                        {loan.is_overdue && (
                          <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full font-bold">
                            ⚠️ เกินกำหนดส่งคืน
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white">{loan.asset_name}</h3>

                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-4">
                        <span>👤 ผู้ยืม: <strong className="text-white">{loan.borrower_name}</strong> ({loan.borrower_dept_name || '-'})</span>
                        <span>📅 ยืมเมื่อ: {new Date(loan.borrow_date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        <span>⏰ กำหนดส่งคืน: <strong className={loan.is_overdue ? 'text-red-400' : 'text-slate-300'}>{new Date(loan.expected_return_date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</strong></span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        สภาพตอนยืม: {loan.condition_out}
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenReturnModal(loan)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5 self-start md:self-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      บันทึกการส่งคืน (Return)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Loan History */}
        {activeTab === 'history' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/70 text-slate-400 border-b border-slate-700/60 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">รหัสครุภัณฑ์</th>
                    <th className="p-3.5">ชื่ออุปกรณ์</th>
                    <th className="p-3.5">ผู้ยืม / แผนก</th>
                    <th className="p-3.5">วันที่ยืม</th>
                    <th className="p-3.5">วันที่คืนจริง</th>
                    <th className="p-3.5">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {allLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono text-blue-400 font-bold">{log.asset_code}</td>
                      <td className="p-3.5 font-medium text-white">{log.asset_name}</td>
                      <td className="p-3.5">{log.borrower_name} ({log.borrower_dept_name || '-'})</td>
                      <td className="p-3.5">{new Date(log.borrow_date).toLocaleDateString('th-TH')}</td>
                      <td className="p-3.5">
                        {log.actual_return_date ? (
                          <span className="text-emerald-400">
                            {new Date(log.actual_return_date).toLocaleDateString('th-TH')}
                          </span>
                        ) : (
                          <span className="text-amber-400 font-medium">ยังไม่ส่งคืน</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {log.actual_return_date ? (
                          <span className="text-emerald-400 font-medium">คืนแล้ว</span>
                        ) : log.is_overdue ? (
                          <span className="text-red-400 font-bold">เกินกำหนด</span>
                        ) : (
                          <span className="text-blue-400 font-medium">กำลังยืม</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal: New Asset */}
      {isNewAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Laptop className="w-5 h-5 text-blue-500" />
                ลงทะเบียนครุภัณฑ์ไอทีใหม่
              </h3>
              <button
                onClick={() => setIsNewAssetModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateAssetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  รหัสครุภัณฑ์ (Asset Code) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น NB-IT-004, PRJ-IT-002"
                  value={newAssetCode}
                  onChange={(e) => setNewAssetCode(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ชื่อและรุ่นอุปกรณ์ <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Dell Latitude 5430, EPSON EB-X51"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  หมวดหมู่อุปกรณ์
                </label>
                <select
                  value={newAssetCategory}
                  onChange={(e) => setNewAssetCategory(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Laptop">โน้ตบุ๊ก (Laptop)</option>
                  <option value="Projector">โปรเจคเตอร์ (Projector)</option>
                  <option value="Adapter">หัวแปลง / Adapter</option>
                  <option value="Microphone">ไมโครโฟน / เครื่องเสียง</option>
                  <option value="Printer">เครื่องพิมพ์ / สแกนเนอร์</option>
                  <option value="Other">อุปกรณ์อื่นๆ</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewAssetModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกครุภัณฑ์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Borrow Walk-in */}
      {isBorrowModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                บันทึกการยืมเครื่อง (Walk-in Loan Desk)
              </h3>
              <button
                onClick={() => setIsBorrowModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleBorrowSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  เลือกอุปกรณ์ที่จะยืม <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedAssetForBorrow?.id || ''}
                  onChange={(e) => {
                    const found = assets.find((a) => a.id === e.target.value);
                    setSelectedAssetForBorrow(found || null);
                  }}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                >
                  {assets
                    .filter((a) => a.status === 'available')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.asset_code} - {a.name} ({a.category})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    ชื่อผู้ยืม <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมชาย มีสุข"
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    แผนกของผู้ยืม
                  </label>
                  <select
                    value={borrowerDeptId}
                    onChange={(e) => setBorrowerDeptId(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">เลือกแผนก</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.division_name ? `${d.division_name} - ` : ''}{d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  กำหนดวันเวลาที่ต้องส่งคืน <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  สภาพเครื่องตอนส่งมอบ
                </label>
                <input
                  type="text"
                  value={conditionOut}
                  onChange={(e) => setConditionOut(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBorrowModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedAssetForBorrow}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {submitting ? 'กำลังบันทึก...' : 'ยืนยันการยืม'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Return Asset */}
      {isReturnModalOpen && selectedLoanForReturn && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-emerald-400" />
                บันทึกการส่งคืนครุภัณฑ์
              </h3>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-xl text-xs space-y-1">
              <div>รหัสครุภัณฑ์: <span className="font-mono text-blue-400 font-bold">{selectedLoanForReturn.asset_code}</span></div>
              <div>ชื่ออุปกรณ์: <span className="text-white font-medium">{selectedLoanForReturn.asset_name}</span></div>
              <div>ผู้ยืม: <span className="text-white font-medium">{selectedLoanForReturn.borrower_name}</span></div>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  สภาพเครื่องตอนรับคืน <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สภาพสมบูรณ์, มีรอยขีดข่วนเล็กน้อย, แบตเตอรี่ปกติ"
                  value={conditionIn}
                  onChange={(e) => setConditionIn(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  หมายเหตุเพิ่มเติม
                </label>
                <input
                  type="text"
                  placeholder="เช่น คืนอุปกรณ์สายชาร์จครบ, เมาส์ครบชุด"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {submitting ? 'กำลังบันทึก...' : 'ยืนยันรับคืนอุปกรณ์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Asset */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-400" />
                แก้ไขข้อมูลครุภัณฑ์
              </h3>
              <button
                onClick={() => setEditingAsset(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  รหัสครุภัณฑ์ (Asset Code) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editAssetCode}
                  onChange={(e) => setEditAssetCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ชื่อ / รุ่นอุปกรณ์ <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editAssetName}
                  onChange={(e) => setEditAssetName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    หมวดหมู่
                  </label>
                  <select
                    value={editAssetCategory}
                    onChange={(e) => setEditAssetCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Laptop">Laptop / Notebook</option>
                    <option value="Projector">Projector / เครื่องฉาย</option>
                    <option value="Accessories">Accessories / สายต่อ</option>
                    <option value="Network">Network / เราเตอร์พกพา</option>
                    <option value="Camera">Camera / กล้องบันทึก</option>
                    <option value="Microphone">Microphone / ไมค์ไร้สาย</option>
                    <option value="Speaker">Speaker / ลำโพงพกพา</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    สถานะปัจจุบัน
                  </label>
                  <select
                    value={editAssetStatus}
                    onChange={(e) => setEditAssetStatus(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="available">พร้อมใช้งาน</option>
                    <option value="borrowed">กำลังถูกยืม</option>
                    <option value="maintenance">ส่งซ่อม/บำรุง</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Asset Confirm */}
      {deletingAsset && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">ยืนยันการลบครุภัณฑ์?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              คุณต้องการลบครุภัณฑ์ <strong className="text-white">{deletingAsset.asset_code}</strong> ({deletingAsset.name}) หรือไม่?
            </p>
            <p className="text-[11px] text-amber-400/90 bg-amber-950/20 border border-amber-800/30 p-2.5 rounded-xl text-left">
              💡 หมายเหตุ: หากครุภัณฑ์นี้เคยมีประวัติการยืม-คืนในอดีต ระบบจะเปลี่ยนสถานะเป็นส่งซ่อม/ระงับใช้งานแทน เพื่อคงประวัติการยืมในรายงาน
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAsset(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteAsset}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition shadow-md shadow-red-600/20"
              >
                {submitting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
