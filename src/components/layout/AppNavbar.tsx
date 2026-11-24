'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, AlertTriangle, RotateCcw, ChevronDown, Check, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { isOfficeRole } from '@/lib/access';
import { STATUS_LABEL } from '@/lib/status';
import { Logo } from '@/components/brand/Logo';
import { UserRole } from '@/types';

/** Plain words for each role, shown to the person using the app */
const ROLE_LABEL: Record<UserRole, string> = {
  'Super Admin': 'Head office',
  Admin: 'Office staff',
  Installer: 'Installer',
  'Service Engineer': 'Service engineer',
};

interface AppNavbarProps {
  onNavigateToTab?: (tab: string) => void;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({ onNavigateToTab }) => {
  const { currentUser, setCurrentUser, users, exceptions, consumers, setSelectedConsumerFor360, resetAllData } =
    useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  // Close the user menu when clicking elsewhere or pressing Esc
  useEffect(() => {
    if (!showRoleMenu) return;
    const onDown = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) setShowRoleMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowRoleMenu(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showRoleMenu]);

  const openExceptionsCount = exceptions.filter((e) => e.status === 'Open').length;
  const office = isOfficeRole(currentUser.role);

  const q = searchQuery.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');
  const filteredConsumers = q
    ? consumers
        .filter(
          (c) =>
            c.consumerNumber.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q) ||
            c.ula.toLowerCase().includes(q) ||
            c.village.toLowerCase().includes(q) ||
            (qDigits.length >= 3 && c.mobile.replace(/\D/g, '').includes(qDigits))
        )
        .slice(0, 6)
    : [];

  return (
    <header className="no-print bg-white border-b-2 border-slate-200 sticky top-0 z-40">
      <div className="max-w-[1480px] mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between min-h-[68px] sm:min-h-[76px] gap-2 sm:gap-4 py-2">
          <Logo />

          {/* Search */}
          <div className="relative flex-1 max-w-lg hidden md:block">
            <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              onKeyDown={(e) => e.key === 'Escape' && setShowSearchResults(false)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 150)}
              placeholder="Find a consumer by name, village or phone"
              aria-label="Find a consumer"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-base text-slate-900 focus:outline-none focus:border-brand-600 focus:bg-white"
            />

            {showSearchResults && q && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100">
                {filteredConsumers.length > 0 ? (
                  filteredConsumers.map((c) => (
                    <button
                      key={c.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedConsumerFor360(c);
                        setShowSearchResults(false);
                        setSearchQuery('');
                        onNavigateToTab?.('installations');
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-brand-50 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-base font-bold text-slate-900">{c.name}</div>
                        <div className="text-sm text-slate-500">
                          {c.village} · {c.consumerNumber}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-brand-700 whitespace-nowrap">{STATUS_LABEL[c.status]}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-base text-slate-600 text-center">
                    No one found. Try part of the name or village.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Problems to fix (office staff only) — labelled, not just a bell icon */}
            {office && (
              <button
                onClick={() => onNavigateToTab?.('exceptions')}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 rounded-xl border-2 font-bold text-base ${
                  openExceptionsCount > 0
                    ? 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                aria-label={`Problems to fix: ${openExceptionsCount}`}
              >
                <AlertTriangle className="w-5 h-5" />
                <span className="hidden lg:inline">Problems</span>
                <span
                  className={`min-w-[28px] h-7 px-1.5 rounded-full flex items-center justify-center text-sm ${
                    openExceptionsCount > 0 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {openExceptionsCount}
                </span>
              </button>
            )}

            {/* Reset demo data — Super Admin only */}
            {currentUser.role === 'Super Admin' && (
              <button
                onClick={() => {
                  if (
                    window.confirm('This deletes ALL changes and puts back the demo data. This cannot be undone. Continue?')
                  ) {
                    resetAllData();
                  }
                }}
                className="hidden sm:flex items-center gap-2 px-3 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                title="Reset demo data"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="hidden xl:inline text-sm font-semibold">Reset demo</span>
              </button>
            )}

            {/* Who is signed in */}
            <div className="relative" ref={roleMenuRef}>
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                aria-haspopup="menu"
                aria-expanded={showRoleMenu}
                aria-label={`Signed in as ${currentUser.name}. Switch user`}
                className="flex items-center gap-3 p-1 sm:py-1.5 sm:pl-1.5 sm:pr-3 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentUser.avatar} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div className="text-left hidden lg:block leading-tight">
                  <div className="text-base font-bold text-slate-900">{currentUser.name}</div>
                  <div className="text-sm text-slate-600">{ROLE_LABEL[currentUser.role]}</div>
                </div>
                <ChevronDown className="w-5 h-5 text-slate-600 hidden sm:block" />
              </button>

              {showRoleMenu && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white rounded-xl shadow-2xl border-2 border-slate-200 py-2 z-50"
                >
                  <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900">Switch user</span>
                    <button
                      onClick={() => setShowRoleMenu(false)}
                      aria-label="Close"
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {users.map((u) => {
                    const active = u.id === currentUser.id;
                    return (
                      <button
                        key={u.id}
                        role="menuitem"
                        onClick={() => {
                          setCurrentUser(u);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 ${
                          active ? 'bg-brand-50' : ''
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u.avatar} alt="" className="w-11 h-11 rounded-lg object-cover" />
                        <div className="flex-1">
                          <div className="text-base font-bold text-slate-900">{u.name}</div>
                          <div className="text-sm text-slate-600">
                            {ROLE_LABEL[u.role]} · {u.division}
                          </div>
                        </div>
                        {active && <Check className="w-6 h-6 text-brand-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
