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

interface AppSidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { exceptions, installations, dcrRecords } = useApp();

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
      label: 'Field Submission Web',
      icon: Smartphone,
      highlight: true,
      badge: 'Live',
    },
    {
      id: 'installations',
      label: 'Installations & Search',
      icon: Users,
      badge: pendingInstCount > 0 ? pendingInstCount : undefined,
    },
    {
      id: 'master_upload',
      label: 'Master Data Upload',
      icon: Upload,
      badge: undefined,
    },
    {
      id: 'assignments',
      label: 'Work Assignments',
      icon: UserPlus,
      badge: undefined,
    },
    {
      id: 'inventory',
      label: 'Inventory & Serials',
      icon: Box,
      badge: undefined,
    },
    {
      id: 'dcr_module',
      label: 'DCR Reconciliation',
      icon: FileSpreadsheet,
      badge: dcrPendingCount > 0 ? dcrPendingCount : undefined,
    },
    {
      id: 'exceptions',
      label: 'Action Required',
      icon: AlertOctagon,
      badge: openExceptionsCount > 0 ? openExceptionsCount : undefined,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      id: 'reports',
      label: '10 Reports Hub',
      icon: FileText,
      badge: undefined,
    },
    {
      id: 'service_desk',
      label: 'Service Tickets Desk',
      icon: Wrench,
      badge: undefined,
    },
    {
      id: 'user_management',
      label: 'Users & Permissions',
      icon: Shield,
      badge: undefined,
    },
    {
      id: 'audit_log',
      label: 'Audit Trail',
      icon: History,
      badge: undefined,
    },
  ];

  return (
    <aside className="no-print w-64 bg-white border-r border-slate-200 flex flex-col justify-between select-none">
      <div className="p-4 space-y-1">
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Main Navigation
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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

      {/* System Status info footer */}
      <div className="p-4 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/50">
        <div className="flex items-center gap-2 text-slate-700 font-semibold mb-1">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>System Healthy</span>
        </div>
        <p className="text-[11px] text-slate-400">PostgreSQL • Atomic Inventory Lock Enabled</p>
      </div>
    </aside>
  );
};
