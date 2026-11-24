'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { DashboardView } from '@/components/admin/DashboardView';
import { ConsumerSearchView } from '@/components/admin/ConsumerSearchView';
import { MasterDataUploadView } from '@/components/admin/MasterDataUploadView';
import { AssignmentView } from '@/components/admin/AssignmentView';
import { InventoryView } from '@/components/admin/InventoryView';
import { DCRModuleView } from '@/components/admin/DCRModuleView';
import { ActionRequiredView } from '@/components/admin/ActionRequiredView';
import { ReportsView } from '@/components/admin/ReportsView';
import { ServiceTicketsAdminView } from '@/components/admin/ServiceTicketsAdminView';
import { FieldSubmissionWebView } from '@/components/admin/FieldSubmissionWebView';
import { SurveyView } from '@/components/admin/SurveyView';
import { UserManagementView } from '@/components/admin/UserManagementView';
import { AuditLogView } from '@/components/admin/AuditLogView';
import { Consumer360Modal } from '@/components/admin/Consumer360Modal';
import { canSeeTab, HOME_TAB_FOR_ROLE } from '@/lib/access';

export default function Home() {
  const { currentUser, consumers, selectedConsumerFor360, setSelectedConsumerFor360 } = useApp();
  const [currentTab, setCurrentTab] = useState<string>(HOME_TAB_FOR_ROLE[currentUser.role]);
  // Status filter carried into the installations list (e.g. from a dashboard card)
  const [installationsFilter, setInstallationsFilter] = useState<string>('All');

  // When the role changes, move to a screen that role is allowed to see
  useEffect(() => {
    if (!canSeeTab(currentUser.role, currentTab)) setCurrentTab(HOME_TAB_FOR_ROLE[currentUser.role]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.role]);

  const navigate = (tab: string, statusFilter?: string) => {
    if (!canSeeTab(currentUser.role, tab)) return;
    if (tab === 'installations') setInstallationsFilter(statusFilter || 'All');
    setCurrentTab(tab);
  };

  const openConsumerByNumber = (consumerNumber: string) => {
    const c = consumers.find((x) => x.consumerNumber === consumerNumber);
    if (c) setSelectedConsumerFor360(c);
  };

  const show = (tab: string) => currentTab === tab && canSeeTab(currentUser.role, tab);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation */}
      <AppNavbar onNavigateToTab={(tab) => navigate(tab)} />

      {/* Main Body */}
      <div className="flex-1 flex max-w-[1480px] w-full mx-auto">
        {/* Left Sidebar */}
        <AppSidebar currentTab={currentTab} setCurrentTab={(tab) => navigate(tab)} />

        {/* Content Pane */}
        <main className="flex-1 min-w-0 p-4 pb-32 sm:p-6 sm:pb-32 lg:pb-6 overflow-y-auto">
          {show('dashboard') && <DashboardView onNavigateToTab={navigate} />}

          {show('survey') && <SurveyView onGoToInstallation={() => navigate('field_portal')} />}

          {show('field_portal') && <FieldSubmissionWebView onFinished={() => navigate('installations')} />}

          {show('installations') && (
            <ConsumerSearchView
              key={installationsFilter}
              initialStatusFilter={installationsFilter}
              onSelectConsumer={(consumer) => setSelectedConsumerFor360(consumer)}
            />
          )}

          {show('master_upload') && <MasterDataUploadView />}

          {show('assignments') && <AssignmentView />}

          {show('inventory') && <InventoryView />}

          {show('dcr_module') && <DCRModuleView />}

          {show('exceptions') && <ActionRequiredView onSelectConsumerNumber={openConsumerByNumber} />}

          {show('reports') && <ReportsView />}

          {show('service_desk') && <ServiceTicketsAdminView />}

          {show('user_management') && <UserManagementView />}

          {show('audit_log') && <AuditLogView />}
        </main>
      </div>

      {/* Consumer 360 Full Modal */}
      {selectedConsumerFor360 && (
        <Consumer360Modal
          consumer={selectedConsumerFor360}
          onClose={() => setSelectedConsumerFor360(null)}
          onNavigateToTab={(tab) => {
            setSelectedConsumerFor360(null);
            navigate(tab);
          }}
        />
      )}
    </div>
  );
}
