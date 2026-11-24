'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Camera,
  MapPin,
  Send,
  ArrowRight,
  ShieldAlert,
  Save,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Installation, PhotoCategory, PhotoEvidence, GpsLocation } from '@/types';
import {
  isStepDone,
  stepBlocker,
  missingItems,
  panelsDone,
  photosDone,
  REQUIRED_PHOTOS,
} from '@/lib/installationSteps';

const PHOTO_GUIDES: Record<PhotoCategory, { title: string; hint: string; sampleUrl: string }> = {
  front: {
    title: '1. Front view of the panels',
    hint: 'Stand back so all 4 panels are in the photo.',
    sampleUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop',
  },
  side: {
    title: '2. Side view (tilt)',
    hint: 'Take from the side so the slope of the stand is clear.',
    sampleUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=600&auto=format&fit=crop',
  },
  consumer: {
    title: '3. Consumer with the system',
    hint: 'Consumer standing near the panels, holding their electricity bill or ID.',
    sampleUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop',
  },
  meter: {
    title: '4. Net meter',
    hint: 'Close-up so the meter numbers and the seal can be read.',
    sampleUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop',
  },
  inverter: {
    title: '5. Inverter',
    hint: 'Inverter on the wall, with the barcode label and lights visible.',
    sampleUrl: 'https://images.unsplash.com/photo-1558441719-8b489c63f732?w=600&auto=format&fit=crop',
  },
  structure: {
    title: '6. Stand and bolts',
    hint: 'Close-up of the bolts and base of the panel stand.',
    sampleUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600&auto=format&fit=crop',
  },
  earthing: {
    title: '7. Earthing',
    hint: 'The earthing pit and the green earth wire.',
    sampleUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop',
  },
};

const STEP_TITLES = [
  'Choose consumer',
  'Check details',
  'Scan 4 panels',
  'Scan inverter',
  'Take 7 photos',
  'Capture location',
  'Check & send',
];

// Jobs that are already sent or finished should not be offered again.
const CLOSED_STATUSES = ['Completed', 'Received by Server', 'Saved Locally', 'Waiting to Sync'];

const btnPrimary =
  'px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed';
const btnBack = 'px-5 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50';

export const FieldSubmissionWebView: React.FC<{
  onFinished: () => void;
}> = ({ onFinished }) => {
  const {
    consumers,
    currentUser,
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

  // Installers see only their own jobs; office staff see every open job.
  const openJobs = consumers.filter(
    (c) =>
      !CLOSED_STATUSES.includes(c.status) &&
      (currentUser.role !== 'Installer' || c.assignedInstallerId === currentUser.id)
  );

  const [selectedConsumerNum, setSelectedConsumerNum] = useState<string>('');
  const [panelInput, setPanelInput] = useState<string[]>(['', '', '', '']);
  const [inverterInput, setInverterInput] = useState<string>('');
  const [validationAlert, setValidationAlert] = useState<{ text: string; success: boolean } | null>(null);
  const [submitted, setSubmitted] = useState<{
    result: { success: boolean; isOffline: boolean; message: string };
    draft: Installation;
  } | null>(null);

  const activeConsumerNum = installerDraft?.consumerNumber || selectedConsumerNum;
  const currentConsumer = consumers.find((c) => c.consumerNumber === activeConsumerNum);

  const hasProgress = (d: Installation | null) =>
    !!d && (panelsDone(d) > 0 || !!d.inverterSerial || photosDone(d) > 0 || !!d.gps);

  const handlePickConsumer = (cNum: string) => {
    if (!cNum || cNum === installerDraft?.consumerNumber) return;
    if (
      hasProgress(installerDraft) &&
      !window.confirm(
        `You have unsent work for ${installerDraft!.consumerNumber}. If you switch, that work will be lost. Switch anyway?`
      )
    ) {
      return;
    }
    setSelectedConsumerNum(cNum);
    setValidationAlert(null);
    setPanelInput(['', '', '', '']);
    setInverterInput('');
    setSubmitted(null);
    startOrResumeInstallation(cNum);
  };

  const handleScanPanel = (index: number, serial: string) => {
    const res = scanPanel(index, serial);
    setValidationAlert({ text: res.message, success: res.success });
    if (res.success) setPanelInput((prev) => prev.map((v, i) => (i === index ? '' : v)));
  };

  const handleScanInverter = (serial: string) => {
    const res = scanInverter(serial);
    setValidationAlert({ text: res.message, success: res.success });
    if (res.success) setInverterInput('');
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
    if (!installerDraft) return;
    const snapshot = { ...installerDraft };
    const result = submitInstallationDraft();
    setSubmitted({ result, draft: snapshot });
  };

  const goTo = (step: number) => {
    setValidationAlert(null);
    setDraftStep(step);
  };

  // A step can be opened if every step before it is done.
  const canOpenStep = (step: number) => {
    if (!installerDraft) return step === 1;
    for (let s = 1; s < step; s++) if (!isStepDone(installerDraft, s)) return false;
    return true;
  };

  const StepFooter: React.FC<{ step: number; nextLabel: string }> = ({ step, nextLabel }) => {
    const blocker = stepBlocker(installerDraft, step);
    return (
      <div className="pt-4 space-y-2">
        {blocker && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{blocker}</span>
          </div>
        )}
        <div className="flex justify-between">
          <button onClick={() => goTo(step - 1)} className={btnBack}>
            Back
          </button>
          <button onClick={() => goTo(step + 1)} disabled={!!blocker} className={btnPrimary}>
            <span>{nextLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // ---------- After submission ----------
  if (submitted) {
    const { result, draft } = submitted;
    const missing = missingItems(draft);
    const tone = result.isOffline ? 'amber' : missing.length ? 'amber' : 'emerald';
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
        <div
          className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
            tone === 'emerald' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          {result.isOffline ? <Save className="w-9 h-9" /> : <CheckCircle2 className="w-9 h-9" />}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {result.isOffline ? 'Saved on this device' : missing.length ? 'Sent, with items missing' : 'Installation sent'}
          </h2>
          <p className="text-sm text-slate-600 mt-2">{result.message}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-sm text-left space-y-1">
          <div>
            <span className="text-slate-500">Consumer:</span> <span className="font-semibold">{draft.consumerNumber}</span>
          </div>
          <div>
            <span className="text-slate-500">Panels:</span> {panelsDone(draft)} of 4
          </div>
          <div>
            <span className="text-slate-500">Inverter:</span> {draft.inverterSerial || 'Not scanned'}
          </div>
          <div>
            <span className="text-slate-500">Photos:</span> {photosDone(draft)} of 7
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => {
              setSubmitted(null);
              setSelectedConsumerNum('');
            }}
            className={btnPrimary + ' justify-center'}
          >
            Start next installation
          </button>
          <button onClick={onFinished} className={btnBack}>
            See all installations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">New Installation</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Follow the steps one by one. Your work is saved as you go.
          </p>
        </div>

        {/* Consumer Picker */}
        <label className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
          <span className="text-sm font-semibold text-slate-700">Consumer:</span>
          <select
            value={activeConsumerNum}
            onChange={(e) => handlePickConsumer(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 lg:min-w-[320px]"
          >
            <option value="">— Choose a consumer —</option>
            {/* Keep the draft's consumer listed even if it is no longer "open" */}
            {currentConsumer && !openJobs.some((c) => c.id === currentConsumer.id) && (
              <option value={currentConsumer.consumerNumber}>
                {currentConsumer.name} · {currentConsumer.village}
              </option>
            )}
            {openJobs.map((c) => (
              <option key={c.id} value={c.consumerNumber}>
                {c.name} · {c.village} ({c.consumerNumber})
              </option>
            ))}
          </select>
        </label>
      </div>

      {!installerDraft ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center space-y-2">
          <div className="text-base font-bold text-slate-900">Choose a consumer to begin</div>
          <p className="text-sm text-slate-500">
            {openJobs.length > 0
              ? `You have ${openJobs.length} open job${openJobs.length === 1 ? '' : 's'}. Pick one from the list above.`
              : 'You have no open jobs right now. Ask the office to assign work to you.'}
          </p>
        </div>
      ) : (
        <>
          {/* Step Indicators — status comes from the actual data, not the step number */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {STEP_TITLES.map((title, i) => {
              const stepNum = i + 1;
              const isCurrent = activeStep === stepNum;
              const isDone = stepNum < 7 && isStepDone(installerDraft, stepNum);
              const openable = canOpenStep(stepNum);
              return (
                <button
                  key={title}
                  onClick={() => openable && goTo(stepNum)}
                  disabled={!openable}
                  className={`p-3 rounded-xl border text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    isCurrent
                      ? 'bg-brand-600 text-white border-brand-600 font-bold shadow-sm'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">Step {stepNum}</div>
                  <div className="text-sm">{title}</div>
                  <div className="text-xs mt-0.5 opacity-80">{isDone ? '✓ Done' : isCurrent ? 'You are here' : 'To do'}</div>
                </button>
              );
            })}
          </div>

          {/* Validation Message */}
          {validationAlert && (
            <div
              role="status"
              className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between gap-3 ${
                validationAlert.success
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-red-50 text-red-900 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {validationAlert.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <span>{validationAlert.text}</span>
              </div>
              <button onClick={() => setValidationAlert(null)} className="text-sm font-bold underline">
                OK
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            {/* STEP 1 */}
            {activeStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Step 1 — Is this the right home?</h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Consumer number</span>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">{currentConsumer?.consumerNumber}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Name</span>
                    <div className="font-bold text-slate-900 mt-0.5">{currentConsumer?.name}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Village</span>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {currentConsumer?.village}, {currentConsumer?.mandal}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">System size</span>
                    <div className="font-bold text-brand-600 mt-0.5">
                      {currentConsumer?.capacityKw} kW (4 panels + 1 inverter)
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button onClick={() => goTo(2)} className={btnPrimary}>
                    <span>Yes, continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {activeStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Step 2 — Check the details with the consumer</h3>
                <p className="text-sm text-slate-500">
                  Read these out to the consumer. If something is wrong, tell the office. You cannot change it here.
                </p>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-sm max-w-xl">
                  {[
                    ['Name', currentConsumer?.name],
                    ['Mobile number', currentConsumer?.mobile],
                    ['ULA number (from the scheme paperwork)', currentConsumer?.ula],
                    ['Division', currentConsumer?.division],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 py-2 border-b border-slate-200 last:border-0">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-semibold text-slate-900 text-right">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-4">
                  <button onClick={() => goTo(1)} className={btnBack}>
                    Back
                  </button>
                  <button
                    onClick={() => {
                      updateDraft({ consumerConfirmed: true });
                      goTo(3);
                    }}
                    className={btnPrimary}
                  >
                    <span>Details are correct</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {activeStep === 3 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Step 3 — Scan the 4 panels</h3>
                    <p className="text-sm text-slate-500">
                      Type the number from each panel&apos;s label, or tap the stock number below it.
                    </p>
                  </div>
                  <span className="text-sm font-bold bg-brand-50 text-brand-700 px-3 py-1 rounded-full whitespace-nowrap">
                    {panelsDone(installerDraft)} of 4 done
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[0, 1, 2, 3].map((idx) => {
                    const serial = installerDraft.panels[idx];
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border space-y-3 ${
                          serial ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-slate-800">Panel {idx + 1}</span>
                          {serial ? (
                            <span className="text-emerald-700 font-bold">✓ Saved</span>
                          ) : (
                            <span className="text-slate-400">To do</span>
                          )}
                        </div>

                        {serial ? (
                          <div className="font-mono text-sm font-bold text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200">
                            {serial}
                          </div>
                        ) : (
                          <form
                            className="flex gap-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleScanPanel(idx, panelInput[idx]);
                            }}
                          >
                            <input
                              value={panelInput[idx]}
                              onChange={(e) =>
                                setPanelInput((prev) => prev.map((v, i) => (i === idx ? e.target.value.toUpperCase() : v)))
                              }
                              placeholder="Panel number"
                              aria-label={`Panel ${idx + 1} number`}
                              className="flex-1 min-w-0 px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono"
                            />
                            <button type="submit" className="px-3 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-bold">
                              Save
                            </button>
                          </form>
                        )}

                        {!serial && (
                          <button
                            onClick={() => handleScanPanel(idx, `SP-540W-26030${idx + 1}`)}
                            className="w-full text-left font-mono text-xs bg-white hover:bg-brand-50 p-2 rounded border border-slate-200 text-slate-700 font-semibold"
                            title="Demo: pick an available panel from stock"
                          >
                            Demo stock: SP-540W-26030{idx + 1}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <StepFooter step={3} nextLabel="Next: inverter" />
              </div>
            )}

            {/* STEP 4 */}
            {activeStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Step 4 — Scan the inverter</h3>

                <div className="max-w-md p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  {installerDraft.inverterSerial ? (
                    <div className="font-mono text-base font-bold text-slate-900 bg-white p-3 rounded-xl border border-emerald-300 flex items-center justify-between">
                      <span>{installerDraft.inverterSerial}</span>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                  ) : (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleScanInverter(inverterInput);
                      }}
                    >
                      <input
                        value={inverterInput}
                        onChange={(e) => setInverterInput(e.target.value.toUpperCase())}
                        placeholder="Inverter number from the label"
                        aria-label="Inverter number"
                        className="flex-1 min-w-0 px-3 py-3 bg-white border border-slate-300 rounded-lg text-sm font-mono"
                      />
                      <button type="submit" className="px-4 py-3 bg-brand-600 text-white rounded-lg text-sm font-bold">
                        Save
                      </button>
                    </form>
                  )}

                  <div className="pt-1">
                    <div className="text-xs text-slate-500 font-bold mb-1.5">Demo stock:</div>
                    <div className="flex gap-2">
                      {['INV-3.3KW-9003', 'INV-3.3KW-9004'].map((sn) => (
                        <button
                          key={sn}
                          onClick={() => handleScanInverter(sn)}
                          className="flex-1 p-2 bg-white hover:bg-brand-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                        >
                          {sn}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <StepFooter step={4} nextLabel="Next: photos" />
              </div>
            )}

            {/* STEP 5 */}
            {activeStep === 5 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Step 5 — Take 7 photos</h3>
                    <p className="text-sm text-slate-500">Take each photo as shown. All 7 are needed for the subsidy.</p>
                  </div>
                  <span className="text-sm font-bold bg-brand-50 text-brand-700 px-3 py-1 rounded-full whitespace-nowrap">
                    {photosDone(installerDraft)} of 7 done
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {REQUIRED_PHOTOS.map((cat) => {
                    const guide = PHOTO_GUIDES[cat];
                    const photo = installerDraft.photos?.[cat];
                    return (
                      <div
                        key={cat}
                        className={`rounded-xl border overflow-hidden ${
                          photo ? 'bg-emerald-50/40 border-emerald-300' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="h-36 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                          {photo ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.url} alt={guide.title} className="w-full h-full object-cover" />
                              <span className="absolute bottom-2 right-2 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                                ✓ Done
                              </span>
                            </>
                          ) : (
                            <div className="text-center p-3 text-slate-400">
                              <Camera className="w-8 h-8 mx-auto mb-1 opacity-50" />
                              <span className="text-sm font-semibold">Photo needed</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="text-sm font-bold text-slate-900">{guide.title}</div>
                          <p className="text-sm text-slate-500">{guide.hint}</p>
                          {photo ? (
                            <button
                              onClick={() => removePhotoFromDraft(cat)}
                              className="w-full py-2.5 border border-slate-300 hover:bg-slate-100 rounded-lg text-sm font-semibold text-slate-600"
                            >
                              Take again
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAttachPhoto(cat)}
                              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-bold shadow-sm"
                            >
                              Take photo
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <StepFooter step={5} nextLabel="Next: location" />
              </div>
            )}

            {/* STEP 6 */}
            {activeStep === 6 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Step 6 — Capture the location</h3>
                <p className="text-sm text-slate-500">Stand near the panels, outside if you can, then tap the button.</p>

                <div className="max-w-md p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  {installerDraft.gps ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <div>
                          <div className="font-bold">Location saved</div>
                          <div className="text-emerald-700">
                            {installerDraft.gps.address} · accurate to {installerDraft.gps.accuracy} m
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleSimulateGps}
                        className="w-full py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Capture again
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6 space-y-3">
                      <MapPin className="w-10 h-10 text-brand-600 mx-auto" />
                      <button onClick={handleSimulateGps} className={btnPrimary + ' mx-auto'}>
                        Capture location now
                      </button>
                    </div>
                  )}
                </div>

                <StepFooter step={6} nextLabel="Next: check & send" />
              </div>
            )}

            {/* STEP 7 */}
            {activeStep === 7 &&
              (() => {
                const missing = missingItems(installerDraft);
                const rows: [string, string, boolean][] = [
                  ['Consumer', `${currentConsumer?.name} (${currentConsumer?.consumerNumber})`, installerDraft.consumerConfirmed],
                  ['Panels', `${panelsDone(installerDraft)} of 4`, panelsDone(installerDraft) === 4],
                  ['Inverter', installerDraft.inverterSerial || 'Not scanned', !!installerDraft.inverterSerial],
                  ['Photos', `${photosDone(installerDraft)} of 7`, photosDone(installerDraft) === 7],
                  ['Location', installerDraft.gps ? 'Saved' : 'Not captured', !!installerDraft.gps],
                ];
                return (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Step 7 — Check everything and send</h3>

                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-sm max-w-lg">
                      {rows.map(([label, value, ok]) => (
                        <div key={label} className="flex justify-between gap-4 py-2 border-b border-slate-200 last:border-0">
                          <span className="text-slate-600">{label}</span>
                          <span className={`font-bold flex items-center gap-1.5 ${ok ? 'text-emerald-700' : 'text-red-700'}`}>
                            {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {missing.length > 0 && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900 max-w-lg">
                        <div className="font-bold mb-1">Before you can send, please finish:</div>
                        <ul className="list-disc pl-5 space-y-0.5">
                          {missing.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <button onClick={() => goTo(6)} className={btnBack}>
                        Back
                      </button>
                      <button
                        onClick={handleSubmitFinal}
                        disabled={missing.length > 0}
                        className={btnPrimary.replace('bg-brand-600 hover:bg-brand-700', 'bg-emerald-600 hover:bg-emerald-700')}
                      >
                        <Send className="w-4 h-4" />
                        <span>Send installation</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
          </div>
        </>
      )}
    </div>
  );
};
