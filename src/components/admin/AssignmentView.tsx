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

  const canAssign = selectedConsumerNumbers.length > 0 && !!targetInstallerId;

  const installerSelect = (extra = '') => (
    <select
      value={targetInstallerId}
      onChange={(e) => setTargetInstallerId(e.target.value)}
      aria-label="Installer to assign to"
      className={`text-base font-semibold bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 ${extra}`}
    >
      <option value="">— Choose installer —</option>
      {installers.map((inst) => (
        <option key={inst.id} value={inst.id}>
          {inst.name} ({inst.division})
        </option>
      ))}
    </select>
  );

  const assignButton = (extra = '') => (
    <button
      onClick={handleExecuteAssignment}
      disabled={!canAssign}
      title={
        selectedConsumerNumbers.length === 0
          ? 'Tick at least one consumer first'
          : !targetInstallerId
          ? 'Choose an installer first'
          : undefined
      }
      className={`px-5 py-2.5 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all ${
        canAssign ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'
      } ${extra}`}
    >
      <UserPlus className="w-5 h-5" />
      <span>Assign {selectedConsumerNumbers.length} ticked</span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Assign Work</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            1. Tick the consumers below. 2. Choose an installer. 3. Click Assign.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {installerSelect('w-full sm:w-auto')}
          {assignButton('w-full sm:w-auto')}
        </div>
      </div>

      {assignmentNotice && (
        <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-base text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-bold">{assignmentNotice}</span>
        </div>
      )}

      {/* Installer cards — click to choose */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {installers.map((inst) => {
          const assignedCount = consumers.filter((c) => c.assignedInstallerId === inst.id).length;
          const completedCount = consumers.filter(
            (c) => c.assignedInstallerId === inst.id && c.status === 'Completed'
          ).length;
          const chosen = targetInstallerId === inst.id;
          return (
            <button
              key={inst.id}
              onClick={() => setTargetInstallerId(inst.id)}
              aria-pressed={chosen}
              className={`text-left bg-white p-4 rounded-2xl border-2 shadow-sm space-y-1.5 transition-all ${
                chosen ? 'border-brand-600 ring-2 ring-brand-500/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="font-bold text-base text-slate-900">{inst.name}</div>
                <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded">{inst.division}</span>
              </div>
              <div className="text-xl font-bold text-slate-800">
                {assignedCount} <span className="text-sm font-normal text-slate-500">consumers assigned</span>
              </div>
              <div className="text-sm text-emerald-700 font-semibold">{completedCount} done so far</div>
              <div className={`text-sm ${chosen ? 'text-brand-700 font-bold' : 'text-slate-500'}`}>
                {chosen ? '✓ Chosen' : 'Tap to choose this installer'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Consumers to tick */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
          <button
            onClick={handleSelectAll}
            className="text-base font-bold text-brand-700 hover:text-brand-800 flex items-center gap-2"
          >
            {allSelected ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6 text-slate-500" />}
            <span>{allSelected ? 'Untick all' : `Tick all (${filteredConsumers.length})`}</span>
          </button>

          <label className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm text-slate-600 font-semibold whitespace-nowrap">Village:</span>
            <select
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              className="flex-1 sm:flex-none text-base bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700"
            >
              <option value="All">All villages</option>
              {villages.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Smaller screens: tick-able cards */}
        <ul className="xl:hidden divide-y divide-slate-100">
          {filteredConsumers.map((c) => {
            const isSelected = selectedConsumerNumbers.includes(c.consumerNumber);
            return (
              <li key={c.id}>
                <button
                  onClick={() => toggleSelectConsumer(c.consumerNumber)}
                  aria-pressed={isSelected}
                  className={`w-full text-left p-4 flex items-start gap-3 ${isSelected ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-7 h-7 text-brand-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-7 h-7 text-slate-400 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="flex-1 min-w-0 space-y-1">
                    <span className="flex flex-wrap items-start justify-between gap-2">
                      <span className="text-base font-bold text-slate-900">{c.name}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusBadgeClass(c.status)}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </span>
                    <span className="block font-mono text-sm text-slate-700">{c.consumerNumber}</span>
                    <span className="block text-sm text-slate-600">
                      {c.village}, {c.mandal} · {c.capacityKw} kW
                    </span>
                    <span className="block text-sm">
                      <span className="text-slate-500">Installer: </span>
                      {c.assignedInstallerName ? (
                        <span className="font-semibold text-slate-900">{c.assignedInstallerName}</span>
                      ) : (
                        <span className="font-bold text-amber-700">Not assigned</span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Wide screens: table */}
        <div className="hidden xl:block relative overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4 w-12">Tick</th>
                <th className="py-3 px-4">Consumer</th>
                <th className="py-3 px-4">Village</th>
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
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-brand-50/70' : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-3 px-4">
                      {isSelected ? (
                        <CheckSquare className="w-6 h-6 text-brand-600" />
                      ) : (
                        <Square className="w-6 h-6 text-slate-400" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="font-mono text-slate-600">{c.consumerNumber}</div>
                    </td>
                    <td className="py-3 px-4">
                      {c.village}, {c.mandal}
                      <div className="text-slate-500">{c.capacityKw} kW</div>
                    </td>
                    <td className="py-3 px-4">
                      {c.assignedInstallerName ? (
                        <span className="font-semibold text-slate-900">{c.assignedInstallerName}</span>
                      ) : (
                        <span className="text-amber-700 font-bold">Not assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusBadgeClass(c.status)}`}>
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

      {/* Phones & tablets: keep the Assign action within reach once something is ticked */}
      {selectedConsumerNumbers.length > 0 && <div aria-hidden className="lg:hidden h-36 sm:h-20" />}
      {selectedConsumerNumbers.length > 0 && (
        <div className="lg:hidden fixed inset-x-3 bottom-[96px] z-30 bg-white border-2 border-brand-600 rounded-2xl shadow-2xl p-3 flex flex-col sm:flex-row gap-2">
          {installerSelect('w-full sm:flex-1')}
          {assignButton('w-full sm:w-auto')}
        </div>
      )}
    </div>
  );
};
