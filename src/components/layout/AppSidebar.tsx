'use client';

import React, { useEffect, useState } from 'react';
import { useLang } from '@/i18n/LanguageContext';
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
  MoreHorizontal,
  X,
  ClipboardCheck,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { canSeeTab } from '@/lib/access';
import { needsSurvey } from '@/lib/survey';

interface AppSidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { t } = useLang();
  const { exceptions, dcrRecords, currentUser, consumers, surveys, installations } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);

  // Esc closes the "More" sheet
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  // Installers see how many of their homes still need a site survey
  const surveysToDo =
    currentUser.role === 'Installer'
      ? consumers.filter((c) => c.assignedInstallerId === currentUser.id && needsSurvey(c, surveys, installations)).length
      : 0;
  const openExceptionsCount = exceptions.filter((e) => e.status === 'Open').length;
  const dcrPendingCount = dcrRecords.filter((d) => d.status === 'ULA Not Found' || d.status === 'Existing Value Conflict').length;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      short: 'Home',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'survey',
      label: 'Site Survey',
      short: 'Survey',
      icon: ClipboardCheck,
      badge: surveysToDo > 0 ? surveysToDo : undefined,
    },
    {
      id: 'field_portal',
      label: 'New Installation',
      short: 'New job',
      icon: Smartphone,
      highlight: true,
      badge: undefined,
    },
    {
      id: 'installations',
      label: 'Find a Consumer',
      short: 'Find',
      icon: Users,
      badge: undefined,
    },
    {
      id: 'master_upload',
      label: 'Upload Excel Lists',
      short: 'Upload',
      icon: Upload,
      badge: undefined,
    },
    {
      id: 'assignments',
      label: 'Assign Work',
      short: 'Assign',
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
      short: 'Complaints',
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
      {/* Phones & tablets: bottom menu bar. With many screens, show 4 + a big "More" button. */}
      {(() => {
        const needsMore = menuItems.length > 5;
        const barItems = needsMore ? menuItems.slice(0, 4) : menuItems;
        const activeInMore = needsMore && !barItems.some((i) => i.id === currentTab);
        const moreBadge = needsMore
          ? menuItems.slice(4).reduce((n, i) => n + (typeof i.badge === 'number' ? i.badge : 0), 0)
          : 0;
        const go = (id: string) => {
          setCurrentTab(id);
          setMoreOpen(false);
          window.scrollTo({ top: 0 });
        };
        return (
          <>
            <nav
              aria-label={t("Main menu")}
              className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t-2 border-slate-200 flex pb-[env(safe-area-inset-bottom)]"
            >
              {barItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative flex-1 min-w-0 flex flex-col items-center gap-1 px-1 py-2.5 text-xs font-bold border-t-4 ${
                      isActive ? 'text-brand-700 bg-brand-50 border-brand-600' : 'text-slate-700 border-transparent'
                    }`}
                  >
                    <Icon className="w-7 h-7 flex-shrink-0" />
                    <span className="text-center leading-tight">{t((item as { short?: string }).short ?? item.label)}</span>
                    {item.badge && (
                      <span className="absolute top-1 right-1/2 translate-x-6 bg-red-600 text-white text-xs font-bold rounded-full min-w-[24px] h-6 px-1.5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
              {needsMore && (
                <button
                  onClick={() => setMoreOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={moreOpen}
                  className={`relative flex-1 min-w-0 flex flex-col items-center gap-1 px-1 py-2.5 text-xs font-bold border-t-4 ${
                    activeInMore ? 'text-brand-700 bg-brand-50 border-brand-600' : 'text-slate-700 border-transparent'
                  }`}
                >
                  <MoreHorizontal className="w-7 h-7" />
                  <span>{t("More")}</span>
                  {moreBadge > 0 && (
                    <span className="absolute top-1 right-1/2 translate-x-6 bg-red-600 text-white text-xs font-bold rounded-full min-w-[24px] h-6 px-1.5 flex items-center justify-center">
                      {moreBadge}
                    </span>
                  )}
                </button>
              )}
            </nav>

            {/* "More" sheet: every screen as a big, easy list */}
            {moreOpen && (
              <div
                className="no-print lg:hidden fixed inset-0 z-50 bg-slate-900/60 flex items-end"
                onClick={(e) => e.target === e.currentTarget && setMoreOpen(false)}
                role="dialog"
                aria-modal="true"
                aria-label={t("All screens")}
              >
                <div className="w-full max-h-[85vh] overflow-y-auto bg-white rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-slate-900">{t("All screens")}</h2>
                    <button
                      onClick={() => setMoreOpen(false)}
                      aria-label={t("Close")}
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => go(item.id)}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border-2 text-base font-bold text-left ${
                            isActive ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-800 border-slate-200'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <Icon className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-white' : 'text-brand-600'}`} />
                            {t(item.label)}
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
                </div>
              </div>
            )}
          </>
        );
      })()}

      <aside className="no-print hidden lg:flex w-64 xl:w-72 flex-shrink-0 bg-white border-r-2 border-slate-200 flex-col select-none">
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
                  <span>{t(item.label)}</span>
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
