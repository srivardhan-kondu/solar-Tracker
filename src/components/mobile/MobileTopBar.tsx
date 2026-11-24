'use client';

import React from 'react';
import { Wifi, WifiOff, BatteryCharging, Signal } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const MobileTopBar: React.FC<{ title?: string; onBack?: () => void }> = ({ title, onBack }) => {
  const { isOnline, setIsOnline } = useApp();
  const timeStr = '12:45';

  return (
    <div className="bg-slate-900 text-white select-none">
      {/* Device Status Bar */}
      <div className="flex justify-between items-center px-4 py-1.5 text-xs font-medium text-slate-300 border-b border-slate-800">
        <span>{timeStr}</span>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
              <Signal className="w-3 h-3" />
              <span>4G LTE</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 text-[11px] font-semibold">
              <WifiOff className="w-3 h-3" />
              <span>OFFLINE</span>
            </span>
          )}
          <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
              isOnline ? 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900' : 'bg-amber-950 text-amber-300 hover:bg-amber-900'
            }`}
            title="Click to toggle network state simulation"
          >
            {isOnline ? 'Drop Net' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* App Header */}
      {title && (
        <div className="flex items-center justify-between px-4 py-3 bg-brand-600 text-white shadow-md">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1 hover:bg-brand-700 rounded-full transition-colors text-white"
                aria-label="Back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-base font-bold tracking-tight truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="bg-amber-500/20 text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-400/30 uppercase tracking-wider">
                Field Mode
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
