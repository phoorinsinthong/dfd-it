'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import Navbar from '@/components/layout/Navbar';
import {
  Building2,
  FolderTree,
  Plus,
  Search,
  Check,
  X,
  Power,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Pencil,
  Trash2,
  Save,
  AlertTriangle,
  Layers,
  MapPin,
  DoorOpen,
} from 'lucide-react';
import Link from 'next/link';
import { Division, Department, Category } from '@/types/database';
import {
  getDivisions,
  addDivision,
  updateDivision,
  deleteDivision,
  toggleDivisionActive,
  getDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  toggleDepartmentActive,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryActive,
} from '@/lib/services/master-data-service';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'divisions' | 'departments' | 'categories'>('divisions');
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Item States
  const [newDivName, setNewDivName] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDivisionId, setNewDeptDivisionId] = useState('');
  const [newDeptBuilding, setNewDeptBuilding] = useState('');
  const [newDeptFloor, setNewDeptFloor] = useState('');
  const [newDeptRoom, setNewDeptRoom] = useState('');
  const [newCatName, setNewCatName] = useState('');

  // Editing States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDivisionId, setEditDivisionId] = useState('');
  const [editBuilding, setEditBuilding] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editRoom, setEditRoom] = useState('');

  // Delete Dialog State
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{
    id: string;
    name: string;
    type: 'division' | 'department' | 'category';
  } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const refreshData = async () => {
    const [divs, depts, cats] = await Promise.all([
      getDivisions({ includeInactive: true }),
      getDepartments({ includeInactive: true }),
      getCategories({ includeInactive: true }),
    ]);
    setDivisions(divs);
    setDepartments(depts);
    setCategories(cats);
    if (divs.length > 0 && !newDeptDivisionId) {
      setNewDeptDivisionId(divs[0].id);
    }
  };

  useEffect(() => {
    refreshData();
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
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-white mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-slate-400 text-sm mb-4">หน้านี้สำหรับเจ้าหน้าที่ฝ่ายไอทีเท่านั้น</p>
          <Link href="/portal" className="text-xs text-blue-400 hover:underline">
            กลับสู่หน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  // Add Handlers
  const handleAddDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    const res = await addDivision(newDivName);
    if (res.success) {
      setNewDivName('');
      setSuccessMessage(`เพิ่มกองงาน "${res.data?.name}" เรียบร้อยแล้ว`);
      refreshData();
    } else {
      setError(res.error || 'ไม่สามารถเพิ่มกองงานได้');
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    const res = await addDepartment({
      name: newDeptName,
      divisionId: newDeptDivisionId || undefined,
      building: newDeptBuilding || undefined,
      floor: newDeptFloor || undefined,
      room: newDeptRoom || undefined,
    });
    if (res.success) {
      setNewDeptName('');
      setNewDeptBuilding('');
      setNewDeptFloor('');
      setNewDeptRoom('');
      setSuccessMessage(`เพิ่มแผนก "${res.data?.name}" เรียบร้อยแล้ว`);
      refreshData();
    } else {
      setError(res.error || 'ไม่สามารถเพิ่มแผนกได้');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    const res = await addCategory(newCatName);
    if (res.success) {
      setNewCatName('');
      setSuccessMessage(`เพิ่มหมวดหมู่ "${res.data?.name}" เรียบร้อยแล้ว`);
      refreshData();
    } else {
      setError(res.error || 'ไม่สามารถเพิ่มหมวดหมู่ได้');
    }
  };

  // Edit Handlers
  const startEditDivision = (div: Division) => {
    setEditingId(div.id);
    setEditName(div.name);
    setError(null);
  };

  const startEditDepartment = (dept: Department) => {
    setEditingId(dept.id);
    setEditName(dept.name);
    setEditDivisionId(dept.division_id || '');
    setEditBuilding(dept.building || '');
    setEditFloor(dept.floor || '');
    setEditRoom(dept.room || '');
    setError(null);
  };

  const startEditCategory = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSaveDivision = async (id: string) => {
    setError(null);
    const res = await updateDivision(id, editName);
    if (res.success) {
      setEditingId(null);
      setSuccessMessage('แก้ไขชื่อกองงานเรียบร้อยแล้ว');
      refreshData();
    } else {
      setError(res.error || 'ไม่สามารถแก้ไขกองงานได้');
    }
  };

  const handleSaveDepartment = async (id: string) => {
    setError(null);
    const res = await updateDepartment(id, {
      name: editName,
      divisionId: editDivisionId ? editDivisionId : null,
      building: editBuilding || undefined,
      floor: editFloor || undefined,
      room: editRoom || undefined,
    });
    if (res.success) {
      setEditingId(null);
      setSuccessMessage('แก้ไขข้อมูลแผนกและสถานที่เรียบร้อยแล้ว');
      refreshData();
    } else {
      setError(res.error || 'ไม่สามารถแก้ไขแผนกได้');
    }
  };

  const handleSaveCategory = async (id: string) => {
    setError(null);
    const res = await updateCategory(id, editName);
    if (res.success) {
      setEditingId(null);
      setSuccessMessage('แก้ไขหมวดหมู่เรียบร้อยแล้ว');
      refreshData();
    } else {
      setError(res.error || 'ไม่สามารถแก้ไขหมวดหมู่ได้');
    }
  };

  // Delete Handlers
  const handleDeleteItem = async (force: boolean = false) => {
    if (!deleteConfirmItem) return;
    setError(null);
    setSuccessMessage(null);

    const { id, type } = deleteConfirmItem;
    if (type === 'division') {
      const res = await deleteDivision(id, { force });
      if (res.success) {
        setDeleteConfirmItem(null);
        setSuccessMessage(force ? 'ลบข้อมูลกองงานออกจากระบบแล้ว' : 'ปิดการใช้งานกองงานเรียบร้อยแล้ว');
        refreshData();
      } else {
        setError(res.error || 'ไม่สามารถลบกองงานได้');
      }
    } else if (type === 'department') {
      const res = await deleteDepartment(id, { force });
      if (res.success) {
        setDeleteConfirmItem(null);
        setSuccessMessage(force ? 'ลบข้อมูลแผนกออกจากระบบแล้ว' : 'ปิดการใช้งานแผนกเรียบร้อยแล้ว');
        refreshData();
      } else {
        setError(res.error || 'ไม่สามารถลบแผนกได้');
      }
    } else {
      const res = await deleteCategory(id, { force });
      if (res.success) {
        setDeleteConfirmItem(null);
        setSuccessMessage(force ? 'ลบหมวดหมู่ออกจากระบบแล้ว' : 'ปิดการใช้งานหมวดหมู่เรียบร้อยแล้ว');
        refreshData();
      } else {
        setError(res.error || 'ไม่สามารถลบหมวดหมู่ได้');
      }
    }
  };

  // Toggle Active
  const handleToggleDivision = async (id: string, current: boolean) => {
    await toggleDivisionActive(id, !current);
    refreshData();
  };

  const handleToggleDepartment = async (id: string, current: boolean) => {
    await toggleDepartmentActive(id, !current);
    refreshData();
  };

  const handleToggleCategory = async (id: string, current: boolean) => {
    await toggleCategoryActive(id, !current);
    refreshData();
  };

  // Filters
  const filteredDivisions = divisions.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDepartments = departments.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.division_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.building || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.room || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchDiv = selectedDivisionFilter === 'all' || d.division_id === selectedDivisionFilter;
    return matchSearch && matchDiv;
  });

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar activeSection="settings" />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-500" />
                จัดการข้อมูลหลัก (Master Data Settings)
              </h1>
              <p className="text-sm text-slate-400">
                กำหนดโครงสร้างองค์กร (กองงาน &gt; แผนก พร้อมระบุอาคาร/ชั้น/ห้อง) และหมวดหมู่ความผิดปกติของอุปกรณ์
              </p>
            </div>
          </div>

          {user.role === 'superadmin' && (
            <Link
              href="/admin/users"
              className="px-4 py-2 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-2 transition self-start sm:self-auto"
            >
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              จัดการผู้ดูแลระบบ &amp; Logs
            </Link>
          )}
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* 3 Main Tabs */}
        <div className="flex border-b border-slate-800 gap-2 sm:gap-4 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('divisions');
              setSearchQuery('');
              setEditingId(null);
            }}
            className={`pb-3 px-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'divisions'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            กองงาน / สำนัก ({divisions.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('departments');
              setSearchQuery('');
              setEditingId(null);
            }}
            className={`pb-3 px-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'departments'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            แผนก / ฝ่าย & สถานที่ ({departments.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('categories');
              setSearchQuery('');
              setEditingId(null);
            }}
            className={`pb-3 px-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'categories'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            หมวดหมู่ปัญหา ({categories.length})
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: DIVISIONS (กองงาน) */}
        {/* ============================================================== */}
        {activeTab === 'divisions' && (
          <div className="space-y-6">
            {/* Add Division Form */}
            <form onSubmit={handleAddDivision} className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                เพิ่มกองงานใหม่ (Add Division)
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  placeholder="เช่น กองการเงิน, สำนักบริหารกลาง, กองการเจ้าหน้าที่"
                  value={newDivName}
                  onChange={(e) => setNewDivName(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มกองงาน
                </button>
              </div>
            </form>

            {/* List & Search */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="ค้นหากองงาน..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <span className="text-xs text-slate-400 self-end sm:self-auto">
                  แสดง {filteredDivisions.length} จาก {divisions.length} กองงาน
                </span>
              </div>

              <div className="divide-y divide-slate-800">
                {filteredDivisions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">ไม่พบข้อมูลกองงาน</div>
                ) : (
                  filteredDivisions.map((div) => {
                    const isEditing = editingId === div.id;
                    const deptCount = departments.filter((d) => d.division_id === div.id).length;

                    return (
                      <div key={div.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 bg-slate-800 border border-blue-500 rounded-xl px-3 py-1.5 text-sm text-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveDivision(div.id)}
                              className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                              title="บันทึก"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                              title="ยกเลิก"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-950/40 text-blue-400 border border-blue-800/30">
                              <Layers className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white flex items-center gap-2">
                                <span>{div.name}</span>
                                {!div.is_active && (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-red-950/80 text-red-400 border border-red-800/40">
                                    ปิดใช้งาน
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                มีแผนกในสังกัด: <strong className="text-slate-300">{deptCount}</strong> แผนก
                              </div>
                            </div>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => startEditDivision(div)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="แก้ไขชื่อกองงาน"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleDivision(div.id, div.is_active)}
                              className={`p-2 rounded-xl border transition ${
                                div.is_active
                                  ? 'bg-emerald-950/30 border-emerald-600/30 text-emerald-400 hover:bg-emerald-950/50'
                                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                              }`}
                              title={div.is_active ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirmItem({ id: div.id, name: div.name, type: 'division' })
                              }
                              className="p-2 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 transition"
                              title="ลบกองงาน"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: DEPARTMENTS & LOCATION (แผนก & ที่อยู่) */}
        {/* ============================================================== */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            {/* Add Department Form */}
            <form onSubmit={handleAddDepartment} className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                เพิ่มแผนกใหม่พร้อมกำหนดสถานที่ตั้ง (Add Department &amp; Location)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    ชื่อแผนก / ฝ่าย <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ฝ่ายบัญชี, ฝ่ายการเงินและพัสดุ"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    สังกัดกองงาน (Parent Division) <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={newDeptDivisionId}
                    onChange={(e) => setNewDeptDivisionId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- ไม่ระบุกองงาน --</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {!d.is_active ? '(ปิดใช้งาน)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-blue-400" /> อาคาร
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น อาคาร 1, อาคาร A"
                    value={newDeptBuilding}
                    onChange={(e) => setNewDeptBuilding(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-400" /> ชั้น
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ชั้น 3, ชั้น 4"
                    value={newDeptFloor}
                    onChange={(e) => setNewDeptFloor(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <DoorOpen className="w-3 h-3 text-blue-400" /> ห้อง / เลขที่ห้อง
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ห้อง 301, ห้อง 302"
                    value={newDeptRoom}
                    onChange={(e) => setNewDeptRoom(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    บันทึกแผนกใหม่
                  </button>
                </div>
              </div>
            </form>

            {/* List, Filter & Search */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="ค้นหาแผนก หรือสถานที่..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>

                  <select
                    value={selectedDivisionFilter}
                    onChange={(e) => setSelectedDivisionFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="all">แสดงทุกลำดับกองงาน</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-xs text-slate-400 self-end sm:self-auto">
                  แสดง {filteredDepartments.length} จาก {departments.length} แผนก
                </span>
              </div>

              <div className="divide-y divide-slate-800">
                {filteredDepartments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">ไม่พบข้อมูลแผนก</div>
                ) : (
                  filteredDepartments.map((dept) => {
                    const isEditing = editingId === dept.id;

                    return (
                      <div key={dept.id} className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {isEditing ? (
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 bg-slate-800/80 p-3 rounded-xl border border-blue-500/50">
                            <div className="lg:col-span-2">
                              <label className="block text-[10px] text-slate-400 mb-0.5">ชื่อแผนก</label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-0.5">สังกัดกองงาน</label>
                              <select
                                value={editDivisionId}
                                onChange={(e) => setEditDivisionId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                              >
                                <option value="">-- ไม่ระบุ --</option>
                                {divisions.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-0.5">อาคาร/ชั้น/ห้อง</label>
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  placeholder="อาคาร"
                                  value={editBuilding}
                                  onChange={(e) => setEditBuilding(e.target.value)}
                                  className="w-1/3 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[11px] text-white"
                                />
                                <input
                                  type="text"
                                  placeholder="ชั้น"
                                  value={editFloor}
                                  onChange={(e) => setEditFloor(e.target.value)}
                                  className="w-1/3 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[11px] text-white"
                                />
                                <input
                                  type="text"
                                  placeholder="ห้อง"
                                  value={editRoom}
                                  onChange={(e) => setEditRoom(e.target.value)}
                                  className="w-1/3 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[11px] text-white"
                                />
                              </div>
                            </div>
                            <div className="flex items-end justify-end gap-1.5">
                              <button
                                onClick={() => handleSaveDepartment(dept.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
                              >
                                <Save className="w-3.5 h-3.5" /> บันทึก
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-indigo-950/40 text-indigo-400 border border-indigo-800/30 mt-0.5">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white flex items-center gap-2">
                                <span>{dept.name}</span>
                                {!dept.is_active && (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-red-950/80 text-red-400 border border-red-800/40">
                                    ปิดใช้งาน
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                <span>
                                  สังกัด: <strong className="text-blue-300">{dept.division_name || divisions.find(d => d.id === dept.division_id)?.name || 'ไม่ระบุกองงาน'}</strong>
                                </span>
                                {(dept.building || dept.floor || dept.room) && (
                                  <span className="inline-flex items-center gap-1 text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                                    <MapPin className="w-3 h-3 text-red-400" />
                                    {[dept.building, dept.floor, dept.room].filter(Boolean).join(' ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-2 self-end lg:self-auto">
                            <button
                              onClick={() => startEditDepartment(dept)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="แก้ไขข้อมูลแผนกและสถานที่"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleDepartment(dept.id, dept.is_active)}
                              className={`p-2 rounded-xl border transition ${
                                dept.is_active
                                  ? 'bg-emerald-950/30 border-emerald-600/30 text-emerald-400 hover:bg-emerald-950/50'
                                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                              }`}
                              title={dept.is_active ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirmItem({ id: dept.id, name: dept.name, type: 'department' })
                              }
                              className="p-2 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 transition"
                              title="ลบแผนก"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: CATEGORIES (หมวดหมู่ปัญหา) */}
        {/* ============================================================== */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                เพิ่มหมวดหมู่ปัญหาใหม่ (Add Problem Category)
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  placeholder="เช่น Hardware, Network, หมึกพิมพ์"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มหมวดหมู่
                </button>
              </div>
            </form>

            {/* List & Search */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="ค้นหาหมวดหมู่..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <span className="text-xs text-slate-400 self-end sm:self-auto">
                  แสดง {filteredCategories.length} จาก {categories.length} หมวดหมู่
                </span>
              </div>

              <div className="divide-y divide-slate-800">
                {filteredCategories.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">ไม่พบข้อมูลหมวดหมู่</div>
                ) : (
                  filteredCategories.map((cat) => {
                    const isEditing = editingId === cat.id;

                    return (
                      <div key={cat.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 bg-slate-800 border border-blue-500 rounded-xl px-3 py-1.5 text-sm text-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveCategory(cat.id)}
                              className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                              title="บันทึก"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                              title="ยกเลิก"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-purple-950/40 text-purple-400 border border-purple-800/30">
                              <FolderTree className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white flex items-center gap-2">
                                <span>{cat.name}</span>
                                {!cat.is_active && (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-red-950/80 text-red-400 border border-red-800/40">
                                    ปิดใช้งาน
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => startEditCategory(cat)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="แก้ไขชื่อหมวดหมู่"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleCategory(cat.id, cat.is_active)}
                              className={`p-2 rounded-xl border transition ${
                                cat.is_active
                                  ? 'bg-emerald-950/30 border-emerald-600/30 text-emerald-400 hover:bg-emerald-950/50'
                                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                              }`}
                              title={cat.is_active ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirmItem({ id: cat.id, name: cat.name, type: 'category' })
                              }
                              className="p-2 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 transition"
                              title="ลบหมวดหมู่"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">
                ยืนยันการลบ / ปิดการใช้งาน
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-300">
              คุณต้องการดำเนินการกับรายการ{' '}
              <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded">
                &ldquo;{deleteConfirmItem.name}&rdquo;
              </strong>{' '}
              อย่างไร?
            </p>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2 text-slate-400">
              <div>
                • <strong className="text-amber-300">ปิดการใช้งาน (Soft Delete - แนะนำ):</strong>{' '}
                ซ่อนออกจากแบบฟอร์มใหม่ แต่รักษาประวัติใบแจ้งซ่อมเดิมไว้ครบถ้วน
              </div>
              <div>
                • <strong className="text-red-400">ลบถาวร (Hard Delete):</strong>{' '}
                ลบออกจากระบบทันที (ใช้เฉพาะเมื่อสร้างผิดและยังไม่มีการอ้างอิง)
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDeleteItem(false)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
              >
                ปิดการใช้งาน (แนะนำ)
              </button>
              <button
                type="button"
                onClick={() => handleDeleteItem(true)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
              >
                ลบถาวร
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
