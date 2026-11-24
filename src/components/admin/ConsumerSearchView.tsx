'use client';

import React, { useMemo, useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Building,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Consumer } from '@/types';
import * as XLSX from 'xlsx';
import {
  ALL_STATUSES,
  STATUS_GROUPS,
  STATUS_LABEL,
  StatusGroupKey,
  matchesStatusFilter,
  statusBadgeClass,
  uniqueSorted,
} from '@/lib/status';

export const ConsumerSearchView: React.FC<{
  onSelectConsumer: (consumer: Consumer) => void;
  initialStatusFilter?: string;
}> = ({ onSelectConsumer, initialStatusFilter = 'All' }) => {
  const { consumers, installations } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [divisionFilter, setDivisionFilter] = useState('All');

  const divisions = uniqueSorted(consumers.map((c) => c.division));
  // One lookup table instead of searching the installations list for every row
  const installationByConsumer = useMemo(
    () => new Map(installations.map((i) => [i.consumerNumber, i])),
    [installations]
  );

  const q = searchQuery.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');
  const filteredConsumers = consumers.filter((c) => {
    const matchesSearch =
      !q ||
      c.consumerNumber.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.ula.toLowerCase().includes(q) ||
      c.village.toLowerCase().includes(q) ||
      // Match mobile numbers regardless of spaces or +91
      (qDigits.length >= 3 && c.mobile.replace(/\D/g, '').includes(qDigits));

    const matchesStatus = matchesStatusFilter(c.status, statusFilter);
    const matchesDivision = divisionFilter === 'All' || c.division === divisionFilter;

    return matchesSearch && matchesStatus && matchesDivision;
  });

  const handleExportExcel = () => {
    const exportData = filteredConsumers.map((c) => {
      const inst = installationByConsumer.get(c.consumerNumber);
      return {
        'Consumer Number': c.consumerNumber,
        'Beneficiary Name': c.name,
        'Mobile Number': c.mobile,
        Village: c.village,
        Mandal: c.mandal,
        District: c.district,
        Division: c.division,
        'ULA Identifier': c.ula,
        Capacity: `${c.capacityKw} kW`,
        Status: c.status,
        'Assigned Installer': c.assignedInstallerName || 'Unassigned',
        'Panel 1': inst?.panels?.[0] || 'N/A',
        'Panel 2': inst?.panels?.[1] || 'N/A',
        'Panel 3': inst?.panels?.[2] || 'N/A',
        'Panel 4': inst?.panels?.[3] || 'N/A',
        Inverter: inst?.inverterSerial || 'N/A',
        'DCR Number': inst?.dcrNumber || 'Pending',
        'GPS Coordinates': inst?.gps ? `${inst.gps.latitude}, ${inst.gps.longitude}` : 'N/A',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Installations');
    XLSX.writeFile(wb, `Solar_Installations_Master_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Find a Consumer</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Search by name, village, mobile or consumer number. Click &quot;Open&quot; to see photos and details.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download as Excel ({filteredConsumers.length})</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a name, village, mobile or consumer number"
            aria-label="Search consumers"
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700"
          >
            <option value="All">All statuses</option>
            <optgroup label="Groups">
              {(Object.keys(STATUS_GROUPS) as StatusGroupKey[]).map((k) => (
                <option key={k} value={`group:${k}`}>
                  {STATUS_GROUPS[k].label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Exact status">
              {ALL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABEL[st]}
                </option>
              ))}
            </optgroup>
          </select>

          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            aria-label="Filter by division"
            className="text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700"
          >
            <option value="All">All divisions</option>
            {divisions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">Consumer</th>
                <th className="py-3 px-4">Village</th>
                <th className="py-3 px-4">Installer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredConsumers.length > 0 ? (
                filteredConsumers.map((c) => {
                  const inst = installationByConsumer.get(c.consumerNumber);
                  return (
                    <tr key={c.id} className="hover:bg-brand-50/50 transition-colors align-top">
                      <td className="py-4 px-4">
                        <div className="text-base font-bold text-slate-900">{c.name}</div>
                        <div className="font-mono text-sm text-slate-700">{c.consumerNumber}</div>
                        <div className="text-sm text-slate-500">
                          {c.mobile} · ULA <span className="font-mono">{c.ula}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-slate-900">{c.village}</div>
                        <div className="text-sm text-slate-500">{c.division}</div>
                      </td>
                      <td className="py-4 px-4 text-slate-800">
                        {c.assignedInstallerName || <span className="text-amber-700 font-semibold">Not assigned</span>}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full font-bold text-sm whitespace-nowrap ${statusBadgeClass(c.status)}`}
                        >
                          {STATUS_LABEL[c.status]}
                        </span>
                        <div className="text-sm mt-1.5">
                          {inst?.dcrNumber ? (
                            <span className="text-emerald-700">
                              DCR: <span className="font-mono font-bold">{inst.dcrNumber}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">DCR not received</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => onSelectConsumer(c)}
                          aria-label={`Open ${c.name}`}
                          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-base inline-flex items-center gap-2"
                        >
                          <Eye className="w-5 h-5" />
                          <span>Open</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                    No consumers match.{' '}
                    {(q || statusFilter !== 'All' || divisionFilter !== 'All') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('All');
                          setDivisionFilter('All');
                        }}
                        className="font-bold text-brand-700 underline"
                      >
                        Clear search and filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
