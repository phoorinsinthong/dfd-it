'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import Navbar from '@/components/layout/Navbar';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  History,
  Plus,
  Search,
  Check,
  X,
  Power,
  Pencil,
  Trash2,
  Save,
  ArrowLeft,
  AlertCircle,
  KeyRound,
  Mail,
  UserCheck,
  Filter,
  Eye,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { AdminUser, AuditLog, AuditModule, AuditAction } from '@/types/database';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  toggleAdminUserActive,
} from '@/lib/services/admin-user-service';
import { getAuditLogs } from '@/lib/services/audit-log-service';

export default function AdminUsersAndLogsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Search & Filter States
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<AuditModule | 'all'>('all');
  const [selectedAction, setSelectedAction] = useState<AuditAction | 'all'>('all');

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal: Add Admin User
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'superadmin'>('admin');
  const [newTitle, setNewTitle] = useState('');

  // Modal: Edit Admin User
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'superadmin'>('admin');
  const [editTitle, setEditTitle] = useState('');

  // Delete Confirm Modal
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const loadData = async () => {
    try {
      const [users, logs] = await Promise.all([
        getAdminUsers(),
        getAuditLogs({
          module: selectedModule,
          action: selectedAction,
          search: logSearch,
        }),
      ]);
      setAdminUsers(users);
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedModule, selectedAction, logSearch]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Access Control: Only superadmin allowed
  if (user.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-purple-500/30 rounded-3xl p-8 text-center shadow-2xl">
          <ShieldAlert className="w-14 h-14 text-purple-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">เฉพาะ Super Administrator</h1>
          <p className="text-slate-400 text-sm mb-4 leading-relaxed">
            หน้านี้สงวนไว้สำหรับผู้ดูแลระบบระดับสูงสุด (Superadmin) เพื่อจัดการสิทธิ์เจ้าหน้าที่และตรวจสอบประวัติการใช้งาน
          </p>
          <div className="text-xs text-purple-300 bg-purple-950/40 border border-purple-500/20 p-3 rounded-xl mb-6 text-left">
            <div>💡 <strong>บัญชี Superadmin ตั้งต้น:</strong></div>
            <div className="font-mono text-[11px] text-purple-200 mt-1">อีเมล: superadmin@company.local</div>
            <div className="font-mono text-[11px] text-purple-200">รหัสผ่าน: SuperAdmin@2026!</div>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition"
            >
              สลับเข้าสู่ระบบด้วย Superadmin
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
            >
              กลับสู่แดชบอร์ดหลัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentActor = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  // Add Admin Submit
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const res = await createAdminUser(
      {
        name: newName,
        email: newEmail,
        password: newPassword || undefined,
        role: newRole,
        title: newTitle || undefined,
      },
      currentActor
    );

    if (res.success) {
      setSuccessMessage(`เพิ่มผู้ดูแลระบบ "${res.data?.name}" เรียบร้อยแล้ว`);
      setIsAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('admin');
      setNewTitle('');
      loadData();
    } else {
      setError(res.error || 'ไม่สามารถเพิ่มผู้ดูแลระบบได้');
    }
  };

  // Open Edit Admin Modal
  const openEditModal = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEditName(admin.name);
    setEditEmail(admin.email);
    setEditPassword('');
    setEditRole(admin.role);
    setEditTitle(admin.title || '');
    setError(null);
  };

  // Save Edit Admin
  const handleSaveEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setError(null);
    setSuccessMessage(null);

    const res = await updateAdminUser(
      {
        id: editingAdmin.id,
        name: editName,
        email: editEmail,
        password: editPassword.trim() ? editPassword.trim() : undefined,
        role: editRole,
        title: editTitle,
      },
      currentActor
    );

    if (res.success) {
      setSuccessMessage(`แก้ไขข้อมูลผู้ดูแลระบบ "${res.data?.name}" เรียบร้อยแล้ว`);
      setEditingAdmin(null);
      loadData();
    } else {
      setError(res.error || 'ไม่สามารถแก้ไขข้อมูลได้');
    }
  };

  // Toggle Active
  const handleToggleActive = async (admin: AdminUser) => {
    setError(null);
    setSuccessMessage(null);
    const res = await toggleAdminUserActive(admin.id, !admin.is_active, currentActor);
    if (res.success) {
      setSuccessMessage(
        `${!admin.is_active ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} บัญชี ${admin.name} เรียบร้อยแล้ว`
      );
      loadData();
    } else {
      setError(res.error || 'ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  // Delete Admin
  const handleDeleteAdmin = async () => {
    if (!deletingAdmin) return;
    setError(null);
    setSuccessMessage(null);

    const res = await deleteAdminUser(deletingAdmin.id, currentActor);
    if (res.success) {
      setSuccessMessage(`ลบบัญชีผู้ดูแลระบบ "${deletingAdmin.name}" ออกจากระบบแล้ว`);
      setDeletingAdmin(null);
      loadData();
    } else {
      setError(res.error || 'ไม่สามารถลบบัญชีผู้ดูแลระบบได้');
    }
  };

  // Filtered Admins
  const filteredAdmins = adminUsers.filter((a) => {
    const q = userSearch.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.title || '').toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q)
    );
  });

  const getModuleBadgeColor = (module: AuditModule) => {
    switch (module) {
      case 'AUTH':
        return 'bg-purple-950/60 text-purple-300 border-purple-800/40';
      case 'TICKET':
        return 'bg-blue-950/60 text-blue-300 border-blue-800/40';
      case 'BOOKING':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40';
      case 'ASSET':
        return 'bg-amber-950/60 text-amber-300 border-amber-800/40';
      case 'PM':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-800/40';
      case 'REPORT':
        return 'bg-rose-950/60 text-rose-300 border-rose-800/40';
      case 'USER_ADMIN':
        return 'bg-indigo-950/60 text-indigo-300 border-indigo-800/40';
      case 'MASTER_DATA':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getActionBadgeColor = (action: AuditAction) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40';
      case 'UPDATE':
        return 'bg-blue-950/60 text-blue-400 border-blue-800/40';
      case 'DELETE':
        return 'bg-red-950/60 text-red-400 border-red-800/40';
      case 'SIGN':
        return 'bg-amber-950/60 text-amber-400 border-amber-800/40';
      case 'CLEAR_SIGN':
        return 'bg-orange-950/60 text-orange-400 border-orange-800/40';
      case 'STATUS_CHANGE':
        return 'bg-purple-950/60 text-purple-400 border-purple-800/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar activeSection="users" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
                <ShieldCheck className="w-6 h-6 text-purple-400" />
                จัดการผู้ดูแลระบบ & ประวัติการใช้งาน (Admin & Audit Trail)
              </h1>
              <p className="text-sm text-slate-400">
                ควบคุมสิทธิ์บัญชีผู้ดูแลระบบ และตรวจสอบบันทึกการทำรายการย้อนหลังในระบบทั้งหมด
              </p>
            </div>
          </div>

          {activeTab === 'users' && (
            <button
              onClick={() => {
                setError(null);
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-purple-600/20"
            >
              <Plus className="w-4 h-4" />
              เพิ่มผู้ดูแลระบบใหม่
            </button>
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

        {/* 2 Main Tabs */}
        <div className="flex border-b border-slate-800 gap-2 sm:gap-6">
          <button
            onClick={() => {
              setActiveTab('users');
              setError(null);
            }}
            className={`pb-3 px-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            ผู้ดูแลระบบ (Admin Users) ({adminUsers.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('audit');
              setError(null);
            }}
            className={`pb-3 px-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            ประวัติการใช้งานระบบ (Audit Trail) ({auditLogs.length})
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: ADMIN USERS */}
        {/* ============================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, อีเมล, หรือตำแหน่ง..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <span className="text-xs text-slate-400">
                แสดง {filteredAdmins.length} จาก {adminUsers.length} บัญชี
              </span>
            </div>

            {/* Admin Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-700/60">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">เจ้าหน้าที่ / ผู้ใช้งาน</th>
                      <th className="py-3.5 px-4 font-semibold">อีเมลล็อกอิน</th>
                      <th className="py-3.5 px-4 font-semibold">ระดับสิทธิ์</th>
                      <th className="py-3.5 px-4 font-semibold">สถานะ</th>
                      <th className="py-3.5 px-4 font-semibold">วันที่สร้าง</th>
                      <th className="py-3.5 px-4 font-semibold text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredAdmins.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          ไม่พบบัญชีผู้ดูแลระบบ
                        </td>
                      </tr>
                    ) : (
                      filteredAdmins.map((admin) => (
                        <tr key={admin.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                  admin.role === 'superadmin'
                                    ? 'bg-purple-900/40 text-purple-300 border border-purple-500/30'
                                    : 'bg-blue-900/40 text-blue-300 border border-blue-500/30'
                                }`}
                              >
                                {admin.name.slice(0, 1)}
                              </div>
                              <div>
                                <div className="font-semibold text-white flex items-center gap-1.5">
                                  <span>{admin.name}</span>
                                  {admin.id === user.id && (
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                      (บัญชีของคุณ)
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">{admin.title || '-'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                            {admin.email}
                          </td>
                          <td className="py-3.5 px-4">
                            {admin.role === 'superadmin' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/40">
                                <ShieldCheck className="w-3 h-3 text-purple-400" />
                                Super Administrator
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/40">
                                <UserCheck className="w-3 h-3 text-blue-400" />
                                IT Admin
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {admin.is_active ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                เปิดใช้งาน
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-red-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                ระงับใช้งาน
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {new Date(admin.created_at).toLocaleDateString('th-TH')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditModal(admin)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                title="แก้ไขข้อมูล"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(admin)}
                                className={`p-1.5 rounded-lg border transition ${
                                  admin.is_active
                                    ? 'bg-emerald-950/30 border-emerald-600/30 text-emerald-400 hover:bg-emerald-950/50'
                                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                                }`}
                                title={admin.is_active ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingAdmin(admin)}
                                className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 transition"
                                title="ลบบัญชี"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

        {/* ============================================================== */}
        {/* TAB 2: AUDIT TRAIL */}
        {/* ============================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="ค้นหาผู้กระทำ, รายละเอียด, เป้าหมาย..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                {/* Module Filter */}
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="all">ทุกโมดูล (All Modules)</option>
                  <option value="TICKET">งานแจ้งซ่อม (TICKET)</option>
                  <option value="BOOKING">จองห้องประชุม (BOOKING)</option>
                  <option value="ASSET">ยืม-คืนครุภัณฑ์ (ASSET)</option>
                  <option value="PM">แผนงาน PM (PM)</option>
                  <option value="REPORT">รายงาน & ลายเซ็น (REPORT)</option>
                  <option value="USER_ADMIN">จัดการแอดมิน (USER_ADMIN)</option>
                  <option value="MASTER_DATA">ข้อมูลหลัก (MASTER_DATA)</option>
                  <option value="AUTH">ระบบล็อกอิน (AUTH)</option>
                </select>

                {/* Action Filter */}
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="all">ทุกการกระทำ (All Actions)</option>
                  <option value="CREATE">สร้าง (CREATE)</option>
                  <option value="UPDATE">แก้ไข (UPDATE)</option>
                  <option value="DELETE">ลบ (DELETE)</option>
                  <option value="SIGN">ลงนามรับรอง (SIGN)</option>
                  <option value="CLEAR_SIGN">ลบลายเซ็น (CLEAR_SIGN)</option>
                  <option value="STATUS_CHANGE">เปลี่ยนสถานะ (STATUS_CHANGE)</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  พบ {auditLogs.length} รายการ
                </span>
                <button
                  onClick={loadData}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title="รีเฟรชประวัติ"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-700/60">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">วัน-เวลา</th>
                      <th className="py-3.5 px-4 font-semibold">ผู้ดำเนินการ (Actor)</th>
                      <th className="py-3.5 px-4 font-semibold">การกระทำ</th>
                      <th className="py-3.5 px-4 font-semibold">โมดูล</th>
                      <th className="py-3.5 px-4 font-semibold">รายละเอียดรายการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          ยังไม่มีประวัติการทำรายการตามเงื่อนไขที่เลือก
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => {
                        const date = new Date(log.timestamp);
                        const formattedDate = date.toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        });

                        return (
                          <tr key={log.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                              {formattedDate}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">{log.actor_name}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                <span className="uppercase text-purple-300 font-mono font-bold">
                                  {log.actor_role}
                                </span>
                                {log.actor_email && <span>• {log.actor_email}</span>}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadgeColor(
                                  log.action
                                )}`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getModuleBadgeColor(
                                  log.module
                                )}`}
                              >
                                {log.module}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-200">
                              <div className="leading-relaxed">{log.details}</div>
                              {log.target_name && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  เป้าหมาย: <span className="text-slate-300 font-medium">{log.target_name}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL: ADD ADMIN */}
        {/* ============================================================== */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  เพิ่มผู้ดูแลระบบใหม่
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddAdmin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ชื่อ-นามสกุล <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น วรวิทย์ เกียรติสกุล"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    อีเมลสำหรับเข้าสู่ระบบ <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="it-support@company.local"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    รหัสผ่าน (Password)
                  </label>
                  <input
                    type="password"
                    placeholder="หากเว้นว่าง ระบบจะใช้ Admin@2026!"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      ระดับสิทธิ์ <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="admin">IT Admin (เจ้าหน้าที่ทั่วไป)</option>
                      <option value="superadmin">Super Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      ตำแหน่งหน้าที่
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น นักวิชาการคอมพิวเตอร์"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition shadow-md shadow-purple-600/20"
                  >
                    บันทึกบัญชีใหม่
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL: EDIT ADMIN */}
        {/* ============================================================== */}
        {editingAdmin && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-blue-400" />
                  แก้ไขข้อมูลผู้ดูแลระบบ
                </h3>
                <button
                  onClick={() => setEditingAdmin(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditAdmin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ชื่อ-นามสกุล</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">อีเมลล็อกอิน</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    เปลี่ยนรหัสผ่านใหม่ (หากไม่ต้องการเปลี่ยนให้เว้นว่างไว้)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">ระดับสิทธิ์</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="admin">IT Admin</option>
                      <option value="superadmin">Super Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">ตำแหน่งหน้าที่</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingAdmin(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow-md shadow-blue-600/20"
                  >
                    บันทึกการเปลี่ยนแปลง
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL: DELETE CONFIRM */}
        {/* ============================================================== */}
        {deletingAdmin && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-red-500/30 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">ยืนยันการลบบัญชีผู้ดูแลระบบ?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                คุณต้องการลบบัญชี <strong className="text-white">{deletingAdmin.name}</strong> ({deletingAdmin.email}) หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingAdmin(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAdmin}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition shadow-md shadow-red-600/20"
                >
                  ยืนยันการลบ
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
