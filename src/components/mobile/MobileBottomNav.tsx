'use client';

import React from 'react';
import { Home, ClipboardList, RefreshCw, Wrench } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface MobileBottomNavProps {
  currentTab: 'home' | 'work' | 'sync' | 'services';
  setCurrentTab: (tab: 'home' | 'work' | 'sync' | 'services') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentTab, setCurrentTab }) => {
  const { currentUser, offlineQueue } = useApp();
  const isServiceRole = currentUser.role === 'Service Engineer';

  const pendingSyncCount = offlineQueue.filter((q) => q.status === 'pending' || q.status === 'failed').length;

  return (
    <div className="bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center select-none shadow-lg">
      <button
        onClick={() => setCurrentTab('home')}
        className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
          currentTab === 'home' ? 'text-brand-600 font-bold' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-xs mt-0.5">Home</span>
      </button>

      {!isServiceRole && (
        <button
          onClick={() => setCurrentTab('work')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
            currentTab === 'work' ? 'text-brand-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-xs mt-0.5">My Work</span>
        </button>
      )}

      {isServiceRole && (
        <button
          onClick={() => setCurrentTab('services')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
            currentTab === 'services' ? 'text-brand-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Wrench className="w-5 h-5" />
          <span className="text-xs mt-0.5">Tickets</span>
        </button>
      )}

      <button
        onClick={() => setCurrentTab('sync')}
        className={`flex flex-col items-center py-1 px-3 rounded-lg relative transition-colors ${
          currentTab === 'sync' ? 'text-brand-600 font-bold' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <RefreshCw className="w-5 h-5" />
        {pendingSyncCount > 0 && (
          <span className="absolute -top-0.5 right-2 bg-amber-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {pendingSyncCount}
          </span>
        )}
        <span className="text-xs mt-0.5">Sync & Help</span>
      </button>
    </div>
  );
};
