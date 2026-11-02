'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth/auth-context';
import {
  getSupplies,
  createSupply,
  updateSupply,
  deleteSupply,
  restockSupply,
  createRequisition,
  getRequisitions,
} from '@/lib/services/supply-service';
import { getDepartments } from '@/lib/services/master-data-service';
import { SupplyItem, SupplyRequisition, SupplyStatus, Department } from '@/types/database';
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Pencil,
  Trash2,
  TrendingDown,
  ShoppingBag,
  Building,
  User,
  ArrowRight,
  FileText,
  Boxes,
  Check,
  X,
  RefreshCw,
  Archive,
} from 'lucide-react';

export default function AdminSuppliesPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'inventory' | 'requisitions'>('inventory');
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [requisitions, setRequisitions] = useState<SupplyRequisition[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for Inventory
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplyStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filters for Requisitions
  const [reqSearchQuery, setReqSearchQuery] = useState('');
  const [reqMonthFilter, setReqMonthFilter] = useState('2026-10');

  // Modal: Add Supply
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('สายสัญญาณและเน็ตเวิร์ก');
  const [newQuantity, setNewQuantity] = useState(10);
  const [newMinQuantity, setNewMinQuantity] = useState(5);
  const [newUnit, setNewUnit] = useState('เส้น');
  const [newUnitPrice, setNewUnitPrice] = useState<number | ''>(150);
  const [newLocation, setNewLocation] = useState('ตู้เก็บของ IT');

  // Modal: Edit Supply
  const [editingSupply, setEditingSupply] = useState<SupplyItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editMinQuantity, setEditMinQuantity] = useState(0);
  const [editUnit, setEditUnit] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState<number | ''>('');
  const [editLocation, setEditLocation] = useState('');

  // Modal: Restock Supply
  const [restockingSupply, setRestockingSupply] = useState<SupplyItem | null>(null);
  const [restockAmount, setRestockAmount] = useState(10);
  const [restockNotes, setRestockNotes] = useState('');

  // Modal: Delete Supply
  const [deletingSupply, setDeletingSupply] = useState<SupplyItem | null>(null);

  // Modal: Requisition (Direct Issue)
  const [isRequisitionModalOpen, setIsRequisitionModalOpen] = useState(false);
  const [selectedSupplyId, setSelectedSupplyId] = useState('');
  const [reqQuantity, setReqQuantity] = useState(1);
  const [reqRecipientName, setReqRecipientName] = useState('');
  const [reqDepartmentId, setReqDepartmentId] = useState('');
  const [reqPurpose, setReqPurpose] = useState('');
  const [reqTicketId, setReqTicketId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currentActor = user
    ? {
        id: user.id || 'staff',
        name: user.name || 'เจ้าหน้าที่ไอที',
        email: user.email || 'it@support.local',
        role: user.role || 'admin',
      }
    : undefined;

  const loadData = async () => {
    setLoading(true);
    try {
      const [suppliesData, deptsData, reqsData] = await Promise.all([
        getSupplies({
          category: categoryFilter || undefined,
          status: statusFilter,
          search: searchQuery || undefined,
        }),
        getDepartments(),
        getRequisitions(),
      ]);
      setSupplies(suppliesData);
      setDepartments(deptsData);
      setRequisitions(reqsData);
    } catch (err) {
      console.error('Failed to load supplies data:', err);
      setErrorMsg('ไม่สามารถโหลดข้อมูลวัสดุได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    setReqMonthFilter(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  useEffect(() => {
    loadData();
  }, [categoryFilter, statusFilter, searchQuery]);

  // Toast auto-clear
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // KPI Calculations
  const totalItems = supplies.length;
  const inStockCount = supplies.filter((s) => s.status === 'in_stock').length;
  const lowStockCount = supplies.filter((s) => s.status === 'low_stock').length;
  const outOfStockCount = supplies.filter((s) => s.status === 'out_of_stock').length;

  // Filter requisitions by month
  const monthFilteredReqs = requisitions.filter((r) => {
    if (!reqMonthFilter) return true;
    const [y, m] = reqMonthFilter.split('-');
    const d = new Date(r.requisition_date || r.created_at);
    return d.getFullYear() === Number(y) && d.getMonth() + 1 === Number(m);
  });
  const totalRequisitionsCount = monthFilteredReqs.length;

  // Categories list
  const availableCategories = Array.from(
    new Set([
      'สายสัญญาณและเน็ตเวิร์ก',
      'อุปกรณ์ต่อพ่วง',
      'หมึกพิมพ์และเครื่องพิมพ์',
      'พลังงานและแบตเตอรี่',
      'อุปกรณ์เน็ตเวิร์ก',
      'อะไหล่ฮาร์ดแวร์',
      'วัสดุสำนักงานไอที',
      ...supplies.map((s) => s.category),
    ])
  ).filter(Boolean);

  // Handle Add Supply
  const handleAddSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      setErrorMsg('กรุณากรอกรหัสพัสดุและชื่อวัสดุ');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await createSupply({
        itemCode: newCode.trim(),
        name: newName.trim(),
        category: newCategory,
        quantity: Number(newQuantity) || 0,
        minQuantity: Number(newMinQuantity) || 0,
        unit: newUnit.trim() || 'ชิ้น',
        unitPrice: newUnitPrice ? Number(newUnitPrice) : undefined,
        location: newLocation.trim() || undefined,
        actor: currentActor,
      });

      if (result.success) {
        setSuccessMsg(`เพิ่มวัสดุ "${newName}" สำเร็จ`);
        setIsAddModalOpen(false);
        setNewCode('');
        setNewName('');
        setNewQuantity(10);
        setNewMinQuantity(5);
        setNewUnitPrice(150);
        await loadData();
      } else {
        setErrorMsg(result.error || 'ไม่สามารถเพิ่มวัสดุได้');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item: SupplyItem) => {
    setEditingSupply(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditMinQuantity(item.min_quantity);
    setEditUnit(item.unit);
    setEditUnitPrice(item.unit_price ?? '');
    setEditLocation(item.location || '');
  };

  // Handle Update Supply
  const handleUpdateSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupply) return;
    if (!editName.trim()) {
      setErrorMsg('กรุณากรอกชื่อวัสดุ');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await updateSupply(editingSupply.id, {
        name: editName.trim(),
        category: editCategory,
        minQuantity: Number(editMinQuantity),
        unit: editUnit.trim() || 'ชิ้น',
        unitPrice: editUnitPrice !== '' ? Number(editUnitPrice) : undefined,
        location: editLocation.trim() || undefined,
        actor: currentActor,
      });

      if (result.success) {
        setSuccessMsg(`แก้ไขข้อมูล "${editName}" สำเร็จ`);
        setEditingSupply(null);
        await loadData();
      } else {
        setErrorMsg(result.error || 'ไม่สามารถแก้ไขข้อมูลได้');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Restock
  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingSupply) return;
    if (restockAmount <= 0) {
      setErrorMsg('กรุณาระบุจำนวนที่เติมให้ถูกต้อง (มากกว่า 0)');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await restockSupply(
        restockingSupply.id,
        Number(restockAmount),
        restockNotes.trim() || undefined,
        currentActor
      );

      if (result.success) {
        setSuccessMsg(`เติมสต็อก "${restockingSupply.name}" จำนวน +${restockAmount} ${restockingSupply.unit} เรียบร้อยแล้ว`);
        setRestockingSupply(null);
        setRestockAmount(10);
        setRestockNotes('');
        await loadData();
      } else {
        setErrorMsg(result.error || 'ไม่สามารถเติมสต็อกได้');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเติมสต็อก');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Supply
  const handleDeleteSupply = async () => {
    if (!deletingSupply) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await deleteSupply(deletingSupply.id, currentActor);
      if (result.success) {
        setSuccessMsg(`ลบรายการวัสดุ "${deletingSupply.name}" เรียบร้อยแล้ว`);
        setDeletingSupply(null);
        await loadData();
      } else {
        setErrorMsg(result.error || 'ไม่สามารถลบรายการได้');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการลบรายการ');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Requisition Modal
  const openRequisitionModal = (preselectedSupply?: SupplyItem) => {
    if (preselectedSupply) {
      setSelectedSupplyId(preselectedSupply.id);
    } else if (supplies.length > 0) {
      const firstAvailable = supplies.find((s) => s.quantity > 0) || supplies[0];
      setSelectedSupplyId(firstAvailable.id);
    }
    setReqQuantity(1);
    setReqRecipientName('');
    if (departments.length > 0) {
      setReqDepartmentId(departments[0].id);
    }
    setReqPurpose('');
    setReqTicketId('');
    setIsRequisitionModalOpen(true);
  };

  // Handle Create Requisition
  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = supplies.find((s) => s.id === selectedSupplyId);
    if (!item) {
      setErrorMsg('กรุณาเลือกวัสดุที่ต้องการเบิก');
      return;
    }
    if (reqQuantity <= 0) {
      setErrorMsg('จำนวนที่เบิกต้องมากกว่า 0');
      return;
    }
    if (reqQuantity > item.quantity) {
      setErrorMsg(`จำนวนคงเหลือไม่พอ (มีเพียง ${item.quantity} ${item.unit})`);
      return;
    }
    if (!reqRecipientName.trim()) {
      setErrorMsg('กรุณาระบุชื่อผู้เบิก');
      return;
    }
    const dept = departments.find((d) => d.id === reqDepartmentId);
    if (!dept) {
      setErrorMsg('กรุณาเลือกแผนก/ฝ่าย');
      return;
    }
    if (!reqPurpose.trim()) {
      setErrorMsg('กรุณาระบุวัตถุประสงค์การใช้งาน');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await createRequisition({
        itemId: item.id,
        quantity: Number(reqQuantity),
        recipientName: reqRecipientName.trim(),
        divisionId: dept.division_id,
        divisionName: dept.division_name,
        departmentId: dept.id,
        departmentName: dept.name,
        purpose: reqPurpose.trim(),
        ticketId: reqTicketId.trim() || undefined,
        issuerStaffId: user?.id,
        issuerStaffName: user?.name || 'IT Staff',
        actor: currentActor,
      });

      if (result.success) {
        setSuccessMsg(`ทำรายการเบิก "${item.name}" จำนวน ${reqQuantity} ${item.unit} สำเร็จ (ตัดสต็อกแล้ว)`);
        setIsRequisitionModalOpen(false);
        await loadData();
      } else {
        setErrorMsg(result.error || 'ไม่สามารถทำรายการเบิกได้');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกรายการเบิก');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered requisitions list
  const filteredRequisitions = monthFilteredReqs.filter((r) => {
    if (!reqSearchQuery) return true;
    const q = reqSearchQuery.toLowerCase();
    return (
      (r.item_name && r.item_name.toLowerCase().includes(q)) ||
      (r.item_code && r.item_code.toLowerCase().includes(q)) ||
      (r.requisition_number && r.requisition_number.toLowerCase().includes(q)) ||
      (r.recipient_name && r.recipient_name.toLowerCase().includes(q)) ||
      (r.department_name && r.department_name.toLowerCase().includes(q)) ||
      (r.purpose && r.purpose.toLowerCase().includes(q)) ||
      (r.ticket_id && r.ticket_id.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: SupplyStatus) => {
    switch (status) {
      case 'in_stock':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            สต็อกพร้อมจ่าย
          </span>
        );
      case 'low_stock':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            ใกล้หมดสต็อก
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            หมดสต็อก
          </span>
        );
    }
  };

  const selectedSupplyForReq = supplies.find((s) => s.id === selectedSupplyId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <Navbar activeSection="supplies" />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Header & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Package className="w-7 h-7 text-blue-400" />
              ระบบคลังพัสดุและเบิกจ่ายวัสดุไอที
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              จัดการสต็อกอุปกรณ์สิ้นเปลือง อะไหล่ช่าง และบันทึกประวัติการเบิกใช้วัสดุประจำแผนก
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => openRequisitionModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition shadow-lg shadow-emerald-950/40"
            >
              <ShoppingBag className="w-4 h-4" />
              ทำรายการเบิกวัสดุ
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition shadow-lg shadow-blue-950/40"
            >
              <Plus className="w-4 h-4" />
              เพิ่มวัสดุใหม่
            </button>
          </div>
        </div>

        {/* Toast Alerts */}
        {successMsg && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 text-sm animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">รายการวัสดุทั้งหมด</p>
              <p className="text-2xl font-bold text-white mt-1">{totalItems}</p>
              <span className="text-[11px] text-slate-500">ประเภทรายการในคลัง</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Boxes className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">สต็อกพร้อมจ่าย</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{inStockCount}</p>
              <span className="text-[11px] text-emerald-500/80">ปริมาณเพียงพอ</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">พัสดุใกล้หมด</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{lowStockCount}</p>
              <span className="text-[11px] text-amber-500/80">ควรสั่งซื้อเพิ่ม</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">หมดสต็อก</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{outOfStockCount}</p>
              <span className="text-[11px] text-red-500/80">ไม่พร้อมจ่าย</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">รายการเบิกเดือนนี้</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">{totalRequisitionsCount}</p>
              <span className="text-[11px] text-purple-400/80">ครั้งที่จ่ายของออก</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'inventory'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            คลังพัสดุและสต็อกคงเหลือ
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
              {supplies.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('requisitions')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'requisitions'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            ประวัติและทำรายการเบิกวัสดุ
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
              {filteredRequisitions.length}
            </span>
          </button>
        </div>

        {/* TAB 1: Inventory & Stock */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
              {/* Search */}
              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อวัสดุ หรือรหัสพัสดุ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Category Filter */}
              <div className="sm:col-span-4">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">หมวดหมู่ทั้งหมด</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="sm:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">สถานะสต็อกทั้งหมด</option>
                  <option value="in_stock">สต็อกพร้อมจ่าย</option>
                  <option value="low_stock">ใกล้หมดสต็อก</option>
                  <option value="out_of_stock">หมดสต็อก</option>
                </select>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">รหัสพัสดุ</th>
                      <th className="py-3.5 px-4 font-semibold">ชื่อวัสดุ / รายการ</th>
                      <th className="py-3.5 px-4 font-semibold">หมวดหมู่</th>
                      <th className="py-3.5 px-4 font-semibold">สถานที่เก็บ</th>
                      <th className="py-3.5 px-4 font-semibold text-center">คงเหลือ / จุดเตือน</th>
                      <th className="py-3.5 px-4 font-semibold text-right">ราคา/หน่วย</th>
                      <th className="py-3.5 px-4 font-semibold text-center">สถานะ</th>
                      <th className="py-3.5 px-4 font-semibold text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                          กำลังโหลดข้อมูลวัสดุ...
                        </td>
                      </tr>
                    ) : supplies.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          ไม่พบรายการวัสดุที่ตรงกับเงื่อนไขการค้นหา
                        </td>
                      </tr>
                    ) : (
                      supplies.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-mono text-xs text-blue-400 font-medium">
                            {item.item_code}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-white">{item.name}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700/60">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">
                            {item.location || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="font-semibold text-white">
                              <span
                                className={
                                  item.quantity <= 0
                                    ? 'text-red-400'
                                    : item.quantity <= item.min_quantity
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }
                              >
                                {item.quantity}
                              </span>{' '}
                              <span className="text-xs text-slate-400 font-normal">
                                {item.unit}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              เตือนเมื่อ &le; {item.min_quantity}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right text-xs text-slate-300">
                            {item.unit_price ? `฿${item.unit_price.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Requisition Button */}
                              <button
                                onClick={() => openRequisitionModal(item)}
                                disabled={item.quantity <= 0}
                                title={item.quantity <= 0 ? 'ของหมด ไม่สามารถเบิกได้' : 'เบิกวัสดุนี้'}
                                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              >
                                <ShoppingBag className="w-4 h-4" />
                              </button>

                              {/* Restock Button */}
                              <button
                                onClick={() => {
                                  setRestockingSupply(item);
                                  setRestockAmount(10);
                                  setRestockNotes('');
                                }}
                                title="เติมสต็อก"
                                className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/20 transition"
                              >
                                <Plus className="w-4 h-4" />
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => openEditModal(item)}
                                title="แก้ไขข้อมูล"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => setDeletingSupply(item)}
                                title="ลบรายการ"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Requisitions & History */}
        {activeTab === 'requisitions' && (
          <div className="space-y-4">
            {/* Filter Toolbar for Requisitions */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาตามชื่อผู้เบิก, แผนก, ชื่อวัสดุ, วัตถุประสงค์ หรือ Ticket ID..."
                  value={reqSearchQuery}
                  onChange={(e) => setReqSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-4 flex items-center gap-2">
                <label className="text-xs text-slate-400 shrink-0">ประจำเดือน:</label>
                <input
                  type="month"
                  value={reqMonthFilter}
                  onChange={(e) => setReqMonthFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Requisitions Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">วัน-เวลาเบิก</th>
                      <th className="py-3.5 px-4 font-semibold">เลขที่ใบเบิก</th>
                      <th className="py-3.5 px-4 font-semibold">รหัส / รายการวัสดุ</th>
                      <th className="py-3.5 px-4 font-semibold text-center">จำนวนที่เบิก</th>
                      <th className="py-3.5 px-4 font-semibold">ผู้รับพัสดุ</th>
                      <th className="py-3.5 px-4 font-semibold">ฝ่าย/แผนก</th>
                      <th className="py-3.5 px-4 font-semibold">วัตถุประสงค์การนำไปใช้</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Ticket อ้างอิง</th>
                      <th className="py-3.5 px-4 font-semibold text-right">จนท. ผู้จ่าย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                          กำลังโหลดประวัติการเบิก...
                        </td>
                      </tr>
                    ) : filteredRequisitions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-500">
                          ไม่พบประวัติการเบิกวัสดุในเดือนหรือคำค้นหานี้
                        </td>
                      </tr>
                    ) : (
                      filteredRequisitions.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                            {new Date(req.requisition_date || req.created_at).toLocaleString('th-TH', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-emerald-400">
                            {req.requisition_number}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-xs text-blue-400 block">
                              {req.item_code}
                            </span>
                            <span className="font-medium text-white">{req.item_name}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-emerald-400">
                            {req.quantity} <span className="text-xs text-slate-400 font-normal">{req.unit}</span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-200">
                            {req.recipient_name}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-300">
                            {req.department_name}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-300 max-w-xs truncate" title={req.purpose}>
                            {req.purpose}
                          </td>
                          <td className="py-3.5 px-4 text-center text-xs">
                            {req.ticket_id ? (
                              <span className="px-2 py-0.5 rounded font-mono text-xs bg-blue-900/40 text-blue-300 border border-blue-500/30">
                                {req.ticket_id}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right text-xs text-slate-400">
                            {req.issuer_staff_name || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ===================== MODALS ===================== */}

      {/* 1. Modal: Add Supply */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                เพิ่มวัสดุใหม่เข้าคลัง
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSupply} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    รหัสพัสดุ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น MAT-LAN-002"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    หมวดหมู่ *
                  </label>
                  <input
                    type="text"
                    required
                    list="category-suggestions"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <datalist id="category-suggestions">
                    {availableCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ชื่อวัสดุ / อุปกรณ์ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สาย LAN Cat6 5 เมตร, หัว RJ45"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    จำนวนเริ่มต้น
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    จุดเตือนสั่งซื้อ
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newMinQuantity}
                    onChange={(e) => setNewMinQuantity(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    หน่วยนับ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เส้น, ชิ้น, กล่อง"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ราคาต่อหน่วย (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="เช่น 150"
                    value={newUnitPrice}
                    onChange={(e) =>
                      setNewUnitPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    สถานที่จัดเก็บ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ห้อง IT ตู้ A1"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกเข้าคลัง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Edit Supply */}
      {editingSupply && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-400" />
                แก้ไขข้อมูลวัสดุ ({editingSupply.item_code})
              </h3>
              <button
                onClick={() => setEditingSupply(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSupply} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  หมวดหมู่ *
                </label>
                <input
                  type="text"
                  required
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ชื่อวัสดุ / อุปกรณ์ *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    จุดเตือนสั่งซื้อ
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editMinQuantity}
                    onChange={(e) => setEditMinQuantity(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    หน่วยนับ *
                  </label>
                  <input
                    type="text"
                    required
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ราคาต่อหน่วย (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editUnitPrice}
                    onChange={(e) =>
                      setEditUnitPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    สถานที่จัดเก็บ
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSupply(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Restock Supply */}
      {restockingSupply && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                เติมสต็อกพัสดุ
              </h3>
              <button
                onClick={() => setRestockingSupply(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="font-mono text-xs text-blue-400">{restockingSupply.item_code}</span>
              <p className="font-semibold text-white">{restockingSupply.name}</p>
              <div className="text-xs text-slate-400 flex items-center gap-2 pt-1">
                <span>คงเหลือปัจจุบัน:</span>
                <span className="font-bold text-emerald-400">
                  {restockingSupply.quantity} {restockingSupply.unit}
                </span>
              </div>
            </div>

            <form onSubmit={handleRestock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  จำนวนที่รับเข้าเพิ่ม (+{restockingSupply.unit}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-bold text-center text-lg text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  หมายเหตุการรับเข้า
                </label>
                <input
                  type="text"
                  placeholder="เช่น รับของจากฝ่ายพัสดุ / สั่งซื้อเพิ่มตาม PR-2026-05"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRestockingSupply(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
                >
                  {submitting ? 'กำลังเติม...' : 'ยืนยันรับเข้าสต็อก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Delete Supply */}
      {deletingSupply && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">ยืนยันการลบวัสดุ</h3>
                <p className="text-xs text-slate-400">การลบนี้ไม่สามารถเรียกคืนได้</p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการ{' '}
              <strong className="text-white">
                "{deletingSupply.name}" ({deletingSupply.item_code})
              </strong>{' '}
              ออกจากระบบ?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingSupply(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteSupply}
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition disabled:opacity-50"
              >
                {submitting ? 'กำลังลบ...' : 'ลบรายการ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Requisition (Direct Issue) */}
      {isRequisitionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                ทำรายการเบิกจ่ายวัสดุไอที
              </h3>
              <button
                onClick={() => setIsRequisitionModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  เลือกพัสดุ/วัสดุที่ต้องการเบิก *
                </label>
                <select
                  required
                  value={selectedSupplyId}
                  onChange={(e) => {
                    setSelectedSupplyId(e.target.value);
                    setReqQuantity(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {supplies.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.quantity <= 0}>
                      {s.item_code} - {s.name} (คงเหลือ: {s.quantity} {s.unit})
                      {s.quantity <= 0 ? ' [หมดสต็อก]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSupplyForReq && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">หมวดหมู่: </span>
                    <span className="text-slate-200">{selectedSupplyForReq.category}</span>
                    <div className="text-slate-400 mt-0.5">
                      สถานที่เก็บ: {selectedSupplyForReq.location || '-'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">สต็อกคงเหลือ: </span>
                    <span
                      className={`font-bold ${
                        selectedSupplyForReq.quantity <= 0
                          ? 'text-red-400'
                          : selectedSupplyForReq.quantity <= selectedSupplyForReq.min_quantity
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {selectedSupplyForReq.quantity} {selectedSupplyForReq.unit}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  จำนวนที่เบิก ({selectedSupplyForReq?.unit || 'ชิ้น'}) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedSupplyForReq?.quantity || 1}
                  required
                  value={reqQuantity}
                  onChange={(e) => setReqQuantity(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ชื่อผู้เบิก / ผู้รับของ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมชาย ใจดี"
                    value={reqRecipientName}
                    onChange={(e) => setReqRecipientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ฝ่าย/แผนก *
                  </label>
                  <select
                    required
                    value={reqDepartmentId}
                    onChange={(e) => setReqDepartmentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  วัตถุประสงค์การใช้งาน / ปัญหาที่นำไปแก้ *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="เช่น เปลี่ยนสาย LAN ให้ห้องประชุม 102 ที่หัวสายหักชำรุด"
                  value={reqPurpose}
                  onChange={(e) => setReqPurpose(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  รหัสใบแจ้งซ่อมที่เกี่ยวข้อง (Ticket ID) (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น TIK-2026-0042"
                  value={reqTicketId}
                  onChange={(e) => setReqTicketId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRequisitionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedSupplyForReq || selectedSupplyForReq.quantity <= 0}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : 'ยืนยันจ่ายวัสดุและตัดสต็อก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
