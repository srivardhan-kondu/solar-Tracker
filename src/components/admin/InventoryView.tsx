'use client';

import React, { useState } from 'react';
import {
  Box,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Search,
  Filter,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

const statusClass = (status: string) =>
  status === 'Installed'
    ? 'bg-emerald-100 text-emerald-800'
    : status === 'Available'
    ? 'bg-blue-100 text-blue-800'
    : 'bg-red-100 text-red-800';

export const InventoryView: React.FC = () => {
  const { inventory } = useApp();

  const [activeType, setActiveType] = useState<'all' | 'panel' | 'inverter'>('all');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchSerial, setSearchSerial] = useState('');
  const [testSerial, setTestSerial] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const filteredInventory = inventory.filter((item) => {
    const matchType = activeType === 'all' || item.type === activeType;
    const matchStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchSearch =
      item.serialNumber.toLowerCase().includes(searchSerial.toLowerCase()) ||
      (item.linkedConsumerNumber && item.linkedConsumerNumber.toLowerCase().includes(searchSerial.toLowerCase())) ||
      item.brand.toLowerCase().includes(searchSerial.toLowerCase());

    return matchType && matchStatus && matchSearch;
  });

  // Read-only lookup: this must never change stock or create problem records
  const handleLookup = () => {
    const sn = testSerial.trim().toUpperCase();
    if (!sn) return;
    const item = inventory.find((i) => i.serialNumber.toUpperCase() === sn);
    if (!item) {
      setTestResult({ success: false, message: `${sn} is not in the stock list.` });
    } else if (item.status === 'Available') {
      setTestResult({ success: true, message: `${sn} (${item.brand} ${item.type}) is in the store and free to use.` });
    } else if (item.status === 'Installed') {
      setTestResult({
        success: false,
        message: `${sn} is already fitted at consumer ${item.linkedConsumerNumber}${item.installedDate ? ` (on ${item.installedDate})` : ''}.`,
      });
    } else {
      setTestResult({ success: false, message: `${sn} is marked "${item.status}" and cannot be used.` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Panels & Inverters Stock</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Every panel and inverter, and which home it is fitted at. A serial number can only be used once.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>Each serial used only once</span>
        </div>
      </div>

      {/* Interactive Live Serial Validation Tester */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-base font-bold">Look up a serial number</h3>
        </div>
        <p className="text-sm text-slate-300">
          Check whether a panel or inverter is free, already fitted, or damaged. This only looks; it changes nothing.
        </p>

        <form
          className="flex flex-col sm:flex-row gap-2 max-w-lg"
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup();
          }}
        >
          <input
            type="text"
            value={testSerial}
            onChange={(e) => setTestSerial(e.target.value.toUpperCase())}
            placeholder="e.g. SP-540W-260301"
            aria-label="Serial number to look up"
            className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            Look up
          </button>
        </form>

        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-800'
                : 'bg-red-950/80 text-red-200 border border-red-800'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">{testResult.success ? 'Free to use' : 'Cannot be used'}</div>
              <div className="mt-0.5">{testResult.message}</div>
            </div>
          </div>
        )}
      </div>

      {/* Equipment Table & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3">
          {/* Equipment type switcher */}
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Equipment type">
            {[
              { key: 'all', label: 'All' },
              { key: 'panel', label: 'Panels' },
              { key: 'inverter', label: 'Inverters' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveType(t.key as any)}
                aria-pressed={activeType === t.key}
                className={`px-4 py-2 rounded-xl text-base font-bold transition-colors ${
                  activeType === t.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="search"
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              placeholder="Search serial, brand or consumer"
              aria-label="Search stock"
              className="text-base bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-600"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="text-base bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700"
            >
              <option value="All">All statuses</option>
              <option value="Available">Available</option>
              <option value="Installed">Installed</option>
              <option value="Reserved">Reserved</option>
              <option value="Returned">Returned</option>
              <option value="Damaged">Damaged</option>
              <option value="Quarantined">Quarantined</option>
            </select>
          </div>
        </div>

        {filteredInventory.length === 0 && (
          <div className="p-10 text-center text-base text-slate-600">Nothing matches your search.</div>
        )}

        {/* Smaller screens: cards */}
        <ul className="xl:hidden divide-y divide-slate-100">
          {filteredInventory.map((item) => (
            <li key={item.id} className="p-4 space-y-1.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-base font-bold text-slate-900 break-all">{item.serialNumber}</div>
                  <div className="text-sm text-slate-600 capitalize">
                    {item.type} · {item.brand} {item.model}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full font-bold text-sm ${statusClass(item.status)}`}>{item.status}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">Fitted at: </span>
                {item.linkedConsumerNumber ? (
                  <span className="font-mono font-bold text-emerald-800">{item.linkedConsumerNumber}</span>
                ) : (
                  <span className="text-slate-700">In store</span>
                )}
                <span className="text-slate-500"> · Batch </span>
                <span className="font-mono text-slate-700">{item.batch}</span>
              </div>
            </li>
          ))}
        </ul>

        {/* Wide screens: table */}
        {filteredInventory.length > 0 && (
          <div className="hidden xl:block relative overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Serial number</th>
                  <th className="py-3 px-4">Make & model</th>
                  <th className="py-3 px-4">Fitted at</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{item.serialNumber}</div>
                      <div className="text-slate-500 capitalize">
                        {item.type} · batch <span className="font-mono">{item.batch}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{item.brand}</div>
                      <div className="text-slate-500">{item.model}</div>
                    </td>
                    <td className="py-3 px-4">
                      {item.linkedConsumerNumber ? (
                        <span className="font-mono font-bold text-emerald-800">{item.linkedConsumerNumber}</span>
                      ) : (
                        <span className="text-slate-600">In store</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${statusClass(item.status)}`}>{item.status}</span>
                    </td>
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
