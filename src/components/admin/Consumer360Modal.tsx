'use client';

import React, { useState } from 'react';
import {
  X,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Camera,
  Box,
  FileSpreadsheet,
  Wrench,
  History,
  ShieldCheck,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Consumer, PhotoEvidence } from '@/types';

export const Consumer360Modal: React.FC<{
  consumer: Consumer;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}> = ({ consumer, onClose, onNavigateToTab }) => {
  const {
    installations,
    inventory,
    dcrRecords,
    serviceTickets,
    exceptions,
    auditLogs,
    approveInstallation,
    rejectInstallation,
    currentUser,
  } = useApp();

  const [activePhotoPreview, setActivePhotoPreview] = useState<PhotoEvidence | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'service' | 'audit'>('overview');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showApprovalBox, setShowApprovalBox] = useState(false);

  const installation = installations.find((i) => i.consumerNumber === consumer.consumerNumber);
  const consumerDcr = dcrRecords.find((d) => d.consumerNumber === consumer.consumerNumber || d.ula === consumer.ula);
  const consumerTickets = serviceTickets.filter((t) => t.consumerNumber === consumer.consumerNumber);
  const consumerExceptions = exceptions.filter((e) => e.consumerNumber === consumer.consumerNumber);
  const consumerLogs = auditLogs.filter(
    (l) => l.recordId === consumer.consumerNumber || (installation && l.recordId === installation.id)
  );

  const isAdminOrSuper = currentUser.role === 'Admin' || currentUser.role === 'Super Admin';

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">{consumer.name}</h2>
                <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded border border-slate-700">
                  {consumer.consumerNumber}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    consumer.status === 'Completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : consumer.status === 'Needs Review'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {consumer.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {consumer.village}, {consumer.mandal}, {consumer.district} • ULA: {consumer.ula}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview & Equipment
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'evidence'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>7 Photos & Geotag</span>
            {installation && (
              <span className="text-[10px] bg-brand-100 text-brand-800 px-1.5 py-0.2 rounded-full">
                {Object.keys(installation.photos || {}).length}/7
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('service')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'service'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Service Tickets ({consumerTickets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW & EQUIPMENT */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top Quick Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Installation Status
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-base font-bold text-slate-900">{consumer.status}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Installer: <span className="font-semibold text-slate-800">{consumer.assignedInstallerName || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    DCR Mapping Status
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-brand-600" />
                    <span className="text-base font-bold text-slate-900">
                      {consumerDcr ? consumerDcr.dcrNumber : 'Pending Upload'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    ULA Key: <span className="font-mono font-bold text-slate-800">{consumer.ula}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    System Specifications
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <Box className="w-5 h-5 text-blue-600" />
                    <span className="text-base font-bold text-slate-900">{consumer.capacityKw} kW Solar PV</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">Configuration: 4 Panels + 1 Inverter</div>
                </div>
              </div>

              {/* Equipment Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Box className="w-4 h-4 text-brand-600" />
                    Locked Equipment Serials (Atomic Inventory Allocation)
                  </h3>
                  <span className="text-xs text-slate-500">Authoritative Central Record</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {/* Panels */}
                  <div className="p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Solar PV Panels (4 Modules Required)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {[0, 1, 2, 3].map((idx) => {
                        const serial = installation?.panels?.[idx];
                        const invItem = inventory.find((i) => i.serialNumber === serial);
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border text-xs ${
                              serial
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}
                          >
                            <div className="font-bold text-slate-500">Panel {idx + 1}</div>
                            {serial ? (
                              <>
                                <div className="font-mono font-bold text-emerald-800 mt-1">{serial}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {invItem?.brand || 'Tata Power'} 540W
                                </div>
                                <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                                  ✓ Status: Locked
                                </div>
                              </>
                            ) : (
                              <div className="mt-1 text-slate-400 italic">Not scanned yet</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Inverter */}
                  <div className="p-4 bg-slate-50/50">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Solar Inverter
                    </div>
                    {installation?.inverterSerial ? (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {installation.inverterSerial}
                          </div>
                          <div className="text-xs text-slate-500">Havells Enviro 3.3kW Single Phase</div>
                        </div>
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                          ✓ Locked to Consumer
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">No inverter serial recorded.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Office Approval Actions (FR-ADM-004) */}
              {isAdminOrSuper && installation && (
                <div className="bg-brand-50/50 border border-brand-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Office Review & Sign-Off</h4>
                      <p className="text-xs text-slate-600">
                        Verify evidence before marking completed and releasing for DCR / subsidy submission.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approveInstallation(installation.id, approvalNotes)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                      >
                        Approve Installation
                      </button>
                      <button
                        onClick={() => {
                          const note = prompt('Please enter rejection reason:');
                          if (note) rejectInstallation(installation.id, note);
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm"
                      >
                        Reject / Flag Discrepancy
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EVIDENCE & GPS */}
          {activeTab === 'evidence' && (
            <div className="space-y-6">
              {/* GPS Geotag Info */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Geotagged Coordinates</div>
                    {installation?.gps ? (
                      <div className="text-xs font-mono font-semibold text-slate-700">
                        {installation.gps.latitude.toFixed(6)}° N, {installation.gps.longitude.toFixed(6)}° E • Accuracy:{' '}
                        {installation.gps.accuracy}m
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">GPS not yet captured</div>
                    )}
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {installation?.gps?.address || `${consumer.village}, ${consumer.district}`}
                    </div>
                  </div>
                </div>

                {installation?.gps && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${installation.gps.latitude},${installation.gps.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View on Google Maps</span>
                  </a>
                )}
              </div>

              {/* 7 Mandatory Photographs Gallery */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">7 Mandatory Installation Photographs</h3>
                    <p className="text-xs text-slate-500">Click any image to view high-resolution evidence</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { key: 'front', title: '1. Front View (Array)' },
                    { key: 'side', title: '2. Side & Tilt Angle' },
                    { key: 'consumer', title: '3. Beneficiary with ID' },
                    { key: 'meter', title: '4. Bi-directional Meter' },
                    { key: 'inverter', title: '5. Inverter Mount & LEDs' },
                    { key: 'structure', title: '6. Mounting Structure' },
                    { key: 'earthing', title: '7. Dual Earthing Pit' },
                  ].map((item) => {
                    const photo = installation?.photos?.[item.key as keyof typeof installation.photos];
                    return (
                      <div
                        key={item.key}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                      >
                        <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                          {photo ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.url}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <button
                                onClick={() => setActivePhotoPreview(photo)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                              >
                                <Maximize2 className="w-6 h-6" />
                              </button>
                            </>
                          ) : (
                            <div className="text-center p-4">
                              <Camera className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                              <div className="text-xs font-semibold text-slate-400">Missing Evidence</div>
                              <div className="text-[10px] text-red-500 font-bold mt-1">Action Required</div>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="text-xs font-bold text-slate-800">{item.title}</div>
                          {photo ? (
                            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                              ✓ Captured at {photo.capturedAt}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 mt-0.5 italic">Not submitted</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SERVICE TICKETS */}
          {activeTab === 'service' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">Service & Maintenance History</h3>
              </div>

              {consumerTickets.length > 0 ? (
                <div className="space-y-3">
                  {consumerTickets.map((t) => (
                    <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                              {t.ticketNumber}
                            </span>
                            <span className="font-bold text-sm text-slate-900">{t.issueCategory}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{t.description}</p>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            t.status === 'Resolved' || t.status === 'Closed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
                        <span>Assigned Engineer: {t.assignedEngineerName || 'Unassigned'}</span>
                        <span>Logged: {t.createdAt}</span>
                      </div>

                      {t.visitNotes && (
                        <div className="p-2.5 bg-white rounded border border-slate-200 text-xs text-slate-700">
                          <span className="font-bold">Engineer Visit Notes:</span> {t.visitNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  No service tickets logged for this consumer. System running smoothly.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Immutable Audit Trail</h3>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {consumerLogs.map((log) => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-brand-600 border-2 border-white" />
                    <div className="text-xs font-bold text-slate-900">
                      {log.action} <span className="text-slate-400 font-normal">by</span> {log.actorName} (
                      {log.actorRole})
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">{log.details}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{log.timestamp}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
          >
            Close View
          </button>
        </div>
      </div>

      {/* Fullscreen Photo Lightbox */}
      {activePhotoPreview && (
        <div className="fixed inset-0 bg-black/90 z-60 flex flex-col p-4 text-white">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h4 className="text-sm font-bold">{activePhotoPreview.name}</h4>
              <p className="text-xs text-slate-400">Captured at {activePhotoPreview.capturedAt}</p>
            </div>
            <button
              onClick={() => setActivePhotoPreview(null)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePhotoPreview.url}
              alt={activePhotoPreview.name}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
