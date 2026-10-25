'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';

export default function PwaProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initial status
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register Service Worker for PWA App Shell Caching
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered successfully with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="no-print sticky top-0 z-50 bg-amber-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              คุณกำลังใช้งานในโหมดออฟไลน์ (ไม่มีสัญญาณอินเทอร์เน็ต) กรุณาตรวจสอบการเชื่อมต่อก่อนทำรายการบันทึกข้อมูล
            </span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="ml-3 px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-800 text-[11px] font-semibold flex items-center gap-1 shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            ลองใหม่
          </button>
        </div>
      )}
      {children}
    </>
  );
}
