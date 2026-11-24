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

export const InventoryView: React.FC = () => {
  const { inventory, consumers, scanPanel } = useApp();

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

  const handleTestAtomicValidation = () => {
    if (!testSerial.trim()) return;
    const res = scanPanel(0, testSerial);
    setTestResult({ success: res.success, message: res.message });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Equipment Inventory & Locking Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Central serial ledger enforcing atomic equipment allocation and blocking duplicate assignment attempts.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>Atomic Uniqueness Enforced</span>
        </div>
      </div>

      {/* Interactive Live Serial Validation Tester */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold">Interactive Atomic Locking & Duplicate Prevention Test</h3>
        </div>
        <p className="text-xs text-slate-300">
          Test any serial number to verify server-side duplicate prevention (e.g., test already-installed{' '}
          <span className="font-mono text-amber-300 font-bold">SP-540W-260101</span> or available{' '}
          <span className="font-mono text-emerald-300 font-bold">SP-540W-260301</span>).
        </p>

        <div className="flex gap-2 max-w-lg">
          <input
            type="text"
            value={testSerial}
            onChange={(e) => setTestSerial(e.target.value.toUpperCase())}
            placeholder="Enter serial number to test lock"
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={handleTestAtomicValidation}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Verify Uniqueness
          </button>
        </div>

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
              <div className="font-bold">{testResult.success ? 'Available for Allocation' : 'Duplicate Scan Rejection'}</div>
              <div className="mt-0.5">{testResult.message}</div>
            </div>
          </div>
        )}
      </div>

      {/* Equipment Table & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Equipment Type switcher */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All Equipment' },
              { key: 'panel', label: 'Solar Panels' },
              { key: 'inverter', label: 'Inverters' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveType(t.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeType === t.key
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              placeholder="Search serial or consumer..."
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Installed">Installed</option>
              <option value="Damaged">Damaged</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Serial Number</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Manufacturer & Model</th>
                <th className="py-3 px-4">Batch</th>
                <th className="py-3 px-4">Locked To Consumer</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.serialNumber}</td>
                  <td className="py-3 px-4 capitalize font-semibold text-slate-600">{item.type}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-800">{item.brand}</div>
                    <div className="text-[11px] text-slate-400">{item.model}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{item.batch}</td>
                  <td className="py-3 px-4">
                    {item.linkedConsumerNumber ? (
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {item.linkedConsumerNumber}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Warehouse Stock</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        item.status === 'Installed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'Available'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
