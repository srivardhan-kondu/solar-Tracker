'use client';

import React, { useState } from 'react';
import { useLang } from '@/i18n/LanguageContext';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  Users,
  CheckCircle2,
  AlertTriangle,
  Building,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import * as XLSX from 'xlsx';

export const ReportsView: React.FC = () => {
  const { t } = useLang();
  const { consumers, installations, dcrRecords, exceptions, inventory, users } = useApp();

  const [activeReport, setActiveReport] = useState<string>('daily_installation');

  const pct = (part: number, total: number) => `${total > 0 ? Math.round((part / total) * 100) : 0}%`;
  const groupBy = <T,>(items: T[], key: (t: T) => string) => {
    const m = new Map<string, T[]>();
    items.forEach((it) => {
      const k = key(it) || 'Not given';
      m.set(k, [...(m.get(k) || []), it]);
    });
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  };

  const reportList = [
    { id: 'daily_installation', title: '1. Daily Installation Report' },
    { id: 'installer_performance', title: '2. Installer Performance Report' },
    { id: 'division_progress', title: '3. Division Progress Report' },
    { id: 'village_progress', title: '4. Village Progress Report' },
    { id: 'dcr_pending', title: '5. DCR Pending Report' },
    { id: 'installation_pending', title: '6. Installation Pending Report' },
    { id: 'missing_photos', title: '7. Missing Photos Report' },
    { id: 'gps_missing', title: '8. GPS Missing / Low Accuracy' },
    { id: 'duplicate_scans', title: '9. Duplicate Scan Attempts' },
    { id: 'inventory_summary', title: '10. Panel & Inverter Inventory' },
  ];

  // Generate Report Data based on selection
  const getReportData = () => {
    switch (activeReport) {
      case 'daily_installation':
        return installations.map((i) => ({
          'Installation ID': i.id,
          'Consumer Number': i.consumerNumber,
          Installer: i.installerName,
          Division: i.division,
          Village: i.village,
          Status: i.status,
          'Completed At': i.completedAt || 'In Progress',
          'Panels Installed': i.panels.filter((p) => p).length,
          Inverter: i.inverterSerial || 'Pending',
        }));

      case 'installer_performance':
        return users
          .filter((u) => u.role === 'Installer')
          .map((u) => {
            const assigned = consumers.filter((c) => c.assignedInstallerId === u.id);
            const done = assigned.filter((c) => c.status === 'Completed').length;
            const insts = installations.filter((i) => i.installerId === u.id);
            const withMissing = insts.filter(
              (i) => Object.keys(i.photos || {}).length < 7 || !i.gps || i.panels.some((p) => !p) || !i.inverterSerial
            ).length;
            return {
              Installer: u.name,
              Division: u.division,
              Assigned: assigned.length,
              Done: done,
              'Not finished': assigned.length - done,
              'Submissions with missing items': `${withMissing} of ${insts.length}`,
            };
          });

      case 'division_progress':
        return groupBy(consumers, (c) => c.division).map(([division, list]) => {
          const done = list.filter((c) => c.status === 'Completed').length;
          return {
            Division: division,
            Consumers: list.length,
            Done: done,
            'Not finished': list.length - done,
            'Done %': pct(done, list.length),
          };
        });

      case 'village_progress':
        return groupBy(consumers, (c) => `${c.village}|${c.mandal}`).map(([key, list]) => {
          const [village, mandal] = key.split('|');
          const done = list.filter((c) => c.status === 'Completed').length;
          return {
            Village: village,
            Mandal: mandal || '',
            Consumers: list.length,
            Done: done,
            'Done %': pct(done, list.length),
          };
        });

      case 'dcr_pending':
        return dcrRecords
          .filter((d) => d.status !== 'Matched')
          .map((d) => ({
            'DCR Number': d.dcrNumber,
            'ULA Key': d.ula,
            Status: d.status,
            'Source Batch': d.sourceFile,
            'Uploaded At': d.uploadedAt,
            Details: d.conflictDetails || 'Pending Master Association',
          }));

      case 'installation_pending':
        return consumers
          .filter((c) => c.status !== 'Completed')
          .map((c) => ({
            'Consumer Number': c.consumerNumber,
            Name: c.name,
            Village: c.village,
            Division: c.division,
            Status: c.status,
            'Assigned Installer': c.assignedInstallerName || 'Unassigned',
          }));

      case 'missing_photos':
        return exceptions
          .filter((e) => e.type === 'missing_photo')
          .map((e) => ({
            'Exception ID': e.id,
            'Consumer Number': e.consumerNumber,
            Division: e.division,
            Village: e.village,
            'Missing Evidence': e.title,
            Priority: e.priority,
            Detected: e.detectedDate,
          }));

      case 'gps_missing':
        return exceptions
          .filter((e) => e.type === 'gps_issue')
          .map((e) => ({
            'Consumer Number': e.consumerNumber,
            Division: e.division,
            Village: e.village,
            'Issue Description': e.description,
            Priority: e.priority,
            Detected: e.detectedDate,
          }));

      case 'duplicate_scans':
        return exceptions
          .filter((e) => e.type === 'duplicate_serial')
          .map((e) => ({
            'Consumer Number': e.consumerNumber,
            Division: e.division,
            Description: e.description,
            Detected: e.detectedDate,
            Status: e.status,
          }));

      case 'inventory_summary':
        return inventory.map((i) => ({
          'Serial Number': i.serialNumber,
          Type: i.type,
          Brand: i.brand,
          Model: i.model,
          Status: i.status,
          'Locked Consumer': i.linkedConsumerNumber || 'Warehouse',
          'Received Date': i.receivedDate,
        }));

      default:
        return [];
    }
  };

  const reportData = getReportData();
  const columns = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  const handleExportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeReport);
    XLSX.writeFile(wb, `${activeReport}_Report_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t("Reports")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("Pick a report below. You can print it or download it as Excel.")}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full xl:w-auto xl:flex xl:items-center">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>{t("Print Report")}</span>
          </button>
          <button
            onClick={handleExportXLSX}
            disabled={reportData.length === 0}
            className="disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{t("Export Excel (.xlsx)")}</span>
          </button>
        </div>
      </div>

      {/* Reports Grid Selector */}
      <div className="no-print grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
        {reportList.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveReport(r.id)}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeReport === r.id
                ? 'bg-brand-600 text-white shadow-md font-bold'
                : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50/50'
            }`}
          >
            <div className="text-xs line-clamp-2">{t(r.title)}</div>
          </button>
        ))}
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
          <div>
            <div className="text-sm font-bold text-brand-700">{t("Solar Tracker")}</div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              {t(reportList.find((r) => r.id === activeReport)?.title || '')}
            </h2>
            <div className="text-sm text-slate-500 mt-1">
              {t('Made on {when} · covers all records', { when: new Date().toLocaleString('en-IN') })}
            </div>
          </div>
          <div className="text-sm font-bold text-slate-700">
            {reportData.length} {reportData.length === 1 ? t("row") : t("rows")}
          </div>
        </div>

        {reportData.length === 0 && (
          <div className="py-10 text-center text-base text-slate-600">{t("Nothing to show in this report right now.")}</div>
        )}

        {/* Smaller screens: one card per row, every column labelled */}
        <ul className="2xl:hidden print:hidden space-y-3">
          {reportData.map((row: any, i) => (
            <li key={i} className="border-2 border-slate-200 rounded-xl p-4">
              <div className="text-base font-bold text-slate-900 break-words">{String(row[columns[0]] ?? '')}</div>
              <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                {columns.slice(1).map((c) => (
                  <div key={c} className="min-w-0">
                    <dt className="text-slate-500">{t(c)}</dt>
                    <dd className="font-semibold text-slate-900 break-words">{String(row[c] ?? '') || '—'}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>

        {/* Wide screens and printing: table */}
        {reportData.length > 0 && (
          <div className="hidden 2xl:block print:block relative overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="py-3 px-3.5">
                      {t(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reportData.map((row: any, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {columns.map((c) => (
                      <td key={c} className="py-3 px-3.5 font-medium">
                        {String(row[c] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
