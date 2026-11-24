'use client';

import React, { useState } from 'react';
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
import { UserManagementView } from '@/components/admin/UserManagementView';
import { AuditLogView } from '@/components/admin/AuditLogView';
import { Consumer360Modal } from '@/components/admin/Consumer360Modal';

export default function Home() {
  const { selectedConsumerFor360, setSelectedConsumerFor360 } = useApp();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation */}
      <AppNavbar onNavigateToTab={(tab) => setCurrentTab(tab)} />

      {/* Main Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar */}
        <AppSidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

        {/* Content Pane */}
        <main className="flex-1 p-6 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView onNavigateToTab={(tab) => setCurrentTab(tab)} />
          )}

          {currentTab === 'field_portal' && (
            <FieldSubmissionWebView onFinished={() => setCurrentTab('installations')} />
          )}

          {currentTab === 'installations' && (
            <ConsumerSearchView
              onSelectConsumer={(consumer) => setSelectedConsumerFor360(consumer)}
              onNavigateToTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'master_upload' && <MasterDataUploadView />}

          {currentTab === 'assignments' && <AssignmentView />}

          {currentTab === 'inventory' && <InventoryView />}

          {currentTab === 'dcr_module' && <DCRModuleView />}

          {currentTab === 'exceptions' && <ActionRequiredView />}

          {currentTab === 'reports' && <ReportsView />}

          {currentTab === 'service_desk' && <ServiceTicketsAdminView />}

          {currentTab === 'user_management' && <UserManagementView />}

          {currentTab === 'audit_log' && <AuditLogView />}
        </main>
      </div>

      {/* Consumer 360 Full Modal */}
      {selectedConsumerFor360 && (
        <Consumer360Modal
          consumer={selectedConsumerFor360}
          onClose={() => setSelectedConsumerFor360(null)}
          onNavigateToTab={(tab) => {
            setSelectedConsumerFor360(null);
            setCurrentTab(tab);
          }}
        />
      )}
    </div>
  );
}
