'use client';

import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  AlertTriangle,
  Wrench,
  TrendingUp,
  ArrowUpRight,
  Filter,
  ClipboardCheck,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { STATUS_GROUPS, matchesStatusFilter, uniqueSorted } from '@/lib/status';

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

export const DashboardView: React.FC<{
  onNavigateToTab: (tab: string, statusFilter?: string) => void;
}> = ({ onNavigateToTab }) => {
  const { consumers, users, dcrRecords, exceptions, serviceTickets, inventory } = useApp();

  const [divisionFilter, setDivisionFilter] = useState('All');
  const divisions = uniqueSorted(consumers.map((c) => c.division));

  const filteredConsumers =
    divisionFilter === 'All' ? consumers : consumers.filter((c) => c.division === divisionFilter);

  const count = (filter: string) => filteredConsumers.filter((c) => matchesStatusFilter(c.status, filter)).length;

  const total = filteredConsumers.length;
  const completed = count('group:done');
  const notFinished = count('group:not_done');
  const officeCheck = count('group:office_check');
  const dcrPending = dcrRecords.filter((d) => d.status === 'ULA Not Found' || d.status === 'Existing Value Conflict').length;
  const openExceptions = exceptions.filter(
    (e) => e.status === 'Open' && (divisionFilter === 'All' || e.division === divisionFilter)
  ).length;
  const openTickets = serviceTickets.filter(
    (t) => t.status !== 'Closed' && t.status !== 'Resolved' && (divisionFilter === 'All' || t.division === divisionFilter)
  ).length;

  const totalPanels = inventory.filter((i) => i.type === 'panel').length;
  const installedPanels = inventory.filter((i) => i.type === 'panel' && i.status === 'Installed').length;

  // Real progress per division (always across all divisions, so they can be compared)
  const divisionRows = divisions.map((name) => {
    const list = consumers.filter((c) => c.division === name);
    return { name, total: list.length, done: list.filter((c) => c.status === 'Completed').length };
  });

  // Real installer performance
  const installerRows = users
    .filter((u) => u.role === 'Installer')
    .map((u) => {
      const list = filteredConsumers.filter((c) => c.assignedInstallerId === u.id);
      return {
        id: u.id,
        name: u.name,
        division: u.division,
        assigned: list.length,
        done: list.filter((c) => c.status === 'Completed').length,
        working: list.filter((c) => matchesStatusFilter(c.status, 'group:working')).length,
      };
    });

  const kpis = [
    {
      label: 'All consumers',
      value: total,
      note: 'Click to see the full list',
      icon: Users,
      color: 'text-slate-900',
      iconColor: 'text-brand-600',
      onClick: () => onNavigateToTab('installations', 'All'),
    },
    {
      label: 'Done',
      value: completed,
      note: `${pct(completed, total)}% of all consumers`,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      iconColor: 'text-emerald-600',
      onClick: () => onNavigateToTab('installations', 'group:done'),
    },
    {
      label: 'Not finished yet',
      value: notFinished,
      note: 'Not started or being installed',
      icon: Clock,
      color: 'text-blue-700',
      iconColor: 'text-blue-600',
      onClick: () => onNavigateToTab('installations', 'group:not_done'),
    },
    {
      label: STATUS_GROUPS.office_check.label,
      value: officeCheck,
      note: 'Sent by installers, check & approve',
      icon: ClipboardCheck,
      color: 'text-violet-700',
      iconColor: 'text-violet-600',
      onClick: () => onNavigateToTab('installations', 'group:office_check'),
    },
    {
      label: 'Problems to fix',
      value: openExceptions,
      note: 'Missing photos, location, duplicates',
      icon: AlertTriangle,
      color: 'text-red-600',
      iconColor: 'text-red-600',
      onClick: () => onNavigateToTab('exceptions'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Division Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">How the work is going today. Click any box to see the list.</p>
        </div>

        <label className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-600">Division:</span>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="text-sm font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="All">All divisions</option>
            {divisions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* KPI cards: each opens the matching filtered list */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <button
              key={k.label}
              onClick={k.onClick}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-md transition-all text-left group"
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm font-bold text-slate-600">{k.label}</span>
                <Icon className={`w-5 h-5 flex-shrink-0 ${k.iconColor}`} />
              </div>
              <div className={`text-3xl font-extrabold mt-2 ${k.color}`}>{k.value}</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <span>{k.note}</span>
                <ArrowUpRight className="w-3 h-3 ml-auto flex-shrink-0" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigateToTab('dcr_module')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-brand-600" />
              DCR numbers
            </span>
            <span
              className={`text-sm font-bold px-2 py-0.5 rounded ${
                dcrPending ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {dcrPending ? `${dcrPending} need attention` : 'All matched'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-2">DCR rows from the uploaded file that could not be matched to a consumer.</p>
        </button>

        <button
          onClick={() => onNavigateToTab('service_desk')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              Service complaints
            </span>
            <span className="text-sm font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{openTickets} open</span>
          </div>
          <p className="text-sm text-slate-500 mt-2">Repair and maintenance requests from consumers.</p>
        </button>

        <button
          onClick={() => onNavigateToTab('inventory')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Panel stock
            </span>
            <span className="text-sm font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
              {installedPanels} of {totalPanels} fitted
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-2">{totalPanels - installedPanels} panels are still in the store or not usable.</p>
        </button>
      </div>

      {/* Progress tables, calculated from live data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900">Progress by division</h3>
            <button
              onClick={() => onNavigateToTab('reports')}
              className="text-sm font-bold text-brand-600 hover:text-brand-700"
            >
              Full report →
            </button>
          </div>

          <div className="space-y-3">
            {divisionRows.length === 0 && <p className="text-sm text-slate-500">No consumers uploaded yet.</p>}
            {divisionRows.map((d) => (
              <div key={d.name} className="space-y-1.5">
                <div className="flex justify-between text-sm font-medium text-slate-700">
                  <span>{d.name}</span>
                  <span className="text-slate-500">
                    {d.done} of {d.total} done ({pct(d.done, d.total)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct(d.done, d.total)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900">Installers</h3>
            <button
              onClick={() => onNavigateToTab('assignments')}
              className="text-sm font-bold text-brand-600 hover:text-brand-700"
            >
              Assign work →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {installerRows.map((inst) => (
              <div key={inst.id} className="py-3 flex justify-between items-center text-sm gap-3">
                <div>
                  <div className="font-bold text-slate-900">{inst.name}</div>
                  <div className="text-xs text-slate-500">
                    {inst.division} · {inst.assigned} assigned
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-600">{inst.done} done</span>
                  <span className="text-slate-400 mx-1">·</span>
                  <span className="text-slate-600">{inst.working} in progress</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
