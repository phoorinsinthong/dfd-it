'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { filterTickets } from '@/lib/services/ticket-service';
import { Ticket } from '@/types/database';
import {
  isSoundEnabled,
  setSoundEnabled,
  playChimeSound,
  testChimeSound,
} from '@/lib/services/audio-alert-service';
import { Volume2, VolumeX, Bell, X, ExternalLink, Sparkles } from 'lucide-react';

export default function AdminNotificationListener() {
  const [soundOn, setSoundOn] = useState(true);
  const [activeToast, setActiveToast] = useState<{
    count: number;
    latestTicket: Ticket;
  } | null>(null);
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  const [testingSound, setTestingSound] = useState(false);

  const initialLoadDone = useRef(false);
  const knownPendingIds = useRef<Set<string>>(new Set());
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize sound state from localStorage
  useEffect(() => {
    setSoundOn(isSoundEnabled());

    const handleSoundChanged = (e: Event) => {
      const custom = e as CustomEvent<{ enabled: boolean }>;
      if (custom.detail) {
        setSoundOn(custom.detail.enabled);
      }
    };

    window.addEventListener('sound-setting-changed', handleSoundChanged);
    return () => window.removeEventListener('sound-setting-changed', handleSoundChanged);
  }, []);

  // Polling loop for new tickets (every 10 seconds)
  useEffect(() => {
    let isMounted = true;

    const checkPendingTickets = async () => {
      try {
        const pendingTickets = await filterTickets({ status: 'pending' });
        if (!isMounted) return;

        const currentIds = new Set(pendingTickets.map((t) => t.id));

        if (!initialLoadDone.current) {
          // First load: seed known IDs without playing alarm
          knownPendingIds.current = currentIds;
          initialLoadDone.current = true;
          return;
        }

        // Detect newly arrived tickets
        const newTickets = pendingTickets.filter((t) => !knownPendingIds.current.has(t.id));

        if (newTickets.length > 0) {
          // Play chime sound
          await playChimeSound();

          // Dispatch window event so /admin/tickets auto-updates immediately
          window.dispatchEvent(
            new CustomEvent('tickets-updated', {
              detail: { count: newTickets.length, tickets: newTickets },
            })
          );

          // Update tab title
          const originalTitle = 'IT Support Hub';
          document.title = `🔔 (${newTickets.length}) งานแจ้งซ่อมใหม่! | ${originalTitle}`;

          // Show Toast Notification
          if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
          }

          setActiveToast({
            count: newTickets.length,
            latestTicket: newTickets[0],
          });

          // Auto-hide toast after 10 seconds
          toastTimeoutRef.current = setTimeout(() => {
            if (isMounted) setActiveToast(null);
          }, 10000);
        }

        // Update known IDs
        knownPendingIds.current = currentIds;
      } catch (err) {
        console.error('Error polling pending tickets:', err);
      }
    };

    // Run first check immediately
    checkPendingTickets();

    // Set 10-second polling interval
    const interval = setInterval(checkPendingTickets, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const handleToggleSound = () => {
    const nextState = !soundOn;
    setSoundOn(nextState);
    setSoundEnabled(nextState);
  };

  const handleTestSound = async () => {
    setTestingSound(true);
    await testChimeSound();
    setTimeout(() => setTestingSound(false), 500);
  };

  return (
    <>
      {/* Sound Controller Button in Navbar */}
      <div className="relative flex items-center">
        <button
          onClick={() => setShowSoundMenu(!showSoundMenu)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
            soundOn
              ? 'bg-blue-950/40 border-blue-500/40 text-blue-300 hover:bg-blue-900/50'
              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="การตั้งค่าเสียงแจ้งเตือนอัตโนมัติ"
        >
          {soundOn ? (
            <Volume2 className="w-4 h-4 text-blue-400 animate-pulse" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-400" />
          )}
          <span className="hidden lg:inline text-[11px]">
            {soundOn ? 'เสียงเตือน: เปิด' : 'เสียงเตือน: ปิด'}
          </span>
        </button>

        {/* Dropdown Options */}
        {showSoundMenu && (
          <div className="absolute right-0 top-11 z-50 w-56 p-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl space-y-2.5 backdrop-blur-lg">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-blue-400" />
                ระบบแจ้งเตือนเสียงตั๋วใหม่
              </span>
              <button
                onClick={() => setShowSoundMenu(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed">
              เตือนอัตโนมัติทุก 10 วิ เมื่อมีงานแจ้งซ่อมใหม่เข้ามาแม้เปิดหน้าอื่น
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleToggleSound}
                className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  soundOn
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {soundOn ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                {soundOn ? 'ปิดเสียงแจ้งเตือน (Mute)' : 'เปิดเสียงแจ้งเตือน (Unmute)'}
              </button>

              <button
                onClick={handleTestSound}
                disabled={testingSound}
                className="w-full py-1.5 px-2.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700/80 flex items-center justify-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                {testingSound ? 'กำลังเล่นเสียง...' : 'ทดสอบเสียงกระดิ่ง (Test)'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Alert Toast Notification */}
      {activeToast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-slate-900/95 border-2 border-blue-500/70 text-white p-4 rounded-2xl shadow-2xl shadow-blue-500/20 backdrop-blur-xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 flex-shrink-0 animate-bounce">
              <Bell className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-blue-400">
                  🔔 มีรายการแจ้งซ่อมใหม่ ({activeToast.count} รายการ)
                </span>
                <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded font-mono font-bold">
                  PENDING
                </span>
              </div>

              <h4 className="text-sm font-bold text-white truncate mt-0.5">
                {activeToast.latestTicket.title}
              </h4>

              <div className="text-[11px] text-slate-300 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <span>
                  รหัส: <strong className="text-white">{activeToast.latestTicket.id}</strong>
                </span>
                <span>•</span>
                <span>ผู้แจ้ง: {activeToast.latestTicket.user_name}</span>
                {activeToast.latestTicket.department_name && (
                  <>
                    <span>•</span>
                    <span className="text-slate-400">{activeToast.latestTicket.department_name}</span>
                  </>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Link
                  href={`/admin/tickets?id=${activeToast.latestTicket.id}`}
                  onClick={() => setActiveToast(null)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  เปิดดูและรับเรื่อง
                </Link>

                <button
                  onClick={() => setActiveToast(null)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition"
                >
                  ปิด
                </button>
              </div>
            </div>

            <button
              onClick={() => setActiveToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
