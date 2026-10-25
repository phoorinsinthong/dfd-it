'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Wrench, ShieldCheck, User, Lock, AlertCircle, ArrowRight, Laptop, Calendar, CheckSquare } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, loginGeneralUser, loginStaff } = useAuth();

  const [activeTab, setActiveTab] = useState<'user' | 'staff'>('user');
  const [employeeId, setEmployeeId] = useState('');
  const [phoneOrPin, setPhoneOrPin] = useState('');
  const [userName, setUserName] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/portal');
      }
    }
  }, [user, isLoading, router]);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await loginGeneralUser(employeeId, phoneOrPin, userName);
      if (res.success) {
        router.push('/portal');
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await loginStaff(email, password);
      if (res.success) {
        router.push('/admin');
      } else {
        setError(res.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoUser = () => {
    setEmployeeId('EMP8801');
    setPhoneOrPin('0812345678');
    setUserName('สมชาย มีสุข (ฝ่ายการตลาด)');
  };

  const fillDemoAdmin = () => {
    setEmail('it-admin@company.local');
    setPassword('AdminPassword123!');
  };

  const handleQuickLoginUser = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await loginGeneralUser('EMP8801', '0812345678', 'สมชาย มีสุข (ฝ่ายการตลาด)');
      if (res.success) {
        router.push('/portal');
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLoginAdmin = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await loginStaff('it-admin@company.local', 'AdminPassword123!');
      if (res.success) {
        router.push('/admin');
      } else {
        setError(res.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-slate-100">
      <div className="w-full max-w-md">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-4 shadow-lg shadow-blue-500/10">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            แผนกสนับสนุนเทคนิค
          </h1>
          <p className="text-slate-400 text-sm">
            IT Support & Resource Management System
          </p>

          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Wrench className="w-3.5 h-3.5 text-blue-400" /> แจ้งซ่อม</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-emerald-400" /> จองห้องประชุม</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Laptop className="w-3.5 h-3.5 text-amber-400" /> ยืมอุปกรณ์</span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/90 border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Dual Role Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-2xl mb-6 border border-slate-700/50">
            <button
              type="button"
              onClick={() => { setActiveTab('user'); setError(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'user'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
            >
              <User className="w-4 h-4" />
              <span>ผู้ใช้งานทั่วไป</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('staff'); setError(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'staff'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>เจ้าหน้าที่ IT</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form: General User */}
          {activeTab === 'user' && (
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  รหัสพนักงาน (Employee ID) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="เช่น EMP001 หรือ 65001"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  เบอร์โทรศัพท์มือถือ หรือ PIN 4 หลัก <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="กรอกเบอร์โทรหรือ PIN สำหรับยืนยันตัวตน"
                  value={phoneOrPin}
                  onChange={(e) => setPhoneOrPin(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ชื่อ-นามสกุล (สำหรับติดต่อ)
                </label>
                <input
                  type="text"
                  placeholder="ระบุชื่อของคุณ (แสดงในใบแจ้งซ่อม/จองห้อง)"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <span>{isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าใช้งานระบบแจ้งซ่อมและจองห้อง'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleQuickLoginUser}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition text-center"
                >
                  ⚡ เข้าสู่ระบบ 1 คลิกทันที
                </button>
                <button
                  type="button"
                  onClick={fillDemoUser}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition text-center"
                >
                  กรอกฟอร์มทดสอบ
                </button>
              </div>
            </form>
          )}

          {/* Form: IT Staff */}
          {activeTab === 'staff' && (
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  อีเมลเจ้าหน้าที่ไอที (Staff Email) <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="it-admin@company.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  รหัสผ่าน (Password) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <span>{isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบบริหารจัดการ IT'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleQuickLoginAdmin}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition text-center"
                >
                  ⚡ เข้าสู่ระบบ IT Staff 1 คลิกทันที
                </button>
                <button
                  type="button"
                  onClick={fillDemoAdmin}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition text-center"
                >
                  กรอกฟอร์มทดสอบ
                </button>
              </div>
            </form>
          )}

          {/* Test Credentials Helper Card */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <div className="text-slate-300 font-semibold flex items-center gap-1.5">
              <span>🔑 ข้อมูลบัญชีสำหรับทดสอบ:</span>
            </div>
            <div className="space-y-1">
              <div>
                • <strong>พนักงานทั่วไป:</strong> รหัส <code className="text-blue-300 bg-slate-800 px-1 py-0.5 rounded font-mono">EMP001</code> / PIN: <code className="text-blue-300 bg-slate-800 px-1 py-0.5 rounded font-mono">1234</code>
              </div>
              <div>
                • <strong>เจ้าหน้าที่ไอที:</strong> Email: <code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded font-mono">it-admin@company.local</code> / รหัสผ่าน: <code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded font-mono">AdminPassword123!</code>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Note */}
        <p className="mt-6 text-center text-xs text-slate-500">
          ระบบบริหารจัดการแผนกสนับสนุนทางเทคนิค • เวอร์ชัน 1.0.0
        </p>

      </div>
    </main>
  );
}
