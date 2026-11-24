'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Camera,
  QrCode,
  MapPin,
  Save,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Info,
  XCircle,
  HelpCircle,
  Send,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Installation, PhotoCategory, PhotoEvidence, GpsLocation } from '@/types';
import { stepBlocker, missingItems, panelsDone, photosDone } from '@/lib/installationSteps';

const PHOTO_GUIDES: Record<PhotoCategory, { title: string; hint: string; sampleUrl: string }> = {
  front: {
    title: 'Front View (Solar Array)',
    hint: 'Capture complete rooftop solar panel layout facing south with clear tilt visible.',
    sampleUrl: '/samples/front.svg',
  },
  side: {
    title: 'Side View & Tilt Angle',
    hint: 'Show structural slope angle and clearance from roof surface.',
    sampleUrl: '/samples/side.svg',
  },
  consumer: {
    title: 'Beneficiary with Installation',
    hint: 'Consumer standing near equipment holding their Aadhaar or Consumer Bill.',
    sampleUrl: '/samples/consumer.svg',
  },
  meter: {
    title: 'Bi-directional Net Meter',
    hint: 'Close-up of meter display showing reading and Discom meter seal intact.',
    sampleUrl: '/samples/meter.svg',
  },
  inverter: {
    title: 'Inverter & AC/DC DB',
    hint: 'Inverter wall mount showing serial barcode and LEDs on normal status.',
    sampleUrl: '/samples/inverter.svg',
  },
  structure: {
    title: 'Mounting Structure & Base',
    hint: 'Anchor fasteners, civil pedestals and galvanized structure joints.',
    sampleUrl: '/samples/structure.svg',
  },
  earthing: {
    title: 'Dual Earthing & Lightning Strip',
    hint: 'Visible earthing pit chamber, earth bus bar and green insulated copper cable.',
    sampleUrl: '/samples/earthing.svg',
  },
};

export const GuidedInstallationWizard: React.FC<{ onComplete: () => void; onCancel: () => void }> = ({
  onComplete,
  onCancel,
}) => {
  const {
    installerDraft,
    activeStep,
    setDraftStep,
    updateDraft,
    consumers,
    scanPanel,
    scanInverter,
    addPhotoToDraft,
    removePhotoFromDraft,
    setGpsToDraft,
    submitInstallationDraft,
    isOnline,
    recordManualSerial,
  } = useApp();

  const [scanModal, setScanModal] = useState<{ open: boolean; type: 'panel' | 'inverter'; index?: number }>({
    open: false,
    type: 'panel',
  });
  const [manualInput, setManualInput] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ text: string; success: boolean } | null>(null);

  // Camera modal state
  const [activePhotoCategory, setActivePhotoCategory] = useState<PhotoCategory | null>(null);
  const [reportDetailsModal, setReportDetailsModal] = useState(false);
  const [reportNote, setReportNote] = useState('');
  const [submitResult, setSubmitResult] = useState<{ success: boolean; isOffline: boolean; message: string } | null>(null);
  // The draft is cleared on submit, so keep a copy for the confirmation screen.
  const [submittedDraft, setSubmittedDraft] = useState<Installation | null>(null);

  if (!installerDraft && !(submitResult && submittedDraft)) {
    return (
      <div className="p-6 text-center text-slate-600">
        <p>No active installation in progress.</p>
        <button onClick={onCancel} className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium text-sm">
          Return to My Work
        </button>
      </div>
    );
  }

  const draft = (installerDraft ?? submittedDraft)!;
  const currentConsumer = consumers.find((c) => c.consumerNumber === draft.consumerNumber);
  const blocker = stepBlocker(draft, activeStep);
  const missing = missingItems(draft);

  // Helper step indicators
  const stepTitles = [
    'Select Consumer',
    'Verify Details',
    'Scan 4 Panels',
    'Scan Inverter',
    '7 Photos Evidence',
    'Capture GPS',
    'Review & Submit',
  ];

  // Scan handler
  const closeScanModal = () => {
    setScanModal({ open: false, type: 'panel' });
    setScanFeedback(null);
    setManualInput('');
    setManualReason('');
    setShowManualFallback(false);
  };

  const handleManualSave = () => {
    if (!manualInput.trim()) {
      setScanFeedback({ text: 'Please type the number from the label.', success: false });
      return;
    }
    if (!manualReason.trim()) {
      setScanFeedback({ text: 'Please say why you are typing the number (for example: label scratched).', success: false });
      return;
    }
    const ok = handleExecuteScan(manualInput);
    if (ok) recordManualSerial(manualInput.trim().toUpperCase(), manualReason.trim());
  };

  const handleExecuteScan = (serial: string): boolean => {
    if (scanModal.type === 'panel' && scanModal.index !== undefined) {
      const res = scanPanel(scanModal.index, serial);
      setScanFeedback({ text: res.message, success: res.success });
      if (res.success) setTimeout(closeScanModal, 800);
      return res.success;
    } else if (scanModal.type === 'inverter') {
      const res = scanInverter(serial);
      setScanFeedback({ text: res.message, success: res.success });
      if (res.success) setTimeout(closeScanModal, 800);
      return res.success;
    }
    return false;
  };

  // Photo capture simulator
  const handleCapturePhoto = (category: PhotoCategory) => {
    const guide = PHOTO_GUIDES[category];
    const newPhoto: PhotoEvidence = {
      id: `photo_${Date.now()}_${category}`,
      category,
      name: guide.title,
      url: guide.sampleUrl,
      capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'captured',
    };
    addPhotoToDraft(category, newPhoto);
    setActivePhotoCategory(null);
  };

  // GPS capture simulator
  const handleCaptureGps = () => {
    const simulatedGps: GpsLocation = {
      latitude: 16.3142 + (Math.random() - 0.5) * 0.01,
      longitude: 80.4532 + (Math.random() - 0.5) * 0.01,
      accuracy: 3.4,
      capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      address: `${currentConsumer?.village || 'Field Site'}, ${currentConsumer?.mandal || 'Guntur'}, AP`,
    };
    setGpsToDraft(simulatedGps);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800">
      {/* Step Progress Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
          <span className="text-brand-600 font-bold">
            Step {activeStep} of 7: {stepTitles[activeStep - 1]}
          </span>
          <span className="text-slate-400 font-mono">
            {Math.round((activeStep / 7) * 100)}% Complete
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-brand-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${(activeStep / 7) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Step Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* STEP 1: Select Consumer */}
        {activeStep === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 text-brand-600 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Assigned Consumer Selected</h3>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Consumer No:</span>
                  <span className="font-mono font-bold text-slate-900">{draft.consumerNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Beneficiary:</span>
                  <span className="font-semibold text-slate-900">{currentConsumer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Village / Mandal:</span>
                  <span className="text-slate-800">
                    {currentConsumer?.village}, {currentConsumer?.mandal}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">System Capacity:</span>
                  <span className="font-bold text-brand-600">{currentConsumer?.capacityKw} kW (1 Inverter + 4 Panels)</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 flex gap-2.5">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p>
                Please verify that you are physically present at the consumer premises before continuing.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Verify Consumer Details */}
        {activeStep === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-600" />
                Master Record Verification
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                  <span className="text-slate-500">Consumer Name</span>
                  <span className="font-bold text-slate-900">{currentConsumer?.name}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                  <span className="text-slate-500">Consumer Number</span>
                  <span className="font-mono font-bold text-slate-900">{currentConsumer?.consumerNumber}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                  <span className="text-slate-500">ULA Identifier</span>
                  <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                    {currentConsumer?.ula}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                  <span className="text-slate-500">Mobile Number</span>
                  <span className="font-semibold text-slate-900">{currentConsumer?.mobile}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                  <span className="text-slate-500">Village / District</span>
                  <span className="text-slate-900">
                    {currentConsumer?.village}, {currentConsumer?.district}
                  </span>
                </div>
              </div>

              {draft.reportedIncorrectDetails && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  <span className="font-bold">Reported Mismatch:</span> {draft.reportedIncorrectDetails}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setReportDetailsModal(true)}
                  className="flex-1 py-2 px-3 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Report Incorrect Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateDraft({ consumerConfirmed: true });
                    setDraftStep(3);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold text-white transition-colors ${
                    draft.consumerConfirmed
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-brand-600 hover:bg-brand-700'
                  }`}
                >
                  {draft.consumerConfirmed ? '✓ Confirmed' : 'Confirm & Proceed'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Scan 4 Panels */}
        {activeStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Scan Four Solar Panels</h3>
                <p className="text-xs text-slate-500">Validate each barcode against approved inventory.</p>
              </div>
              <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2 py-1 rounded">
                {draft.panels.filter((p) => p.trim() !== '').length} / 4 Scanned
              </span>
            </div>

            <div className="space-y-2.5">
              {[0, 1, 2, 3].map((idx) => {
                const serial = draft.panels[idx];
                const isScanned = serial && serial.trim() !== '';
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                      isScanned
                        ? 'bg-emerald-50/60 border-emerald-300 shadow-sm'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isScanned ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isScanned ? '✓' : idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">Panel {idx + 1} of 4</div>
                        {isScanned ? (
                          <div className="text-xs font-mono font-bold text-emerald-800">
                            {serial}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">Tap scan to capture barcode</div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setScanFeedback(null);
                        setScanModal({ open: true, type: 'panel', index: idx });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm ${
                        isScanned
                          ? 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                          : 'bg-brand-600 text-white hover:bg-brand-700'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{isScanned ? 'Rescan' : 'Scan'}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Inventory Safety Lock:</span> Any serial number already locked to another
                beneficiary will be rejected immediately with duplicate logging.
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Scan Inverter */}
        {activeStep === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Scan Inverter Serial</h3>
              <p className="text-xs text-slate-500">Scan the barcode label affixed to the solar inverter.</p>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                draft.inverterSerial
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-sm'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                      draft.inverterSerial ? 'bg-emerald-600 text-white' : 'bg-brand-100 text-brand-700'
                    }`}
                  >
                    {draft.inverterSerial ? '✓' : 'INV'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Central Solar Inverter</div>
                    {draft.inverterSerial ? (
                      <div className="text-xs font-mono font-bold text-emerald-800">
                        {draft.inverterSerial}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">Requires 1 valid serial</div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScanFeedback(null);
                    setScanModal({ open: true, type: 'inverter' });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm ${
                    draft.inverterSerial
                      ? 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                      : 'bg-brand-600 text-white hover:bg-brand-700'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{draft.inverterSerial ? 'Rescan' : 'Scan Inverter'}</span>
                </button>
              </div>

              {draft.inverterSerial && (
                <div className="text-xs text-emerald-700 bg-emerald-100/50 p-2 rounded border border-emerald-200">
                  ✓ Validated against warehouse batch stock (Havells / Sungrow Approved Series).
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: 7 Mandatory Photographs */}
        {activeStep === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">7 Mandatory Photographs</h3>
                <p className="text-xs text-slate-500">Capture clear, unblurred evidence for MNRE approval.</p>
              </div>
              <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2 py-1 rounded">
                {Object.keys(draft.photos).length} / 7
              </span>
            </div>

            <div className="space-y-2.5">
              {(Object.keys(PHOTO_GUIDES) as PhotoCategory[]).map((cat, idx) => {
                const guide = PHOTO_GUIDES[cat];
                const photo = draft.photos[cat];
                const isCaptured = !!photo;

                return (
                  <div
                    key={cat}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isCaptured
                        ? 'bg-emerald-50/50 border-emerald-300 shadow-sm'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isCaptured ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-emerald-400 relative flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.url} alt={guide.title} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 right-0 bg-emerald-600 text-white text-xs px-1 font-bold">
                            ✓
                          </span>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 flex-shrink-0">
                          <Camera className="w-5 h-5" />
                          <span className="text-xs font-bold">#{idx + 1}</span>
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {idx + 1}. {guide.title}
                        </div>
                        <div className="text-xs text-slate-500 line-clamp-1">{guide.hint}</div>
                        {isCaptured && (
                          <div className="text-xs text-emerald-700 font-medium mt-0.5">
                            Captured at {photo.capturedAt} • High Resolution
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCaptured ? (
                        <button
                          type="button"
                          onClick={() => removePhotoFromDraft(cat)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                          title="Retake"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActivePhotoCategory(cat)}
                          className="px-3 py-1.5 bg-brand-600 text-white hover:bg-brand-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Capture</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 6: Capture GPS */}
        {activeStep === 6 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Geotagging & GPS Verification</h3>
              <p className="text-xs text-slate-500">Record coordinates to certify consumer site location.</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
              {draft.gps ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-xs">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <div className="font-bold">GPS Coordinates Locked</div>
                      <div className="text-xs text-emerald-600">
                        Accuracy: {draft.gps.accuracy} meters (Threshold &lt; 15m)
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Latitude:</span>
                      <span className="font-bold text-slate-800">{draft.gps.latitude.toFixed(6)}° N</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Longitude:</span>
                      <span className="font-bold text-slate-800">{draft.gps.longitude.toFixed(6)}° E</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Timestamp:</span>
                      <span className="text-slate-700">{draft.gps.capturedAt}</span>
                    </div>
                    <div className="flex justify-between font-sans pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Site:</span>
                      <span className="font-medium text-slate-800">{draft.gps.address}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    className="w-full py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Recapture Geotag</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Satellite Geotag Required</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Stand under open sky near solar panels to acquire lock.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Acquire GPS Location Now</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 7: Review & Submit */}
        {activeStep === 7 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Final Verification Checklist</h3>
              <p className="text-xs text-slate-500">Review all captured data before final submission.</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3 text-sm">
              {(
                [
                  ['Consumer details', draft.consumerConfirmed ? 'Confirmed' : 'Not confirmed', draft.consumerConfirmed],
                  ['Panels', `${panelsDone(draft)} of 4`, panelsDone(draft) === 4],
                  ['Inverter', draft.inverterSerial || 'Not scanned', !!draft.inverterSerial],
                  ['Photos', `${photosDone(draft)} of 7`, photosDone(draft) === 7],
                  ['Location', draft.gps ? `Saved (${draft.gps.accuracy} m)` : 'Not captured', !!draft.gps],
                ] as [string, string, boolean][]
              ).map(([label, value, ok]) => (
                <div key={label} className="flex items-center justify-between pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                  <span className="text-slate-600">{label}</span>
                  <span className={`font-bold flex items-center gap-1 ${ok ? 'text-emerald-600' : 'text-red-600'}`}>
                    {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {value}
                  </span>
                </div>
              ))}
            </div>

            {missing.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900">
                <div className="font-bold mb-1">Please finish before sending:</div>
                <ul className="list-disc pl-5">
                  {missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Offline notification card */}
            {!isOnline ? (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <div className="font-bold">Offline Field Submission:</div>
                  <p className="mt-0.5 text-amber-800">
                    Your records and high-res photos will be securely saved on this device. They will synchronize
                    automatically once network connectivity is restored.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="font-bold">Connected (4G LTE):</div>
                  <p className="mt-0.5 text-emerald-800">
                    Submission will be transmitted directly to the central server and inventory serials locked
                    atomically.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {blocker && activeStep < 7 && (
        <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 text-sm text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{blocker}</span>
        </div>
      )}

      {/* Bottom Sticky Action Footer */}
      <div className="bg-white border-t border-slate-200 p-3 shadow-lg flex items-center justify-between gap-3">
        {activeStep > 1 ? (
          <button
            type="button"
            onClick={() => setDraftStep(activeStep - 1)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Save & Exit
          </button>
        )}

        {activeStep < 7 ? (
          <button
            type="button"
            onClick={() => setDraftStep(activeStep + 1)}
            disabled={!!blocker}
            className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-bold shadow-md flex items-center justify-center gap-1.5 transition-colors disabled:bg-slate-300 disabled:text-slate-500"
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={missing.length > 0}
            onClick={() => {
              setSubmittedDraft({ ...draft });
              const res = submitInstallationDraft();
              setSubmitResult(res);
            }}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md flex items-center justify-center gap-1.5 transition-colors disabled:bg-slate-300 disabled:text-slate-500"
          >
            <Send className="w-4 h-4" />
            <span>Submit Installation</span>
          </button>
        )}
      </div>

      {/* SCANNER MODAL SIMULATOR */}
      {scanModal.open && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col p-4 text-white">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-sm font-bold">
                Scan {scanModal.type === 'panel' ? `Panel #${(scanModal.index || 0) + 1}` : 'Inverter'}
              </h4>
              <p className="text-xs text-slate-300">Align barcode inside the viewfinder</p>
            </div>
            <button
              onClick={closeScanModal}
              aria-label="Close scanner"
              className="p-1.5 bg-white/10 rounded-full hover:bg-white/20"
            >
              <XCircle className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Viewfinder simulation */}
          <div className="relative flex-1 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-700 flex flex-col items-center justify-center p-6">
            <div className="w-64 h-40 border-2 border-brand-400 rounded-xl relative flex items-center justify-center overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-brand-400" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-brand-400" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-brand-400" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-brand-400" />
              {/* Animated laser line */}
              <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]" />
              <div className="text-xs text-white/70 absolute bottom-2">Target Barcode</div>
            </div>

            {/* Scan Feedback Alert */}
            {scanFeedback && (
              <div
                className={`mt-4 p-3 rounded-lg text-xs font-semibold w-full text-center ${
                  scanFeedback.success ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                }`}
              >
                {scanFeedback.text}
              </div>
            )}

            {/* Quick test barcodes for 1-tap evaluation */}
            <div className="mt-4 w-full">
              <div className="text-xs text-slate-400 font-bold mb-1.5 text-center">
                Simulate Camera Scan (Tap an available serial):
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {scanModal.type === 'panel' ? (
                  <>
                    <button
                      onClick={() => handleExecuteScan('SP-540W-260301')}
                      className="text-xs bg-slate-800 hover:bg-brand-600 px-2.5 py-1 rounded border border-slate-700 font-mono"
                    >
                      SP-540W-260301 (Tata)
                    </button>
                    <button
                      onClick={() => handleExecuteScan('SP-540W-260302')}
                      className="text-xs bg-slate-800 hover:bg-brand-600 px-2.5 py-1 rounded border border-slate-700 font-mono"
                    >
                      SP-540W-260302 (Tata)
                    </button>
                    <button
                      onClick={() => handleExecuteScan('SP-540W-260305')}
                      className="text-xs bg-slate-800 hover:bg-brand-600 px-2.5 py-1 rounded border border-slate-700 font-mono"
                    >
                      SP-540W-260305 (Adani)
                    </button>
                    <button
                      onClick={() => handleExecuteScan('SP-540W-260101')}
                      className="text-xs bg-red-950 text-red-300 hover:bg-red-900 px-2.5 py-1 rounded border border-red-800 font-mono"
                      title="Test duplicate rejection"
                    >
                      SP-540W-260101 (Test Duplicate!)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleExecuteScan('INV-3.3KW-9003')}
                      className="text-xs bg-slate-800 hover:bg-brand-600 px-2.5 py-1 rounded border border-slate-700 font-mono"
                    >
                      INV-3.3KW-9003 (Havells)
                    </button>
                    <button
                      onClick={() => handleExecuteScan('INV-3.3KW-9004')}
                      className="text-xs bg-slate-800 hover:bg-brand-600 px-2.5 py-1 rounded border border-slate-700 font-mono"
                    >
                      INV-3.3KW-9004 (Sungrow)
                    </button>
                    <button
                      onClick={() => handleExecuteScan('INV-3.3KW-9001')}
                      className="text-xs bg-red-950 text-red-300 hover:bg-red-900 px-2.5 py-1 rounded border border-red-800 font-mono"
                      title="Test duplicate rejection"
                    >
                      INV-3.3KW-9001 (Test Duplicate!)
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Controlled Manual Entry fallback (FR-INST-017) */}
            <div className="mt-4 pt-3 border-t border-slate-800 w-full text-center">
              <button
                onClick={() => setShowManualFallback(!showManualFallback)}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                {showManualFallback ? 'Hide typing box' : "Can't scan? Type the number instead"}
              </button>

              {showManualFallback && (
                <div className="mt-3 space-y-2 bg-slate-800/80 p-3 rounded-lg text-left">
                  <div className="text-xs text-amber-300">
                    ⚠ Typed numbers are recorded and checked by the office.
                  </div>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                    placeholder="Enter serial number"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white placeholder-slate-500"
                  />
                  <input
                    type="text"
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    placeholder="Why are you typing it? (e.g. label scratched)"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500"
                  />
                  <button
                    onClick={handleManualSave}
                    className="w-full py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded text-xs font-bold"
                  >
                    Validate & Save Serial
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PHOTO CAPTURE CAMERA SIMULATOR */}
      {activePhotoCategory && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col p-4 text-white">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h4 className="text-sm font-bold">{PHOTO_GUIDES[activePhotoCategory].title}</h4>
              <p className="text-xs text-slate-300">{PHOTO_GUIDES[activePhotoCategory].hint}</p>
            </div>
            <button
              onClick={() => setActivePhotoCategory(null)}
              className="p-1.5 bg-white/10 rounded-full hover:bg-white/20"
            >
              <XCircle className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 flex flex-col justify-between p-4">
            {/* Guide sample overlay thumbnail */}
            <div className="flex justify-between items-start">
              <div className="bg-black/60 backdrop-blur-sm p-2 rounded-lg border border-white/10 max-w-[200px]">
                <div className="text-xs text-brand-300 font-bold mb-1">Guide Reference:</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={PHOTO_GUIDES[activePhotoCategory].sampleUrl}
                  alt="guide sample"
                  className="w-full h-24 object-cover rounded"
                />
              </div>
              <div className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded">
                Lighting: Optimal
              </div>
            </div>

            {/* Camera Shutter */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => handleCapturePhoto(activePhotoCategory)}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/40 transition-transform active:scale-95 shadow-2xl"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-900">
                  <Camera className="w-6 h-6" />
                </div>
              </button>
              <span className="text-xs text-slate-300">Tap shutter to capture high-res evidence</span>
            </div>
          </div>
        </div>
      )}

      {/* REPORT INCORRECT DETAILS MODAL */}
      {reportDetailsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-slate-900">Report Incorrect Master Data</h4>
            <p className="text-xs text-slate-600">
              Master data cannot be changed directly in the field. Enter discrepancy notes to alert office staff.
            </p>
            <textarea
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              placeholder="e.g. Beneficiary surname spelling mismatch or changed mobile number..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs h-24 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReportDetailsModal(false)}
                className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateDraft({ reportedIncorrectDetails: reportNote });
                  setReportDetailsModal(false);
                }}
                className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-xs font-bold"
              >
                Save Discrepancy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION CONFIRMATION MODAL */}
      {submitResult && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div
              className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${
                submitResult.isOffline ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {submitResult.isOffline ? <Save className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                {submitResult.isOffline ? 'Saved Offline Successfully' : 'Installation Submitted!'}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{submitResult.message}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-xs font-mono text-slate-700 text-left space-y-1">
              <div>Consumer: {draft.consumerNumber}</div>
              <div>Panels: {panelsDone(draft)} of 4 recorded</div>
              <div>Inverter: {draft.inverterSerial}</div>
              <div>GPS Accuracy: {draft.gps?.accuracy}m</div>
            </div>

            <button
              onClick={() => {
                setSubmitResult(null);
                setSubmittedDraft(null);
                onComplete();
              }}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
