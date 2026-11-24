'use client';

import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  CheckCircle2,
  Clock,
  User,
  AlertCircle,
  FileText,
  Search,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ServiceTicket } from '@/types';

export const ServiceTicketsAdminView: React.FC = () => {
  const { serviceTickets, consumers, createServiceTicket, updateServiceTicketStatus } = useApp();

  const [createModal, setCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [closureNotes, setClosureNotes] = useState('');

  // Form State
  const [consumerNum, setConsumerNum] = useState('');
  const [issueCategory, setIssueCategory] = useState<ServiceTicket['issueCategory']>('Inverter Fault');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ServiceTicket['priority']>('High');

  const handleCreateTicket = () => {
    const consumer = consumers.find((c) => c.consumerNumber === consumerNum);
    if (!consumer || !description.trim()) {
      alert('Please select a valid consumer and provide issue description.');
      return;
    }

    createServiceTicket({
      consumerNumber: consumer.consumerNumber,
      consumerName: consumer.name,
      mobile: consumer.mobile,
      village: consumer.village,
      division: consumer.division,
      issueCategory,
      description,
      priority,
      status: 'Created',
      assignedEngineerId: 'usr_005',
      assignedEngineerName: 'Vikram Singh',
      dueDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0],
    });

    setCreateModal(false);
    setConsumerNum('');
    setDescription('');
  };

  const handleCloseTicket = () => {
    if (!selectedTicket || !closureNotes.trim()) return;
    updateServiceTicketStatus(selectedTicket.id, 'Resolved', closureNotes);
    setSelectedTicket(null);
    setClosureNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Service & Maintenance Desk</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log consumer breakdowns, assign service engineers, and record onsite visit reports.
          </p>
        </div>

        <button
          onClick={() => setCreateModal(true)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Service Ticket</span>
        </button>
      </div>

      {/* Ticket List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {serviceTickets.map((t) => (
          <div
            key={t.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-3"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                  {t.ticketNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.priority === 'High' || t.priority === 'Urgent'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {t.priority}
                </span>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  t.status === 'Resolved' || t.status === 'Closed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {t.status}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.issueCategory}</h3>
              <p className="text-xs text-slate-600 mt-1">{t.description}</p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Consumer:</span>
                <span className="font-bold text-slate-900">{t.consumerName} ({t.consumerNumber})</span>
              </div>
              <div className="flex justify-between">
                <span>Village:</span>
                <span>{t.village}, {t.division}</span>
              </div>
              <div className="flex justify-between">
                <span>Engineer:</span>
                <span className="font-semibold text-slate-800">{t.assignedEngineerName || 'Unassigned'}</span>
              </div>
            </div>

            {t.visitNotes && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                <span className="font-bold">Engineer Visit Notes:</span> {t.visitNotes}
              </div>
            )}

            {t.status !== 'Resolved' && t.status !== 'Closed' && (
              <button
                onClick={() => setSelectedTicket(t)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
              >
                Resolve & Close Ticket
              </button>
            )}
          </div>
        ))}
      </div>

      {/* CREATE TICKET MODAL */}
      {createModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Create New Service Ticket</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Consumer</label>
              <select
                value={consumerNum}
                onChange={(e) => setConsumerNum(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs"
              >
                <option value="">-- Choose Beneficiary --</option>
                {consumers.map((c) => (
                  <option key={c.id} value={c.consumerNumber}>
                    {c.consumerNumber} - {c.name} ({c.village})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Issue Category</label>
              <select
                value={issueCategory}
                onChange={(e) => setIssueCategory(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs"
              >
                <option value="Inverter Fault">Inverter Fault</option>
                <option value="Low Generation">Low Generation</option>
                <option value="Physical Damage">Physical Damage</option>
                <option value="Earthing / Wiring">Earthing / Wiring</option>
                <option value="Meter Sync">Meter Sync</option>
                <option value="Routine Inspection">Routine Inspection</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Problem Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe fault details reported by consumer..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs h-20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCreateModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Save Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVE TICKET MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Close Ticket: {selectedTicket.ticketNumber}</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Technician Visit Findings & Closure Notes
              </label>
              <textarea
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                placeholder="e.g. Inverter error cleared, terminal screws tightened, resistance verified at 2.1 ohms..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs h-24"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseTicket}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Confirm Closure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
