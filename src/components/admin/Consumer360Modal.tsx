'use client';

import React, { useEffect, useState } from 'react';
import { useLang } from '@/i18n/LanguageContext';
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
import { missingItems } from '@/lib/installationSteps';
import { STATUS_LABEL } from '@/lib/status';
import { friendly } from '@/lib/activity';
import { ROLE_LABEL } from '@/lib/access';
import { surveyFor } from '@/lib/survey';
import { LabelledPhoto, ReopenedNotice, ReopenSurveyControl, SurveySummary } from './SurveySummary';

const PHOTO_TITLE: Record<string, string> = {
  front: '1. Front view of the panels',
  side: '2. Side view (tilt)',
  consumer: '3. Consumer with the system',
  meter: '4. Net meter',
  inverter: '5. Inverter',
  structure: '6. Stand and bolts',
  earthing: '7. Earthing',
};

export const Consumer360Modal: React.FC<{
  consumer: Consumer;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}> = ({ consumer, onClose, onNavigateToTab }) => {
  const { t } = useLang();
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
    surveys,
  } = useApp();

  const [activePhotoPreview, setActivePhotoPreview] = useState<PhotoEvidence | null>(null);
  const [surveyPreview, setSurveyPreview] = useState<LabelledPhoto | null>(null);
  const [surveyMsg, setSurveyMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'service' | 'audit'>('overview');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [reviewMode, setReviewMode] = useState<'none' | 'approve' | 'reject'>('none');
  const [reviewDone, setReviewDone] = useState<string | null>(null);

  // Esc closes the photo preview first, then the window
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (surveyPreview) setSurveyPreview(null);
      else if (activePhotoPreview) setActivePhotoPreview(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePhotoPreview, surveyPreview, onClose]);

  const installation = installations.find((i) => i.consumerNumber === consumer.consumerNumber);
  const survey = surveyFor(surveys, consumer.consumerNumber);
  const consumerDcr = dcrRecords.find((d) => d.consumerNumber === consumer.consumerNumber || d.ula === consumer.ula);
  const consumerTickets = serviceTickets.filter((t) => t.consumerNumber === consumer.consumerNumber);
  const consumerExceptions = exceptions.filter((e) => e.consumerNumber === consumer.consumerNumber);
  const consumerLogs = auditLogs.filter(
    (l) => l.recordId === consumer.consumerNumber || (installation && l.recordId === installation.id)
  );

  const isAdminOrSuper = currentUser.role === 'Admin' || currentUser.role === 'Super Admin';
  const missing = installation ? missingItems(installation, t) : [];
  // Only installations that have been sent in and not yet approved can be reviewed
  const reviewable =
    !!installation &&
    installation.officeApprovalStatus !== 'Approved' &&
    (installation.status === 'Received by Server' || installation.status === 'Needs Review');

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-stretch sm:items-center justify-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={t('Details for {name}', { name: consumer.name })}
    >
      <div className="bg-white sm:rounded-2xl max-w-5xl w-full h-full sm:h-auto sm:max-h-[92vh] flex flex-col shadow-2xl sm:border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-slate-900 text-white flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="hidden sm:flex w-10 h-10 flex-shrink-0 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white">{consumer.name}</h2>
                <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded border border-slate-700">
                  {consumer.consumerNumber}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    consumer.status === 'Completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : consumer.status === 'Needs Review'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {t(STATUS_LABEL[consumer.status])}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {consumer.village}, {consumer.mandal}, {consumer.district} • {t('ULA')}: {consumer.ula}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              aria-label={t("Close")}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 border-b border-slate-200 bg-slate-50 grid grid-cols-2 gap-x-4 sm:flex sm:gap-6 text-sm font-semibold sm:whitespace-nowrap" role="tablist">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors text-left ${
              activeTab === 'overview'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >{t("Summary")}</button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 text-left min-w-0 ${
              activeTab === 'evidence'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{t("Photos & location")}</span>
            {installation && (
              <span className="text-xs bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded-full">
                {Object.keys(installation.photos || {}).length}/7
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('service')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 text-left min-w-0 ${
              activeTab === 'service'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>{t('Service complaints ({n})', { n: consumerTickets.length })}</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 text-left min-w-0 ${
              activeTab === 'audit'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{t("History")}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: OVERVIEW & EQUIPMENT */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top Quick Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500">{t("Status")}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-base font-bold text-slate-900">{t(STATUS_LABEL[consumer.status])}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{t("Installer:")}{" "}<span className="font-semibold text-slate-800">{consumer.assignedInstallerName || t("Unassigned")}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500">{t("DCR number")}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-brand-600" />
                    <span className="text-base font-bold text-slate-900">
                      {consumerDcr ? consumerDcr.dcrNumber : t("Not received yet")}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{t("ULA:")}{" "}<span className="font-mono font-bold text-slate-800">{consumer.ula}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500">{t("System size")}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <Box className="w-5 h-5 text-blue-600" />
                    <span className="text-base font-bold text-slate-900">{consumer.capacityKw} kW</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{t("4 panels + 1 inverter")}</div>
                </div>
              </div>

              {/* Site survey (done before installation) */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                    {t('Site survey')}
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  {surveyMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-semibold text-emerald-900" role="status">
                      {surveyMsg}
                    </div>
                  )}
                  {survey?.status === 'Submitted' ? (
                    <>
                      <SurveySummary survey={survey} onOpenPhoto={setSurveyPreview} />
                      <ReopenSurveyControl survey={survey} onReopened={setSurveyMsg} />
                    </>
                  ) : (
                    <>
                      <ReopenedNotice survey={survey} />
                      <div className="text-sm text-slate-500 italic">
                        {survey ? t('The installer has started the survey but not sent it yet.') : t('No site survey yet.')}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Equipment Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Box className="w-4 h-4 text-brand-600" />{t("Panels and inverter fitted at this home")}</h3>
                </div>

                <div className="divide-y divide-slate-100">
                  {/* Panels */}
                  <div className="p-4">
                    <div className="text-xs font-bold text-slate-500 mb-2">{t("Panels (4 needed)")}</div>
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
                            <div className="font-bold text-slate-500">{t('Panel {n}', { n: idx + 1 })}</div>
                            {serial ? (
                              <>
                                <div className="font-mono font-bold text-emerald-800 mt-1">{serial}</div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {invItem?.brand || t("Tata Power")} 540W
                                </div>
                                <div className="text-xs text-emerald-600 font-semibold mt-1">{t("✓ Recorded")}</div>
                              </>
                            ) : (
                              <div className="mt-1 text-slate-400 italic">{t("Not scanned yet")}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Inverter */}
                  <div className="p-4 bg-slate-50/50">
                    <div className="text-xs font-bold text-slate-500 mb-2">{t("Inverter")}</div>
                    {installation?.inverterSerial ? (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {installation.inverterSerial}
                          </div>
                          <div className="text-xs text-slate-500">
                            {(() => {
                              const inv = inventory.find((i) => i.serialNumber === installation.inverterSerial);
                              return inv ? `${inv.brand} ${inv.model}` : '';
                            })()}
                          </div>
                        </div>
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">{t("✓ Recorded")}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">{t("Inverter not scanned yet.")}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Office Approval Actions (FR-ADM-004) */}
              {isAdminOrSuper && installation && (
                <div className="bg-brand-50/50 border border-brand-200 rounded-xl p-4 space-y-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{t("Office check")}</h4>
                    <p className="text-sm text-slate-600">{t("Look at the photos and serial numbers before approving. Approved jobs are marked Done.")}</p>
                  </div>

                  {reviewDone && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900 font-semibold">
                      {reviewDone}
                    </div>
                  )}

                  {installation.officeApprovalStatus === 'Approved' ? (
                    <div className="text-sm text-emerald-800">
                      {t('✓ Approved by {who} on {when}', { who: installation.approvedBy, when: installation.approvedAt })}
                      {installation.officeApprovalNotes ? ` — "${installation.officeApprovalNotes}"` : ''}
                    </div>
                  ) : !reviewable ? (
                    <div className="text-sm text-slate-600">{t("This job has not been sent by the installer yet, so it cannot be checked.")}</div>
                  ) : (
                    <>
                      {missing.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                          <div className="font-bold">{t("Not everything was sent:")}</div>
                          <ul className="list-disc pl-5">
                            {missing.map((m) => (
                              <li key={m}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {reviewMode === 'none' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setApprovalNotes('');
                              setReviewMode('approve');
                            }}
                            disabled={missing.length > 0}
                            title={missing.length > 0 ? t("Cannot approve while items are missing") : undefined}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                          >{t("Approve")}</button>
                          <button
                            onClick={() => {
                              setApprovalNotes('');
                              setReviewMode('reject');
                            }}
                            className="px-5 py-2.5 bg-white border border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-sm font-bold"
                          >{t("Send back to installer")}</button>
                        </div>
                      )}

                      {reviewMode !== 'none' && (
                        <div className="space-y-2">
                          <label className="block text-sm font-bold text-slate-800">
                            {reviewMode === 'approve'
                              ? t("Note (optional)")
                              : t("What needs to be fixed? (required — the installer will see this)")}
                          </label>
                          <textarea
                            value={approvalNotes}
                            onChange={(e) => setApprovalNotes(e.target.value)}
                            autoFocus
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm h-20"
                            placeholder={
                              reviewMode === 'approve'
                                ? t("e.g. All photos checked")
                                : t("e.g. Meter photo is blurry, please take it again")
                            }
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setReviewMode('none')}
                              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700"
                            >{t("Cancel")}</button>
                            <button
                              disabled={reviewMode === 'reject' && !approvalNotes.trim()}
                              onClick={() => {
                                if (reviewMode === 'approve') {
                                  approveInstallation(installation.id, approvalNotes.trim() || undefined);
                                  setReviewDone(t('Approved. This job is now marked Done.'));
                                } else {
                                  rejectInstallation(installation.id, approvalNotes.trim());
                                  setReviewDone(t('Sent back to the installer with your note.'));
                                }
                                setReviewMode('none');
                              }}
                              className={`px-5 py-2 text-white rounded-lg text-sm font-bold disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed ${
                                reviewMode === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                              }`}
                            >
                              {reviewMode === 'approve' ? t("Yes, approve") : t("Send back")}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EVIDENCE & GPS */}
          {activeTab === 'evidence' && (
            <div className="space-y-6">
              {/* GPS Geotag Info */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{t("Location")}</div>
                    {installation?.gps ? (
                      <div className="text-xs font-mono font-semibold text-slate-700">
                        {installation.gps.latitude.toFixed(6)}° N, {installation.gps.longitude.toFixed(6)}° E • {t('Accuracy: {m} m', { m: installation.gps.accuracy })}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">{t("Location not captured yet")}</div>
                    )}
                    <div className="text-xs text-slate-500 mt-0.5">
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
                    <span>{t("Open in Google Maps")}</span>
                  </a>
                )}
              </div>

              {/* 7 Mandatory Photographs Gallery */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{t("The 7 required photos")}</h3>
                    <p className="text-xs text-slate-500">{t("Click a photo to see it bigger")}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { key: 'front', title: '1. Front view of the panels' },
                    { key: 'side', title: '2. Side view (tilt)' },
                    { key: 'consumer', title: '3. Consumer with the system' },
                    { key: 'meter', title: '4. Net meter' },
                    { key: 'inverter', title: '5. Inverter' },
                    { key: 'structure', title: '6. Stand and bolts' },
                    { key: 'earthing', title: '7. Earthing' },
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
                                alt={t(item.title)}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <button
                                onClick={() => setActivePhotoPreview(photo)}
                                aria-label={t('Open {name}', { name: t(item.title) })}
                                className="absolute inset-0 bg-black/0 hover:bg-black/40 opacity-100 transition-colors flex items-center justify-center text-white"
                              >
                                <Maximize2 className="w-6 h-6" />
                              </button>
                            </>
                          ) : (
                            <div className="text-center p-4">
                              <Camera className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                              <div className="text-xs font-semibold text-slate-400">{t("Photo missing")}</div>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="text-xs font-bold text-slate-800">{t(item.title)}</div>
                          {photo ? (
                            <div className="text-xs text-emerald-600 font-medium mt-0.5">
                              {t('✓ Taken at {time}', { time: photo.capturedAt })}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 mt-0.5 italic">{t("Not taken yet")}</div>
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
                <h3 className="text-sm font-bold text-slate-900">{t("Service complaints")}</h3>
              </div>

              {consumerTickets.length > 0 ? (
                <div className="space-y-3">
                  {consumerTickets.map((tk) => (
                    <div key={tk.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                              {tk.ticketNumber}
                            </span>
                            <span className="font-bold text-sm text-slate-900">{t(tk.issueCategory)}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{tk.description}</p>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            tk.status === 'Resolved' || tk.status === 'Closed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t(tk.status)}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between text-xs text-slate-500">
                        <span>{t('Engineer: {name}', { name: tk.assignedEngineerName || t('Unassigned') })}</span>
                        <span>{t('Logged: {when}', { when: tk.createdAt })}</span>
                      </div>

                      {tk.visitNotes && (
                        <div className="p-2.5 bg-white rounded border border-slate-200 text-xs text-slate-700">
                          <span className="font-bold">{t("Visit notes:")}</span> {tk.visitNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">{t("No complaints from this consumer.")}</div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">{t("History")}</h3>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {consumerLogs.length === 0 && <p className="text-sm text-slate-500">{t("No activity recorded yet.")}</p>}
                {consumerLogs.map((log) => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-brand-600 border-2 border-white" />
                    <div className="text-xs font-bold text-slate-900">
                      {t('{action} by {who} ({role})', {
                        action: t(friendly(log.action)),
                        who: log.actorName,
                        role: t(ROLE_LABEL[log.actorRole]),
                      })}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">{log.details}</div>
                    <div className="text-xs text-slate-400 mt-1">{log.timestamp}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
          >{t("Close")}</button>
        </div>
      </div>

      {/* Survey photo preview */}
      {surveyPreview && (
        <div className="fixed inset-0 bg-black/90 z-60 flex flex-col p-4 text-white">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h4 className="text-sm font-bold">{t(surveyPreview.label, { n: surveyPreview.n })}</h4>
              <p className="text-xs text-slate-300">{t('Taken at {time}', { time: surveyPreview.photo.capturedAt })}</p>
            </div>
            <button
              onClick={() => setSurveyPreview(null)}
              aria-label={t("Close photo")}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2 min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={surveyPreview.photo.url}
              alt={t(surveyPreview.label, { n: surveyPreview.n })}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox */}
      {activePhotoPreview && (
        <div className="fixed inset-0 bg-black/90 z-60 flex flex-col p-4 text-white">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h4 className="text-sm font-bold">{t(PHOTO_TITLE[activePhotoPreview.category])}</h4>
              <p className="text-xs text-slate-300">{t('Taken at {time}', { time: activePhotoPreview.capturedAt })}</p>
            </div>
            <button
              onClick={() => setActivePhotoPreview(null)}
              aria-label={t("Close photo")}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePhotoPreview.url}
              alt={t(PHOTO_TITLE[activePhotoPreview.category])}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
