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
  const [mode, setMode] = useState<'resolve' | 'dismiss'>('resolve');
  const [resolutionNote, setResolutionNote] = useState('');

  const TYPE_LABEL: Record<string, string> = {
    missing_photo: 'Missing photos',
    gps_issue: 'Location problem',
    duplicate_serial: 'Serial already used',
    inventory_conflict: 'Stock problem',
    dcr_mismatch: 'DCR not matched',
    sync_failure: 'Sending failed',
    service_overdue: 'Service overdue',
  };

  const filteredExceptions = exceptions.filter((e) => {
    const matchType = filterType === 'All' || e.type === filterType;
    const matchStatus = filterStatus === 'All' || e.status === filterStatus;
    return matchType && matchStatus;
  });

  const handleResolve = () => {
    if (!selectedException || !resolutionNote.trim()) return;
    if (mode === 'resolve') resolveException(selectedException.id, resolutionNote.trim());
    else dismissException(selectedException.id, resolutionNote.trim());
    setSelectedException(null);
    setResolutionNote('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Problems to Fix</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Things that need someone in the office to look at them: missing photos, location problems, reused serial
            numbers and unmatched DCR rows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            aria-label="Filter by problem type"
            className="text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
          >
            <option value="All">All problem types</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
            className="text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
          >
            <option value="Open">Still open</option>
            <option value="Resolved">Fixed</option>
            <option value="Dismissed">Dismissed</option>
            <option value="All">All</option>
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
                    <span className="text-xs text-slate-500 font-semibold">{TYPE_LABEL[exc.type] || exc.type}</span>
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
                    {exc.consumerNumber &&
                      (onSelectConsumerNumber ? (
                        <button
                          onClick={() => onSelectConsumerNumber(exc.consumerNumber!)}
                          className="font-mono font-bold text-brand-700 underline mr-2"
                          title="Open this consumer"
                        >
                          {exc.consumerNumber}
                        </button>
                      ) : (
                        <span className="font-mono font-bold text-brand-700 mr-2">{exc.consumerNumber}</span>
                      ))}
                    <span>{exc.division}</span>
                  </div>
                  <span>{exc.detectedDate}</span>
                </div>

                {exc.resolutionNote && (
                  <div className="p-2.5 bg-emerald-50 rounded-xl text-xs text-emerald-900 border border-emerald-200">
                    <span className="font-bold">Note:</span> {exc.resolutionNote}
                    {exc.resolvedBy && (
                      <div className="text-xs text-emerald-700 mt-0.5">
                        Fixed by {exc.resolvedBy} on {exc.resolvedAt}
                      </div>
                    )}
                  </div>
                )}

                {exc.status === 'Open' && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setSelectedException(exc);
                        setMode('resolve');
                        setResolutionNote('');
                      }}
                      className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                    >
                      Mark as fixed
                    </button>
                    <button
                      onClick={() => {
                        setSelectedException(exc);
                        setMode('dismiss');
                        setResolutionNote('');
                      }}
                      className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-semibold"
                    >
                      Not a problem
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-2 py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            {filterStatus === 'Open' && filterType === 'All' ? 'Nothing to fix right now. 🎉' : 'Nothing matches these filters.'}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedException && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              {mode === 'resolve' ? 'Mark as fixed' : 'Not a problem'}: {selectedException.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">{selectedException.description}</p>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                {mode === 'resolve' ? 'What did you do to fix it?' : 'Why is this not a problem?'} (required)
              </label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="e.g. Supervisor physically validated site coordinates on ground and approved exception..."
                autoFocus
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm h-24 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                disabled={!resolutionNote.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
