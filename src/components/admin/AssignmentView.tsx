'use client';

import React, { useState } from 'react';
import {
  UserPlus,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { STATUS_LABEL, statusBadgeClass, uniqueSorted } from '@/lib/status';

export const AssignmentView: React.FC = () => {
  const { consumers, users, assignConsumersToInstaller } = useApp();

  const [selectedConsumerNumbers, setSelectedConsumerNumbers] = useState<string[]>([]);
  const [targetInstallerId, setTargetInstallerId] = useState<string>('');
  const [villageFilter, setVillageFilter] = useState('All');
  const [assignmentNotice, setAssignmentNotice] = useState<string | null>(null);

  const installers = users.filter((u) => u.role === 'Installer');

  const villages = uniqueSorted(consumers.map((c) => c.village));

  const filteredConsumers = villageFilter === 'All'
    ? consumers
    : consumers.filter((c) => c.village === villageFilter);

  const allSelected =
    filteredConsumers.length > 0 &&
    filteredConsumers.every((c) => selectedConsumerNumbers.includes(c.consumerNumber));

  const toggleSelectConsumer = (cNum: string) => {
    setSelectedConsumerNumbers((prev) =>
      prev.includes(cNum) ? prev.filter((id) => id !== cNum) : [...prev, cNum]
    );
  };

  const handleSelectAll = () => {
    const visible = filteredConsumers.map((c) => c.consumerNumber);
    if (allSelected) {
      setSelectedConsumerNumbers((prev) => prev.filter((n) => !visible.includes(n)));
    } else {
      setSelectedConsumerNumbers((prev) => Array.from(new Set([...prev, ...visible])));
    }
  };

  const handleExecuteAssignment = () => {
    if (selectedConsumerNumbers.length === 0 || !targetInstallerId) return;
    const chosen = consumers.filter((c) => selectedConsumerNumbers.includes(c.consumerNumber));
    const takenFromOthers = chosen.filter((c) => c.assignedInstallerId && c.assignedInstallerId !== targetInstallerId);
    const finished = chosen.filter((c) => c.status === 'Completed');
    const warnings = [
      takenFromOthers.length > 0 &&
        `${takenFromOthers.length} of these already belong to another installer (${uniqueSorted(
          takenFromOthers.map((c) => c.assignedInstallerName)
        ).join(', ')}) and will be moved.`,
      finished.length > 0 && `${finished.length} of these are already Done.`,
    ].filter(Boolean);
    if (warnings.length > 0 && !window.confirm(`${warnings.join('\n')}\n\nContinue?`)) return;

    assignConsumersToInstaller(selectedConsumerNumbers, targetInstallerId);
    const installer = users.find((u) => u.id === targetInstallerId);
    setAssignmentNotice(`Assigned ${selectedConsumerNumbers.length} consumers to ${installer?.name || 'Installer'}.`);
    setSelectedConsumerNumbers([]);

    setTimeout(() => {
      setAssignmentNotice(null);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Assign Work</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            1. Tick the consumers below. 2. Choose an installer. 3. Click Assign.
          </p>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex items-center gap-3">
          <select
            value={targetInstallerId}
            onChange={(e) => setTargetInstallerId(e.target.value)}
            aria-label="Installer to assign to"
            className="text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800"
          >
            <option value="">— Choose installer —</option>
            {installers.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} ({inst.division})
              </option>
            ))}
          </select>

          <button
            onClick={handleExecuteAssignment}
            disabled={selectedConsumerNumbers.length === 0 || !targetInstallerId}
            title={
              selectedConsumerNumbers.length === 0
                ? 'Tick at least one consumer first'
                : !targetInstallerId
                ? 'Choose an installer first'
                : undefined
            }
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all ${
              selectedConsumerNumbers.length > 0 && targetInstallerId
                ? 'bg-brand-600 hover:bg-brand-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign {selectedConsumerNumbers.length} selected</span>
          </button>
        </div>
      </div>

      {assignmentNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="font-bold">{assignmentNotice}</span>
        </div>
      )}

      {/* Installer Workload Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {installers.map((inst) => {
          const assignedCount = consumers.filter((c) => c.assignedInstallerId === inst.id).length;
          const completedCount = consumers.filter(
            (c) => c.assignedInstallerId === inst.id && c.status === 'Completed'
          ).length;

          return (
            <button
              key={inst.id}
              onClick={() => setTargetInstallerId(inst.id)}
              className={`text-left bg-white p-4 rounded-2xl border shadow-sm space-y-2 transition-all ${
                targetInstallerId === inst.id ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="font-bold text-xs text-slate-900">{inst.name}</div>
                <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
                  {inst.division}
                </span>
              </div>
              <div className="text-xl font-bold text-slate-800">
                {assignedCount} <span className="text-xs font-normal text-slate-500">Consumers Allocated</span>
              </div>
              <div className="text-sm text-emerald-600 font-semibold">{completedCount} done so far</div>
              <div className="text-xs text-slate-400">
                {targetInstallerId === inst.id ? '✓ Selected' : 'Click to choose this installer'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Consumer Assignment Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1.5"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>{allSelected ? 'Untick all' : `Tick all (${filteredConsumers.length})`}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Filter Village:</span>
            <select
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700"
            >
              <option value="All">All villages</option>
              {villages.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              <tr>
                <th className="py-3 px-4 w-10">Tick</th>
                <th className="py-3 px-4">Consumer Number</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Village / Mandal</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Installer</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredConsumers.map((c) => {
                const isSelected = selectedConsumerNumbers.includes(c.consumerNumber);
                return (
                  <tr
                    key={c.id}
                    onClick={() => toggleSelectConsumer(c.consumerNumber)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-brand-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-brand-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.consumerNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{c.name}</td>
                    <td className="py-3 px-4">
                      {c.village}, {c.mandal}
                    </td>
                    <td className="py-3 px-4">{c.capacityKw} kW</td>
                    <td className="py-3 px-4">
                      {c.assignedInstallerName ? (
                        <span className="font-semibold text-slate-900">{c.assignedInstallerName}</span>
                      ) : (
                        <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded text-xs">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${statusBadgeClass(c.status)}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
