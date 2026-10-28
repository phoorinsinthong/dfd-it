'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Wrench, ShieldCheck, User, Lock, AlertCircle, ArrowRight, Laptop, Calendar, CheckSquare } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, loginGeneralUser, loginStaff } = useAuth();

  const [activeTab, setActiveTab] = useState<'user' | 'staff'>('user');
  const [userName, setUserName] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Auto-recall previously used name from device storage
    try {
      const savedName = localStorage.getItem('it_support_saved_name');
      if (savedName) {
        setUserName(savedName);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'admin' || user.role === 'superadmin') {
        router.push('/admin');
      } else {
        router.push('/portal');
      }
    }
  }, [user, isLoading, router]);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setError('กรุณากรอกชื่อของคุณเพื่อเข้าใช้งาน');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await loginGeneralUser(userName.trim());
      if (res.success) {
        router.push('/portal');
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    } catch (err) {
      console.error('[PAGE ERROR handleUserSubmit]', err);
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
    } catch (err) {
      console.error('[PAGE ERROR handleStaffSubmit]', err);
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
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>ชื่อ-นามสกุล หรือชื่อของคุณ <span className="text-red-400">*</span></span>
                  <span className="text-[11px] text-blue-400 font-normal">จำชื่ออัตโนมัติในเครื่อง</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="เช่น สมชาย มีสุข (ฝ่ายการตลาด)"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  💡 ใส่ชื่อแล้วเข้าใช้งานได้ทันที ระบบจะจดจำชื่อนี้ไว้สำหรับสร้างใบแจ้งซ่อมและจองห้อง
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <span>{isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าใช้งานระบบแจ้งซ่อมและจองห้อง'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
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
            </form>
          )}

        </div>

        {/* Footer Note */}
        <p className="mt-6 text-center text-xs text-slate-500">
          ระบบบริหารจัดการแผนกสนับสนุนทางเทคนิค • เวอร์ชัน 1.0.0
        </p>

      </div>
    </main>
  );
}
