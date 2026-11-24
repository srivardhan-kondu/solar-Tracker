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
      badge: pendingInstCount > 0 ? pendingInstCount : undefined,
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
      badgeColor: 'bg-red-500 text-white',
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
    {/* Phones & small tablets: a scrollable strip instead of a fixed sidebar */}
    <nav
      aria-label="Main menu"
      className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 flex overflow-x-auto"
    >
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentTab(item.id)}
            className={`relative flex-1 min-w-[84px] flex flex-col items-center gap-1 px-2 py-2.5 text-xs font-semibold ${
              isActive ? 'text-brand-700 bg-brand-50' : 'text-slate-600'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-center leading-tight">{item.label}</span>
            {item.badge && (
              <span className="absolute top-1 right-3 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>

    <aside className="no-print hidden md:flex w-60 flex-shrink-0 bg-white border-r border-slate-200 flex-col justify-between select-none">
      <div className="p-4 space-y-1">
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Menu
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : item.highlight
                  ? 'bg-brand-50 text-brand-700 hover:bg-brand-100 font-bold border border-brand-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-brand-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.badgeColor ||
                    (isActive
                      ? 'bg-brand-700 text-white'
                      : item.highlight
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-700')
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
