'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Camera,
  MapPin,
  Lock,
  FileSpreadsheet,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ActionRequiredException } from '@/types';

export const ActionRequiredView: React.FC<{
  onSelectConsumerNumber?: (consumerNumber: string) => void;
}> = ({ onSelectConsumerNumber }) => {
  const { exceptions, resolveException, dismissException } = useApp();

  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('Open');
  const [selectedException, setSelectedException] = useState<ActionRequiredException | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const filteredExceptions = exceptions.filter((e) => {
    const matchType = filterType === 'All' || e.type === filterType;
    const matchStatus = filterStatus === 'All' || e.status === filterStatus;
    return matchType && matchStatus;
  });

  const handleResolve = () => {
    if (!selectedException || !resolutionNote.trim()) return;
    resolveException(selectedException.id, resolutionNote);
    setSelectedException(null);
    setResolutionNote('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Action Required / Exception Management Centre
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized queue for missing evidence, low GPS accuracy, serial collisions, and unmapped DCR rows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
          >
            <option value="All">All Exception Types</option>
            <option value="missing_photo">Missing Mandatory Photos</option>
            <option value="gps_issue">GPS Accuracy Warnings</option>
            <option value="duplicate_serial">Duplicate Serial Attempts</option>
            <option value="dcr_mismatch">DCR ULA Mismatches</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
          >
            <option value="Open">Open Exceptions</option>
            <option value="Resolved">Resolved</option>
            <option value="All">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Exception Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredExceptions.length > 0 ? (
          filteredExceptions.map((exc) => {
            return (
              <div
                key={exc.id}
                className={`p-5 rounded-2xl border shadow-sm transition-all space-y-3 ${
                  exc.status === 'Resolved'
                    ? 'bg-slate-50 border-slate-200 opacity-80'
                    : exc.priority === 'High'
                    ? 'bg-white border-red-200 hover:border-red-300'
                    : 'bg-white border-amber-200 hover:border-amber-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        exc.priority === 'High' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {exc.priority} Priority
                    </span>
                    <span className="text-xs font-mono text-slate-500 font-semibold">{exc.id}</span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      exc.status === 'Resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {exc.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{exc.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{exc.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                  <div>
                    {exc.consumerNumber && (
                      <span className="font-mono font-bold text-brand-700 mr-2">{exc.consumerNumber}</span>
                    )}
                    <span>{exc.division}</span>
                  </div>
                  <span>{exc.detectedDate}</span>
                </div>

                {exc.resolutionNote && (
                  <div className="p-2.5 bg-emerald-50 rounded-xl text-xs text-emerald-900 border border-emerald-200">
                    <span className="font-bold">Resolution Note:</span> {exc.resolutionNote}
                    <div className="text-[10px] text-emerald-700 mt-0.5">
                      Resolved by {exc.resolvedBy} on {exc.resolvedAt}
                    </div>
                  </div>
                )}

                {exc.status === 'Open' && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setSelectedException(exc);
                        setResolutionNote('');
                      }}
                      className="flex-1 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      Resolve Exception
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Enter dismissal reason:');
                        if (reason) dismissException(exc.id, reason);
                      }}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-2 py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            No exceptions found in this filter.
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedException && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Resolve Exception: {selectedException.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{selectedException.description}</p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Resolution Note & Corrective Action (Required)
              </label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="e.g. Supervisor physically validated site coordinates on ground and approved exception..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs h-24 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedException(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
