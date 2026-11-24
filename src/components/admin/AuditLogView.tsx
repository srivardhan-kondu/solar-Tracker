'use client';

import React from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useApp();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable, append-only record of all critical allocations, master uploads, duplicate rejections, and approvals.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold bg-brand-50 text-brand-800 px-3 py-1.5 rounded-xl border border-brand-200">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <span>Tamper-Resistant Log</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Record Type & ID</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-bold text-slate-900">{log.actorName}</span>
                    <span className="text-[10px] text-slate-400 ml-1">({log.actorRole})</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-brand-700 font-semibold whitespace-nowrap">
                    {log.recordType}: {log.recordId}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
