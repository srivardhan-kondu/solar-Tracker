'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  Upload,
  UserPlus,
  Box,
  FileSpreadsheet,
  AlertOctagon,
  FileText,
  Wrench,
  Shield,
  History,
  Smartphone,
  CheckCircle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { canSeeTab } from '@/lib/access';

interface AppSidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { exceptions, installations, dcrRecords, currentUser } = useApp();

  const openExceptionsCount = exceptions.filter((e) => e.status === 'Open').length;
  const pendingInstCount = installations.filter(
    (i) => i.status === 'Needs Review' || i.status === 'In Progress'
  ).length;
  const dcrPendingCount = dcrRecords.filter((d) => d.status === 'ULA Not Found' || d.status === 'Existing Value Conflict').length;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'field_portal',
      label: 'New Installation',
      icon: Smartphone,
      highlight: true,
      badge: undefined,
    },
    {
      id: 'installations',
      label: 'Find a Consumer',
      icon: Users,
      badge: undefined,
    },
    {
      id: 'master_upload',
      label: 'Upload Excel Lists',
      icon: Upload,
      badge: undefined,
    },
    {
      id: 'assignments',
      label: 'Assign Work',
      icon: UserPlus,
      badge: undefined,
    },
    {
      id: 'inventory',
      label: 'Panels & Inverters Stock',
      icon: Box,
      badge: undefined,
    },
    {
      id: 'dcr_module',
      label: 'DCR Numbers',
      icon: FileSpreadsheet,
      badge: dcrPendingCount > 0 ? dcrPendingCount : undefined,
    },
    {
      id: 'exceptions',
      label: 'Problems to Fix',
      icon: AlertOctagon,
      badge: openExceptionsCount > 0 ? openExceptionsCount : undefined,
      badgeColor: 'bg-red-600 text-white',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      badge: undefined,
    },
    {
      id: 'service_desk',
      label: 'Service Complaints',
      icon: Wrench,
      badge: undefined,
    },
    {
      id: 'user_management',
      label: 'Users',
      icon: Shield,
      badge: undefined,
    },
    {
      id: 'audit_log',
      label: 'Activity History',
      icon: History,
      badge: undefined,
    },
  ].filter((item) => canSeeTab(currentUser.role, item.id));

  return (
    <>
      {/* Phones & small tablets: a bottom menu bar instead of a fixed sidebar */}
      <nav
        aria-label="Main menu"
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t-2 border-slate-200 flex overflow-x-auto"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex-1 min-w-[96px] flex flex-col items-center gap-1 px-2 py-3 text-xs font-bold border-t-4 ${
                isActive ? 'text-brand-700 bg-brand-50 border-brand-600' : 'text-slate-700 border-transparent'
              }`}
            >
              <Icon className="w-7 h-7" />
              <span className="text-center leading-tight">{item.label}</span>
              {item.badge && (
                <span className="absolute top-1.5 right-3 bg-red-600 text-white text-xs font-bold rounded-full min-w-[24px] h-6 px-1.5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <aside className="no-print hidden lg:flex w-72 flex-shrink-0 bg-white border-r-2 border-slate-200 flex-col select-none">
        <div className="p-4 space-y-1.5 sticky top-[78px]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl text-base font-bold transition-colors border-2 ${
                  isActive
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'text-slate-800 border-transparent hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-3 text-left">
                  <Icon className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-white' : 'text-brand-600'}`} />
                  <span>{item.label}</span>
                </span>

                {item.badge && (
                  <span
                    className={`text-sm font-bold min-w-[28px] h-7 px-2 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-white text-brand-700' : item.badgeColor || 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
};
