'use client';

import React, { useState } from 'react';
import {
  Sun,
  Search,
  Bell,
  ShieldCheck,
  RotateCcw,
  UserCheck,
  Building2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { isOfficeRole } from '@/lib/access';
import { UserRole } from '@/types';

interface AppNavbarProps {
  onSearchSelect?: (consumerNumber: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({ onSearchSelect, onNavigateToTab }) => {
  const {
    currentUser,
    setCurrentUser,
    users,
    exceptions,
    consumers,
    setSelectedConsumerFor360,
    resetAllData,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const openExceptionsCount = exceptions.filter((e) => e.status === 'Open').length;

  // Filter consumers for quick search
  const filteredConsumers = searchQuery.trim()
    ? consumers
        .filter(
          (c) =>
            c.consumerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.ula.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.mobile.includes(searchQuery) ||
            c.village.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">SolarTrack</span>
                <span className="text-[10px] font-bold bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full border border-brand-200 uppercase tracking-wider">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Operations, Installation & DCR Management
              </p>
            </div>
          </div>

          {/* Global Quick Search Bar */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Search name, village, mobile or consumer no."
                aria-label="Search consumers"
                onKeyDown={(e) => e.key === 'Escape' && setShowSearchResults(false)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 150)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
            </div>

            {/* Live Search Dropdown */}
            {showSearchResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100">
                {filteredConsumers.length > 0 ? (
                  filteredConsumers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedConsumerFor360(c);
                        setShowSearchResults(false);
                        setSearchQuery('');
                        onNavigateToTab?.('installations');
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-brand-50 flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {c.consumerNumber} • {c.village}, {c.district}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {c.ula}
                        </span>
                        <div className="text-[10px] text-brand-600 font-semibold mt-0.5">{c.status}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-slate-500 text-center">No one found. Try part of the name or village.</div>
                )}
              </div>
            )}
          </div>

          {/* Action Center, Persona Switcher & Reset */}
          <div className="flex items-center gap-3">
            {/* Exceptions quick badge (office staff only) */}
            {isOfficeRole(currentUser.role) && (
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('exceptions')}
              className="relative p-2 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Problems to fix"
              aria-label={`Problems to fix: ${openExceptionsCount} open`}
            >
              <Bell className="w-5 h-5" />
              {openExceptionsCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                  {openExceptionsCount}
                </span>
              )}
            </button>
            )}

            {/* Reset Seed Data Button — demo only, Super Admin only */}
            {currentUser.role === 'Super Admin' && (
            <button
              onClick={() => {
                if (window.confirm('This deletes ALL changes and puts back the demo data. This cannot be undone. Continue?')) {
                  resetAllData();
                }
              }}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors hidden sm:block"
              title="Reset Demo Data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            )}

            {/* Active Persona / Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2.5 p-1.5 pl-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-lg object-cover border border-brand-200"
                />
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] font-semibold text-brand-600 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{currentUser.role}</span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* Persona Dropdown */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 divide-y divide-slate-100">
                  <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                    <span>Switch Role / User</span>
                  </div>
                  <div className="py-1">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setCurrentUser(u);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                          u.id === currentUser.id ? 'bg-brand-50/70 border-l-4 border-brand-600' : ''
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-lg object-cover" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{u.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {u.role} • {u.division}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
