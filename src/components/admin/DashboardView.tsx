'use client';

import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  AlertTriangle,
  MapPin,
  Camera,
  Wrench,
  TrendingUp,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const DashboardView: React.FC<{
  onNavigateToTab: (tab: string) => void;
  onFilterStatus?: (status: string) => void;
}> = ({ onNavigateToTab, onFilterStatus }) => {
  const { consumers, installations, dcrRecords, exceptions, serviceTickets, inventory } = useApp();

  const [divisionFilter, setDivisionFilter] = useState('All');

  // Filtered dataset
  const filteredConsumers = divisionFilter === 'All'
    ? consumers
    : consumers.filter((c) => c.division === divisionFilter);

  // Key metrics calculation
  const totalAssigned = filteredConsumers.length;
  const completed = filteredConsumers.filter((c) => c.status === 'Completed').length;
  const pending = filteredConsumers.filter(
    (c) => c.status === 'Assigned' || c.status === 'In Progress' || c.status === 'Saved Locally'
  ).length;
  const needsReview = filteredConsumers.filter((c) => c.status === 'Needs Review').length;
  const dcrPending = dcrRecords.filter((d) => d.status === 'ULA Not Found' || d.status === 'Existing Value Conflict').length;
  const openExceptions = exceptions.filter((e) => e.status === 'Open').length;
  const openTickets = serviceTickets.filter((t) => t.status !== 'Closed' && t.status !== 'Resolved').length;

  const totalPanels = inventory.filter((i) => i.type === 'panel').length;
  const installedPanels = inventory.filter((i) => i.type === 'panel' && i.status === 'Installed').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Division Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Solar Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time installation progress, inventory locking, and DCR reconciliation status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Division:</span>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="All">All Divisions (Statewide)</option>
            <option value="Guntur Central">Guntur Central</option>
            <option value="Tenali Rural">Tenali Rural</option>
            <option value="Palnadu West">Palnadu West</option>
          </select>
        </div>
      </div>

      {/* Operational KPI Cards (Clickable per Section 7.1) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Assigned */}
        <button
          onClick={() => onNavigateToTab('installations')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Total</span>
            <Users className="w-5 h-5 text-brand-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalAssigned}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Consumers across divisions</span>
            <ArrowUpRight className="w-3 h-3 text-brand-600 ml-auto" />
          </div>
        </button>

        {/* Completed */}
        <button
          onClick={() => onNavigateToTab('installations')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-2">{completed}</div>
          <div className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center justify-between">
            <span>{totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0}% of target</span>
            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
          </div>
        </button>

        {/* Pending Installations */}
        <button
          onClick={() => onNavigateToTab('installations')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Progress / Pending</span>
            <Clock className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-blue-700 mt-2">{pending}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Field work active</span>
            <ArrowUpRight className="w-3 h-3 text-blue-600" />
          </div>
        </button>

        {/* Action Required Exceptions */}
        <button
          onClick={() => onNavigateToTab('exceptions')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-red-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Action Required</span>
            <AlertTriangle className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-red-600 mt-2">{openExceptions}</div>
          <div className="text-[11px] text-red-500 mt-1 font-semibold flex items-center justify-between">
            <span>Missing photos / GPS issues</span>
            <ArrowUpRight className="w-3 h-3 text-red-600" />
          </div>
        </button>
      </div>

      {/* Second Row: DCR Status, Service Tickets, Equipment Lock Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* DCR Pending */}
        <button
          onClick={() => onNavigateToTab('dcr_module')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-brand-600" />
              DCR Reconciliation
            </span>
            <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
              {dcrPending} Exceptions
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            ULA to DCR mapping verified. Automatically updates matched consumers and flags unmatched rows.
          </p>
        </button>

        {/* Service Tickets */}
        <button
          onClick={() => onNavigateToTab('service_desk')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              Service Tickets Desk
            </span>
            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
              {openTickets} Open
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Consumer maintenance tickets, engineer site visits, and replacement records.
          </p>
        </button>

        {/* Inventory Stock Status */}
        <button
          onClick={() => onNavigateToTab('inventory')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Inventory Stock & Serials
            </span>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
              {installedPanels}/{totalPanels} Installed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Server-side atomic serial validation locks equipment to a single consumer record.
          </p>
        </button>
      </div>

      {/* Progress Breakdown Tables: Division & Village */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Division Progress */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Progress by Division</h3>
            <button
              onClick={() => onNavigateToTab('reports')}
              className="text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              View Full Report →
            </button>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Guntur Central', total: 5, comp: 1, pending: 4 },
              { name: 'Tenali Rural', total: 2, comp: 1, pending: 1 },
              { name: 'Palnadu West', total: 1, comp: 0, pending: 1 },
            ].map((d) => (
              <div key={d.name} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>{d.name}</span>
                  <span className="text-slate-500">
                    {d.comp} / {d.total} ({Math.round((d.comp / d.total) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(d.comp / d.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Installer Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Installer Performance</h3>
            <button
              onClick={() => onNavigateToTab('reports')}
              className="text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              Performance Report →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {[
              { name: 'Ramesh Kumar', role: 'Installer', assigned: 4, completed: 1, inProgress: 3 },
              { name: 'Suresh Patil', role: 'Installer', assigned: 2, completed: 1, inProgress: 1 },
            ].map((inst) => (
              <div key={inst.name} className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-slate-900">{inst.name}</div>
                  <div className="text-[11px] text-slate-500">{inst.role} • Guntur Division</div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-600">{inst.completed} Completed</span>
                  <span className="text-slate-400 mx-1">•</span>
                  <span className="text-slate-600">{inst.inProgress} In Progress</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
