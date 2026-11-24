'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Camera,
  MapPin,
  Send,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PhotoCategory, PhotoEvidence, GpsLocation } from '@/types';

const PHOTO_GUIDES: Record<PhotoCategory, { title: string; hint: string; sampleUrl: string }> = {
  front: {
    title: '1. Front View (Solar PV Array)',
    hint: 'Complete south-facing module arrangement with clear elevation.',
    sampleUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop',
  },
  side: {
    title: '2. Side View & Tilt Angle',
    hint: 'Tilt angle of mounting structure relative to horizontal terrace roof.',
    sampleUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=600&auto=format&fit=crop',
  },
  consumer: {
    title: '3. Beneficiary with Installation',
    hint: 'Consumer standing near equipment holding their electricity bill or ID.',
    sampleUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop',
  },
  meter: {
    title: '4. Bi-directional Net Meter',
    hint: 'Clear view of meter LCD digits and discom meter lead seal.',
    sampleUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop',
  },
  inverter: {
    title: '5. Inverter Mount & Barcode',
    hint: 'Inverter wall mount showing serial barcode and operational LEDs.',
    sampleUrl: 'https://images.unsplash.com/photo-1558441719-8b489c63f732?w=600&auto=format&fit=crop',
  },
  structure: {
    title: '6. Structure & Fasteners',
    hint: 'Anchor bolts, grouting pads, and galvanized steel structural rails.',
    sampleUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600&auto=format&fit=crop',
  },
  earthing: {
    title: '7. Dual Earthing Pit & Strip',
    hint: 'Inspection chamber, earthing pit terminal, and lightning arrester strip.',
    sampleUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop',
  },
};

export const FieldSubmissionWebView: React.FC<{
  onFinished: () => void;
}> = ({ onFinished }) => {
  const {
    consumers,
    installerDraft,
    startOrResumeInstallation,
    scanPanel,
    scanInverter,
    addPhotoToDraft,
    removePhotoFromDraft,
    setGpsToDraft,
    submitInstallationDraft,
    activeStep,
    setDraftStep,
    updateDraft,
  } = useApp();

  const [selectedConsumerNum, setSelectedConsumerNum] = useState<string>('AP-GNT-2026-003');
  const [panelInput, setPanelInput] = useState<string[]>(['', '', '', '']);
  const [inverterInput, setInverterInput] = useState<string>('');
  const [validationAlert, setValidationAlert] = useState<{ text: string; success: boolean } | null>(null);
  const [submissionCompleted, setSubmissionCompleted] = useState<boolean>(false);

  // Initialize draft if none exists
  const handleStartWorkflow = (cNum: string) => {
    setSelectedConsumerNum(cNum);
    startOrResumeInstallation(cNum);
  };

  const currentConsumer = consumers.find((c) => c.consumerNumber === (installerDraft?.consumerNumber || selectedConsumerNum));

  // Quick serial buttons
  const handleQuickScanPanel = (index: number, serial: string) => {
    const res = scanPanel(index, serial);
    setValidationAlert({ text: res.message, success: res.success });
  };

  const handleQuickScanInverter = (serial: string) => {
    const res = scanInverter(serial);
    setValidationAlert({ text: res.message, success: res.success });
  };

  const handleSimulateGps = () => {
    const loc: GpsLocation = {
      latitude: 16.3218 + (Math.random() - 0.5) * 0.005,
      longitude: 80.4429 + (Math.random() - 0.5) * 0.005,
      accuracy: 3.8,
      capturedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      address: `${currentConsumer?.village || 'Guntur'}, Andhra Pradesh`,
    };
    setGpsToDraft(loc);
  };

  const handleAttachPhoto = (category: PhotoCategory) => {
    const guide = PHOTO_GUIDES[category];
    const photo: PhotoEvidence = {
      id: `photo_${Date.now()}_${category}`,
      category,
      name: guide.title,
      url: guide.sampleUrl,
      capturedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      status: 'uploaded',
    };
    addPhotoToDraft(category, photo);
  };

  const handleSubmitFinal = () => {
    const res = submitInstallationDraft();
    setSubmissionCompleted(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-800 uppercase tracking-wider">
              Web Field Submission
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Guided Installation Workflow</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit consumer installation evidence directly from your web browser with serial verification and geotagging.
          </p>
        </div>

        {/* Consumer Picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Consumer:</span>
          <select
            value={installerDraft?.consumerNumber || selectedConsumerNum}
            onChange={(e) => handleStartWorkflow(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
          >
            {consumers.map((c) => (
              <option key={c.id} value={c.consumerNumber}>
                {c.consumerNumber} - {c.name} ({c.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          '1. Consumer',
          '2. Details',
          '3. 4 Panels',
          '4. Inverter',
          '5. 7 Photos',
          '6. Geotag',
          '7. Submit',
        ].map((title, i) => {
          const stepNum = i + 1;
          const isCurrent = activeStep === stepNum;
          const isDone = activeStep > stepNum;
          return (
            <button
              key={title}
              onClick={() => {
                if (!installerDraft) handleStartWorkflow(selectedConsumerNum);
                setDraftStep(stepNum);
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                isCurrent
                  ? 'bg-brand-600 text-white font-bold shadow-sm'
                  : isDone
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-[11px] uppercase tracking-wider">{title}</div>
              <div className="text-[10px] mt-0.5 opacity-80">{isDone ? '✓ Completed' : isCurrent ? 'Active' : 'Pending'}</div>
            </button>
          );
        })}
      </div>

      {/* Validation Message Notification */}
      {validationAlert && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            validationAlert.success
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {validationAlert.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-600" />
            )}
            <span>{validationAlert.text}</span>
          </div>
          <button onClick={() => setValidationAlert(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Step Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* STEP 1: Consumer Selection */}
        {activeStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Step 1 — Verify Selected Beneficiary</h3>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Consumer Number</span>
                <div className="font-mono font-bold text-slate-900 mt-0.5">{currentConsumer?.consumerNumber}</div>
              </div>
              <div>
                <span className="text-slate-400">Beneficiary Name</span>
                <div className="font-bold text-slate-900 mt-0.5">{currentConsumer?.name}</div>
              </div>
              <div>
                <span className="text-slate-400">Location</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {currentConsumer?.village}, {currentConsumer?.mandal}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Solar PV Capacity</span>
                <div className="font-bold text-brand-600 mt-0.5">{currentConsumer?.capacityKw} kW (1 Inverter + 4 Panels)</div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  if (!installerDraft) handleStartWorkflow(selectedConsumerNum);
                  setDraftStep(2);
                }}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <span>Continue to Step 2</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Verify Consumer Master */}
        {activeStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Step 2 — Verify Master Record & ULA</h3>
            <p className="text-xs text-slate-500">
              Confirm master data with the beneficiary. Master data cannot be altered on site to preserve audit compliance.
            </p>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs max-w-xl">
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">Beneficiary Name:</span>
                <span className="font-bold text-slate-900">{currentConsumer?.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">Mobile Number:</span>
                <span className="font-semibold text-slate-900">{currentConsumer?.mobile}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">ULA Identifier:</span>
                <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                  {currentConsumer?.ula}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Division:</span>
                <span className="font-semibold text-slate-900">{currentConsumer?.division}</span>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setDraftStep(1)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
              >
                Back
              </button>
              <button
                onClick={() => {
                  updateDraft({ consumerConfirmed: true });
                  setDraftStep(3);
                }}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <span>Confirm & Scan Panels</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Scan 4 Panels */}
        {activeStep === 3 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 3 — Scan 4 Solar PV Panels</h3>
                <p className="text-xs text-slate-500">
                  Each barcode is atomically verified against central warehouse stock. Duplicate serials are blocked.
                </p>
              </div>
              <span className="text-xs font-bold bg-brand-50 text-brand-700 px-3 py-1 rounded-full">
                {installerDraft?.panels.filter((p) => p).length || 0} / 4 Recorded
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((idx) => {
                const serial = installerDraft?.panels?.[idx];
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border space-y-3 ${
                      serial ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">Panel {idx + 1} of 4</span>
                      {serial ? (
                        <span className="text-emerald-600 font-bold">✓ Locked</span>
                      ) : (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </div>

                    <div className="font-mono text-xs font-bold text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200 min-h-[38px] flex items-center">
                      {serial || <span className="text-slate-400 font-normal italic">Scan or choose below</span>}
                    </div>

                    {/* Quick test buttons */}
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        Quick Available Stock:
                      </div>
                      <button
                        onClick={() => handleQuickScanPanel(idx, `SP-540W-26030${idx + 1}`)}
                        className="w-full text-left font-mono text-[11px] bg-white hover:bg-brand-50 p-1.5 rounded border border-slate-200 text-slate-700 font-semibold"
                      >
                        SP-540W-26030{idx + 1} (Tata)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Duplicate test button */}
            <div className="p-3 bg-slate-900 text-white rounded-xl text-xs flex justify-between items-center">
              <div>
                <span className="font-bold text-amber-400">Test Duplicate Prevention:</span> Try assigning serial{' '}
                <span className="font-mono text-amber-200 font-bold">SP-540W-260101</span> (already locked to AP-GNT-2026-001).
              </div>
              <button
                onClick={() => handleQuickScanPanel(0, 'SP-540W-260101')}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
              >
                Test Conflict Rejection
              </button>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setDraftStep(2)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
              >
                Back
              </button>
              <button
                onClick={() => setDraftStep(4)}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <span>Continue to Inverter</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Inverter */}
        {activeStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Step 4 — Inverter Serial Capture</h3>

            <div className="max-w-md p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-700">Inverter Serial Number</label>
              <div className="font-mono text-sm font-bold text-slate-900 bg-white p-3 rounded-xl border border-slate-200 min-h-[46px] flex items-center justify-between">
                <span>{installerDraft?.inverterSerial || 'No serial assigned'}</span>
                {installerDraft?.inverterSerial && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              </div>

              <div className="pt-2">
                <div className="text-[11px] text-slate-500 font-bold mb-1.5">Pick available warehouse inverter:</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleQuickScanInverter('INV-3.3KW-9003')}
                    className="flex-1 p-2 bg-white hover:bg-brand-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                  >
                    INV-3.3KW-9003 (Havells)
                  </button>
                  <button
                    onClick={() => handleQuickScanInverter('INV-3.3KW-9004')}
                    className="flex-1 p-2 bg-white hover:bg-brand-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                  >
                    INV-3.3KW-9004 (Sungrow)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setDraftStep(3)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
              >
                Back
              </button>
              <button
                onClick={() => setDraftStep(5)}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <span>Continue to 7 Photos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: 7 Mandatory Photos */}
        {activeStep === 5 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 5 — 7 Mandatory Installation Photographs</h3>
                <p className="text-xs text-slate-500">
                  Attach high-resolution evidence for each required angle as per MNRE subsidy guidelines.
                </p>
              </div>
              <span className="text-xs font-bold bg-brand-50 text-brand-700 px-3 py-1 rounded-full">
                {Object.keys(installerDraft?.photos || {}).length} / 7 Attached
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(Object.keys(PHOTO_GUIDES) as PhotoCategory[]).map((cat, idx) => {
                const guide = PHOTO_GUIDES[cat];
                const photo = installerDraft?.photos?.[cat];
                const isAttached = !!photo;

                return (
                  <div
                    key={cat}
                    className={`rounded-xl border overflow-hidden transition-all ${
                      isAttached ? 'bg-emerald-50/40 border-emerald-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="h-36 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      {isAttached ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.url} alt={guide.title} className="w-full h-full object-cover" />
                          <span className="absolute bottom-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                            ✓ Attached
                          </span>
                        </>
                      ) : (
                        <div className="text-center p-3 text-slate-400">
                          <Camera className="w-8 h-8 mx-auto mb-1 opacity-50" />
                          <span className="text-[11px] font-semibold">Evidence Required</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 space-y-2">
                      <div className="text-xs font-bold text-slate-900">{guide.title}</div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{guide.hint}</p>

                      {isAttached ? (
                        <button
                          onClick={() => removePhotoFromDraft(cat)}
                          className="w-full py-1.5 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-600"
                        >
                          Retake / Replace
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAttachPhoto(cat)}
                          className="w-full py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-sm"
                        >
                          Attach Photo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setDraftStep(4)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
              >
                Back
              </button>
              <button
                onClick={() => setDraftStep(6)}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <span>Continue to Geotag</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Geotag */}
        {activeStep === 6 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Step 6 — GPS Coordinates & Geotagging</h3>

            <div className="max-w-md p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              {installerDraft?.gps ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="font-bold">Coordinates Acquired Successfully</div>
                      <div className="text-[11px] text-emerald-700">Accuracy: {installerDraft.gps.accuracy}m</div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono space-y-1">
                    <div>Latitude: {installerDraft.gps.latitude.toFixed(6)}° N</div>
                    <div>Longitude: {installerDraft.gps.longitude.toFixed(6)}° E</div>
                    <div className="text-slate-500 font-sans mt-1">Site: {installerDraft.gps.address}</div>
                  </div>

                  <button
                    onClick={handleSimulateGps}
                    className="w-full py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Recapture GPS
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <MapPin className="w-10 h-10 text-brand-600 mx-auto" />
                  <div className="text-xs text-slate-600">Click below to acquire browser/device GPS coordinates.</div>
                  <button
                    onClick={handleSimulateGps}
                    className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md"
                  >
                    Acquire GPS Geotag
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setDraftStep(5)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
              >
                Back
              </button>
              <button
                onClick={() => setDraftStep(7)}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <span>Continue to Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: Review & Final Submit */}
        {activeStep === 7 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Step 7 — Review & Submit Installation</h3>

            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs max-w-lg">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-600">Consumer:</span>
                <span className="font-bold text-slate-900">{currentConsumer?.name} ({currentConsumer?.consumerNumber})</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-600">4 Panels:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {installerDraft?.panels.filter((p) => p).length} / 4 Recorded
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-600">Inverter:</span>
                <span className="font-mono font-bold text-emerald-700">{installerDraft?.inverterSerial || 'None'}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-600">Photos Evidence:</span>
                <span className="font-bold text-emerald-700">{Object.keys(installerDraft?.photos || {}).length} / 7 Attached</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">GPS Coordinates:</span>
                <span className="font-bold text-emerald-700">{installerDraft?.gps ? 'Locked' : 'Missing'}</span>
              </div>
            </div>

            {submissionCompleted ? (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold">Installation Submitted and Recorded Centrally!</span>
                </div>
                <button
                  onClick={onFinished}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold"
                >
                  View Installations Table
                </button>
              </div>
            ) : (
              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setDraftStep(6)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitFinal}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Installation Record</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
