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

export const AssignmentView: React.FC = () => {
  const { consumers, users, assignConsumersToInstaller } = useApp();

  const [selectedConsumerNumbers, setSelectedConsumerNumbers] = useState<string[]>([]);
  const [targetInstallerId, setTargetInstallerId] = useState<string>('usr_003'); // Ramesh Kumar
  const [villageFilter, setVillageFilter] = useState('All');
  const [assignmentNotice, setAssignmentNotice] = useState<string | null>(null);

  const installers = users.filter((u) => u.role === 'Installer');

  const filteredConsumers = villageFilter === 'All'
    ? consumers
    : consumers.filter((c) => c.village === villageFilter);

  const toggleSelectConsumer = (cNum: string) => {
    setSelectedConsumerNumbers((prev) =>
      prev.includes(cNum) ? prev.filter((id) => id !== cNum) : [...prev, cNum]
    );
  };

  const handleSelectAll = () => {
    if (selectedConsumerNumbers.length === filteredConsumers.length) {
      setSelectedConsumerNumbers([]);
    } else {
      setSelectedConsumerNumbers(filteredConsumers.map((c) => c.consumerNumber));
    }
  };

  const handleExecuteAssignment = () => {
    if (selectedConsumerNumbers.length === 0 || !targetInstallerId) return;

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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Workload & Assignment Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Allocate consumer installations in bulk or individually to certified field installers.
          </p>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex items-center gap-3">
          <select
            value={targetInstallerId}
            onChange={(e) => setTargetInstallerId(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
          >
            {installers.map((inst) => (
              <option key={inst.id} value={inst.id}>
                Assign to: {inst.name} ({inst.division})
              </option>
            ))}
          </select>

          <button
            onClick={handleExecuteAssignment}
            disabled={selectedConsumerNumbers.length === 0}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
              selectedConsumerNumbers.length > 0
                ? 'bg-brand-600 hover:bg-brand-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign ({selectedConsumerNumbers.length})</span>
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
            <div key={inst.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <div className="font-bold text-xs text-slate-900">{inst.name}</div>
                <span className="text-[10px] font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
                  {inst.division}
                </span>
              </div>
              <div className="text-xl font-extrabold text-slate-800">
                {assignedCount} <span className="text-xs font-normal text-slate-500">Consumers Allocated</span>
              </div>
              <div className="text-xs text-emerald-600 font-semibold">{completedCount} Completed so far</div>
            </div>
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
              {selectedConsumerNumbers.length === filteredConsumers.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Select All ({filteredConsumers.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Filter Village:</span>
            <select
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700"
            >
              <option value="All">All Villages</option>
              <option value="Pedakakani">Pedakakani</option>
              <option value="Narakodur">Narakodur</option>
              <option value="Kaza">Kaza</option>
              <option value="Chinna Kakani">Chinna Kakani</option>
              <option value="Atchampet">Atchampet</option>
              <option value="Kollipara">Kollipara</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4 w-10">Select</th>
                <th className="py-3 px-4">Consumer Number</th>
                <th className="py-3 px-4">Beneficiary Name</th>
                <th className="py-3 px-4">Village / Mandal</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Currently Assigned To</th>
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
                        <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {c.status}
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
