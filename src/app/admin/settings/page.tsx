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
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { Department, Category } from '@/types/database';
import { 
  getDepartments, 
  addDepartment, 
  toggleDepartmentActive,
  getCategories,
  addCategory,
  toggleCategoryActive
} from '@/lib/services/master-data-service';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'departments' | 'categories'>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const refreshData = async () => {
    const depts = await getDepartments({ includeInactive: true });
    const cats = await getCategories({ includeInactive: true });
    setDepartments(depts);
    setCategories(cats);
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

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-white mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-slate-400 text-sm mb-4">หน้านี้สำหรับเจ้าหน้าที่ฝ่ายไอทีเท่านั้น</p>
          <Link href="/portal" className="text-xs text-blue-400 hover:underline">กลับสู่หน้าหลัก</Link>
        </div>
      </div>
    );
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (activeTab === 'departments') {
      const res = await addDepartment(newName);
      if (res.success) {
        setNewName('');
        setSuccessMessage('เพิ่มแผนกใหม่เรียบร้อยแล้ว');
        refreshData();
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการเพิ่มแผนก');
      }
    } else {
      const res = await addCategory(newName);
      if (res.success) {
        setNewName('');
        setSuccessMessage('เพิ่มหมวดหมู่ปัญหาใหม่เรียบร้อยแล้ว');
        refreshData();
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่');
      }
    }
  };

  const handleToggleDept = async (id: string, currentStatus: boolean) => {
    await toggleDepartmentActive(id, !currentStatus);
    refreshData();
  };

  const handleToggleCat = async (id: string, currentStatus: boolean) => {
    await toggleCategoryActive(id, !currentStatus);
    refreshData();
  };

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar activeSection="settings" />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back and Title Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              จัดการข้อมูลหลัก (Master Data Settings)
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              กำหนดรายชื่อแผนกในองค์กรและประเภทปัญหาการแจ้งซ่อมสำหรับใช้ใน Dropdown ทั้งระบบ
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl mb-6 w-full sm:w-fit">
          <button
            onClick={() => { setActiveTab('departments'); setSearchQuery(''); setError(null); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-medium transition ${
              activeTab === 'departments'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>แผนกในองค์กร ({departments.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('categories'); setSearchQuery(''); setError(null); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-medium transition ${
              activeTab === 'categories'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>ประเภทปัญหาการแจ้งซ่อม ({categories.length})</span>
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Add New Item Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            {activeTab === 'departments' ? '+ เพิ่มแผนกใหม่' : '+ เพิ่มประเภทปัญหาใหม่'}
          </h2>
          <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              placeholder={activeTab === 'departments' ? "ระบุชื่อแผนก เช่น ฝ่ายจัดซื้อ (Procurement)" : "ระบุประเภทปัญหา เช่น ระบบสแกนนิ้ว / Keycard"}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-1.5 transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>บันทึกข้อมูล</span>
            </button>
          </form>
        </div>

        {/* Data List with Search */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold text-white text-sm">
              {activeTab === 'departments' ? 'รายชื่อแผนกทั้งหมด' : 'หมวดหมู่ปัญหาทั้งหมด'}
            </h3>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="ค้นหารายการ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="divide-y divide-slate-800/80">
            {activeTab === 'departments' && (
              filteredDepartments.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">ไม่พบข้อมูลแผนก</div>
              ) : (
                filteredDepartments.map((dept) => (
                  <div key={dept.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${dept.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                      <span className={`text-sm ${dept.is_active ? 'text-white font-medium' : 'text-slate-500 line-through'}`}>
                        {dept.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleDept(dept.id, dept.is_active)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                        dept.is_active
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                          : 'border-slate-700 text-slate-400 bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      <span>{dept.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                    </button>
                  </div>
                ))
              )
            )}

            {activeTab === 'categories' && (
              filteredCategories.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">ไม่พบข้อมูลหมวดหมู่</div>
              ) : (
                filteredCategories.map((cat) => (
                  <div key={cat.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${cat.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                      <span className={`text-sm ${cat.is_active ? 'text-white font-medium' : 'text-slate-500 line-through'}`}>
                        {cat.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleCat(cat.id, cat.is_active)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                        cat.is_active
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                          : 'border-slate-700 text-slate-400 bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      <span>{cat.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                    </button>
                  </div>
                ))
              )
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
