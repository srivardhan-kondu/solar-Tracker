'use client';

import React, { useState } from 'react';
import { useLang } from '@/i18n/LanguageContext';
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
  const { t } = useLang();
  const { serviceTickets, consumers, users, currentUser, createServiceTicket, updateServiceTicketStatus } = useApp();
  const engineers = users.filter((u) => u.role === 'Service Engineer' && u.status === 'Active');
  const isEngineer = currentUser.role === 'Service Engineer';
  const [showClosed, setShowClosed] = useState(false);
  // Engineers see only their own tickets; open tickets first
  const visibleTickets = serviceTickets
    .filter((t) => !isEngineer || t.assignedEngineerId === currentUser.id)
    .filter((t) => showClosed || (t.status !== 'Resolved' && t.status !== 'Closed'));

  const [createModal, setCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [closureNotes, setClosureNotes] = useState('');

  // Form State
  const [consumerNum, setConsumerNum] = useState('');
  const [issueCategory, setIssueCategory] = useState<ServiceTicket['issueCategory']>('Inverter Fault');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ServiceTicket['priority']>('Medium');
  const [engineerId, setEngineerId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateTicket = () => {
    const consumer = consumers.find((c) => c.consumerNumber === consumerNum);
    if (!consumer) {
      setFormError(t('Please choose the consumer.'));
      return;
    }
    if (!description.trim()) {
      setFormError(t('Please describe the problem.'));
      return;
    }
    const engineer = engineers.find((e) => e.id === engineerId);

    createServiceTicket({
      consumerNumber: consumer.consumerNumber,
      consumerName: consumer.name,
      mobile: consumer.mobile,
      village: consumer.village,
      division: consumer.division,
      issueCategory,
      description,
      priority,
      status: engineer ? 'Assigned' : 'Created',
      assignedEngineerId: engineer?.id,
      assignedEngineerName: engineer?.name,
      dueDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0],
    });

    setCreateModal(false);
    setConsumerNum('');
    setDescription('');
    setPriority('Medium');
    setEngineerId('');
    setFormError(null);
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
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {isEngineer ? t("My Service Jobs") : t("Service Complaints")}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isEngineer
              ? t("Complaints assigned to you. Close each one after your visit.")
              : t("Record a consumer complaint and choose an engineer to visit.")}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="w-4 h-4" />{t("Show closed")}</label>

        <button
          onClick={() => {
            setFormError(null);
            setCreateModal(true);
          }}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t("New complaint")}</span>
        </button>
      </div>

      {/* Ticket List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
        {visibleTickets.length === 0 && (
          <div className="md:col-span-2 py-12 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
            {isEngineer ? t("No open jobs assigned to you.") : t("No open complaints.")}
          </div>
        )}
        {visibleTickets.map((tk) => (
          <div
            key={tk.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-3"
          >
            <div className="flex flex-wrap justify-between items-start gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                  {tk.ticketNumber}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    tk.priority === 'High' || tk.priority === 'Urgent'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {t(tk.priority)}
                </span>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  tk.status === 'Resolved' || tk.status === 'Closed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {t(tk.status)}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">{t(tk.issueCategory)}</h3>
              <p className="text-xs text-slate-600 mt-1">{tk.description}</p>
            </div>

            <dl className="p-3 bg-slate-50 rounded-xl text-sm space-y-1.5 text-slate-600">
              <div>
                <dt className="inline">{t("Consumer:")}{" "}</dt>
                <dd className="inline font-bold text-slate-900">
                  {tk.consumerName} (<span className="font-mono">{tk.consumerNumber}</span>)
                </dd>
              </div>
              <div>
                <dt className="inline">{t("Village:")}{" "}</dt>
                <dd className="inline text-slate-900">
                  {tk.village}, {tk.division}
                </dd>
              </div>
              <div>
                <dt className="inline">{t("Engineer:")}{" "}</dt>
                <dd className="inline font-semibold text-slate-900">{tk.assignedEngineerName || t("Not chosen yet")}</dd>
              </div>
            </dl>

            {tk.visitNotes && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                <span className="font-bold">{t("Engineer Visit Notes:")}</span> {tk.visitNotes}
              </div>
            )}

            {tk.status !== 'Resolved' && tk.status !== 'Closed' && (
              <button
                onClick={() => setSelectedTicket(tk)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
              >{t("Close after visit")}</button>
            )}
          </div>
        ))}
      </div>

      {/* CREATE TICKET MODAL */}
      {createModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">{t("New complaint")}</h3>

            {formError && (
              <div role="alert" className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t("Select Consumer")}</label>
              <select
                value={consumerNum}
                onChange={(e) => setConsumerNum(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs"
              >
                <option value="">{t("-- Choose Beneficiary --")}</option>
                {consumers.map((c) => (
                  <option key={c.id} value={c.consumerNumber}>
                    {c.consumerNumber} - {c.name} ({c.village})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t("Issue Category")}</label>
              <select
                value={issueCategory}
                onChange={(e) => setIssueCategory(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs"
              >
                <option value="Inverter Fault">{t("Inverter Fault")}</option>
                <option value="Low Generation">{t("Low Generation")}</option>
                <option value="Physical Damage">{t("Physical Damage")}</option>
                <option value="Earthing / Wiring">{t("Earthing / Wiring")}</option>
                <option value="Meter Sync">{t("Meter Sync")}</option>
                <option value="Routine Inspection">{t("Routine Inspection")}</option>
              </select>
            </div>

            <div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t("How urgent?")}</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ServiceTicket['priority'])}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                  >
                    <option value="Low">{t("Low")}</option>
                    <option value="Medium">{t("Medium")}</option>
                    <option value="High">{t("High")}</option>
                    <option value="Urgent">{t("Urgent")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t("Engineer")}</label>
                  <select
                    value={engineerId}
                    onChange={(e) => setEngineerId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                  >
                    <option value="">{t("Choose later")}</option>
                    {engineers.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.division})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t("What is the problem?")}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("e.g. Inverter shows red light since Monday, no power at night")}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs h-20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCreateModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
              >{t("Cancel")}</button>
              <button
                onClick={handleCreateTicket}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md"
              >{t("Save complaint")}</button>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVE TICKET MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">{t('Close complaint {num}', { num: selectedTicket.ticketNumber })}</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t("What did you find and fix? (required)")}</label>
              <textarea
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                placeholder={t("e.g. Inverter error cleared, terminal screws tightened, resistance verified at 2.1 ohms...")}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs h-24"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
              >{t("Cancel")}</button>
              <button
                onClick={handleCloseTicket}
                disabled={!closureNotes.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-md disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
              >{t("Close complaint")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
