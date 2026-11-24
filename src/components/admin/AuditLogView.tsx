'use client';

import React, { useState } from 'react';
import { History, Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { friendly } from '@/lib/activity';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useApp();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const rows = q
    ? auditLogs.filter((l) =>
        [l.actorName, friendly(l.action), l.recordId, l.details].some((v) => v.toLowerCase().includes(q))
      )
    : auditLogs;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-7 h-7 text-brand-600" />
            Activity History
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Everything important that anyone has done, newest first. Entries cannot be changed or deleted.
          </p>
        </div>

        <label className="relative w-full sm:w-96">
          <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by person, action or consumer"
            aria-label="Search activity history"
            className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-base focus:outline-none focus:border-brand-600 focus:bg-white"
          />
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {rows.length === 0 && <div className="p-10 text-center text-base text-slate-500">Nothing found.</div>}
        {rows.map((log) => (
          <div key={log.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6">
            <div className="sm:w-48 flex-shrink-0 text-sm text-slate-500">{log.timestamp}</div>
            <div className="flex-1 space-y-1">
              <div className="text-base font-bold text-slate-900">{friendly(log.action)}</div>
              <div className="text-sm text-slate-700">{log.details}</div>
              <div className="text-sm text-slate-500">
                By {log.actorName} · {log.recordType} {log.recordId}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
