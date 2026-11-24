'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLang } from '@/i18n/LanguageContext';
import {
  CheckCircle2,
  AlertTriangle,
  Camera,
  MapPin,
  Send,
  ArrowRight,
  ShieldAlert,
  Save,
  Loader2,
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
import { CameraCapture, CapturedPhoto } from '@/components/camera/CameraCapture';
import { distanceMetres, formatGeo, hasGeo, mapsLink } from '@/lib/geoPhoto';
import { canInstall, needsSurvey } from '@/lib/survey';

const PHOTO_GUIDES: Record<PhotoCategory, { title: string; hint: string; sampleUrl: string }> = {
  front: {
    title: '1. Front view of the panels',
    hint: 'Stand back so all 4 panels are in the photo.',
    sampleUrl: '/samples/front.svg',
  },
  side: {
    title: '2. Side view (tilt)',
    hint: 'Take from the side so the slope of the stand is clear.',
    sampleUrl: '/samples/side.svg',
  },
  consumer: {
    title: '3. Consumer with the system',
    hint: 'Consumer standing near the panels, holding their electricity bill or ID.',
    sampleUrl: '/samples/consumer.svg',
  },
  meter: {
    title: '4. Net meter',
    hint: 'Close-up so the meter numbers and the seal can be read.',
    sampleUrl: '/samples/meter.svg',
  },
  inverter: {
    title: '5. Inverter',
    hint: 'Inverter on the wall, with the barcode label and lights visible.',
    sampleUrl: '/samples/inverter.svg',
  },
  structure: {
    title: '6. Stand and bolts',
    hint: 'Close-up of the bolts and base of the panel stand.',
    sampleUrl: '/samples/structure.svg',
  },
  earthing: {
    title: '7. Earthing',
    hint: 'The earthing pit and the green earth wire.',
    sampleUrl: '/samples/earthing.svg',
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
  const { t } = useLang();
  const {
    consumers,
    currentUser,
    installerDraft,
    startOrResumeInstallation,
    scanPanel,
    scanInverter,
    addPhotoToDraft,
    submitInstallationDraft,
    activeStep,
    setDraftStep,
    updateDraft,
    surveys,
    installations,
  } = useApp();

  // Installers see only their own jobs; office staff see every open job.
  const myJobs = consumers.filter(
    (c) =>
      !CLOSED_STATUSES.includes(c.status) &&
      (currentUser.role !== 'Installer' || c.assignedInstallerId === currentUser.id)
  );
  // Only homes the site survey marked Feasible can be installed
  const openJobs = myJobs.filter((c) => canInstall(surveys, installations, c.consumerNumber));
  const waitingForSurvey = myJobs.filter((c) => needsSurvey(c, surveys, installations)).length;

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
        t('You have unsent work for {num}. If you switch, that work will be lost. Switch anyway?', {
          num: installerDraft!.consumerNumber,
        })
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

  // ---------- Step 6: the phone's real location ----------
  // Keep reading GPS for a short while and keep the most accurate reading.
  const GPS_GOOD_ENOUGH_M = 10;
  const GPS_MAX_WAIT_MS = 20000;
  type Fix = { latitude: number; longitude: number; accuracy: number };
  const [gpsFinding, setGpsFinding] = useState(false);
  const [gpsBest, setGpsBest] = useState<Fix | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const gpsWatch = useRef<number | null>(null);
  const gpsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gpsBestRef = useRef<Fix | null>(null);

  const stopGps = () => {
    if (gpsWatch.current !== null) navigator.geolocation.clearWatch(gpsWatch.current);
    if (gpsTimer.current) clearTimeout(gpsTimer.current);
    gpsWatch.current = null;
    gpsTimer.current = null;
    setGpsFinding(false);
  };

  const saveGps = () => {
    const best = gpsBestRef.current;
    stopGps();
    if (!best) {
      setGpsError(t('Could not find your location. Turn on location (GPS) on the phone, stand outside near the panels, and try again.'));
      return;
    }
    const gps: GpsLocation = {
      latitude: best.latitude,
      longitude: best.longitude,
      accuracy: Math.round(best.accuracy * 10) / 10,
      capturedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      isSimulated: false,
    };
    updateDraft({ gps });
  };

  const handleCaptureGps = () => {
    setGpsError(null);
    if (!window.isSecureContext || !navigator.geolocation) {
      setGpsError(t('This device or link cannot read the location. Open the app with its https link in Chrome.'));
      return;
    }
    stopGps();
    gpsBestRef.current = null;
    setGpsBest(null);
    setGpsFinding(true);
    gpsWatch.current = navigator.geolocation.watchPosition(
      (pos) => {
        const fix = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
        if (!gpsBestRef.current || fix.accuracy < gpsBestRef.current.accuracy) {
          gpsBestRef.current = fix;
          setGpsBest(fix);
        }
        if (fix.accuracy <= GPS_GOOD_ENOUGH_M) saveGps();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          stopGps();
          setGpsError(t('Location permission is off. Allow location for this app in your browser settings, then try again.'));
        }
        // Other errors: keep trying until the time runs out
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: GPS_MAX_WAIT_MS }
    );
    gpsTimer.current = setTimeout(saveGps, GPS_MAX_WAIT_MS);
  };

  // Stop reading GPS when leaving the step, switching consumer, or closing the screen
  useEffect(() => {
    if (gpsWatch.current !== null) stopGps();
    setGpsError(null);
    setGpsBest(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, installerDraft?.consumerNumber]);
  useEffect(() => () => {
    if (gpsWatch.current !== null) navigator.geolocation.clearWatch(gpsWatch.current);
    if (gpsTimer.current) clearTimeout(gpsTimer.current);
  }, []);

  // Photos come only from the in-app camera, with the location printed on them
  const [cameraFor, setCameraFor] = useState<PhotoCategory | null>(null);
  const handlePhotoTaken = (category: PhotoCategory, shot: CapturedPhoto) => {
    const photo: PhotoEvidence = {
      id: `photo_${Date.now()}_${category}`,
      category,
      name: PHOTO_GUIDES[category].title,
      url: shot.url,
      capturedAt: shot.capturedAt,
      status: 'captured',
      geo: shot.geo,
    };
    addPhotoToDraft(category, photo);
    setCameraFor(null);
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
    const blocker = stepBlocker(installerDraft, step, t);
    return (
      <div className="pt-4 space-y-2">
        {blocker && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{blocker}</span>
          </div>
        )}
        <div className="flex justify-between">
          <button onClick={() => goTo(step - 1)} className={btnBack}>{t("Back")}</button>
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
    const missing = missingItems(draft, t);
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
            {result.isOffline ? t("Saved on this device") : missing.length ? t("Sent, with items missing") : t("Installation sent")}
          </h2>
          <p className="text-sm text-slate-600 mt-2">{result.message}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-sm text-left space-y-1">
          <div>
            <span className="text-slate-500">{t("Consumer:")}</span> <span className="font-semibold">{draft.consumerNumber}</span>
          </div>
          <div>
            <span className="text-slate-500">{t("Panels:")}</span> {t('{n} of {total}', { n: panelsDone(draft), total: 4 })}
          </div>
          <div>
            <span className="text-slate-500">{t("Inverter:")}</span> {draft.inverterSerial || t("Not scanned")}
          </div>
          <div>
            <span className="text-slate-500">{t("Photos:")}</span> {t('{n} of {total}', { n: photosDone(draft), total: 7 })}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => {
              setSubmitted(null);
              setSelectedConsumerNum('');
            }}
            className={btnPrimary + ' justify-center'}
          >{t("Start next installation")}</button>
          <button onClick={onFinished} className={btnBack}>{t("See all installations")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t("New Installation")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("Follow the steps one by one. Your work is saved as you go.")}</p>
        </div>

        {/* Consumer Picker */}
        <label className="flex flex-col sm:flex-row sm:items-center gap-2 w-full xl:w-auto">
          <span className="text-sm font-semibold text-slate-700">{t("Consumer:")}</span>
          <select
            value={activeConsumerNum}
            onChange={(e) => handlePickConsumer(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 w-full sm:w-auto sm:min-w-[320px]"
          >
            <option value="">{t("— Choose a consumer —")}</option>
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
          <div className="text-base font-bold text-slate-900">{t("Choose a consumer to begin")}</div>
          <p className="text-sm text-slate-500">
            {openJobs.length > 0
              ? openJobs.length === 1
                ? t('You have 1 open job. Pick it from the list above.')
                : t('You have {n} open jobs. Pick one from the list above.', { n: openJobs.length })
              : t("You have no open jobs right now. Ask the office to assign work to you.")}
          </p>
          {waitingForSurvey > 0 && (
            <p className="text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 inline-block">
              {waitingForSurvey === 1
                ? t('1 more home needs a site survey first. Open Site Survey in the menu.')
                : t('{n} more homes need a site survey first. Open Site Survey in the menu.', { n: waitingForSurvey })}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Phones: one simple progress line instead of 7 boxes */}
          <div className="sm:hidden bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-bold text-slate-900">
                {t('Step {n} of {total}', { n: activeStep, total: 7 })}
              </span>
              <span className="text-sm text-slate-600">{t(STEP_TITLES[activeStep - 1])}</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-brand-600 rounded-full" style={{ width: `${(activeStep / 7) * 100}%` }} />
            </div>
          </div>

          {/* Step Indicators — status comes from the actual data, not the step number */}
          <div className="hidden sm:grid grid-cols-4 lg:grid-cols-7 gap-2">
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
                  className={`p-3 rounded-xl border-2 text-left transition-all disabled:cursor-not-allowed ${
                    !openable && !isDone ? 'opacity-60' : ''
                  } ${
                    isCurrent
                      ? 'bg-brand-600 text-white border-brand-600 font-bold shadow-sm'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">{t('Step {n}', { n: stepNum })}</div>
                  <div className="text-sm">{t(title)}</div>
                  <div className="text-xs mt-0.5 opacity-80">{isDone ? t("✓ Done") : isCurrent ? t("You are here") : t("To do")}</div>
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
              <button onClick={() => setValidationAlert(null)} className="text-sm font-bold underline">{t("OK")}</button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
            {/* STEP 1 */}
            {activeStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">{t("Step 1 — Is this the right home?")}</h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">{t("Consumer number")}</span>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">{currentConsumer?.consumerNumber}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t("Name")}</span>
                    <div className="font-bold text-slate-900 mt-0.5">{currentConsumer?.name}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t("Village")}</span>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {currentConsumer?.village}, {currentConsumer?.mandal}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t("System size")}</span>
                    <div className="font-bold text-brand-600 mt-0.5">
                      {t('{kw} kW (4 panels + 1 inverter)', { kw: currentConsumer?.capacityKw })}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button onClick={() => goTo(2)} className={btnPrimary}>
                    <span>{t("Yes, continue")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {activeStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">{t("Step 2 — Check the details with the consumer")}</h3>
                <p className="text-sm text-slate-500">{t("Read these out to the consumer. If something is wrong, tell the office. You cannot change it here.")}</p>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-sm max-w-xl">
                  {[
                    ['Name', currentConsumer?.name],
                    ['Mobile number', currentConsumer?.mobile],
                    ['ULA number (from the scheme paperwork)', currentConsumer?.ula],
                    ['Division', currentConsumer?.division],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 py-2 border-b border-slate-200 last:border-0">
                      <span className="text-slate-500">{t(label as string)}</span>
                      <span className="font-semibold text-slate-900 text-right">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-4">
                  <button onClick={() => goTo(1)} className={btnBack}>{t("Back")}</button>
                  <button
                    onClick={() => {
                      updateDraft({ consumerConfirmed: true });
                      goTo(3);
                    }}
                    className={btnPrimary}
                  >
                    <span>{t("Details are correct")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {activeStep === 3 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{t("Step 3 — Scan the 4 panels")}</h3>
                    <p className="text-sm text-slate-500">{t("Type the number from each panel's label, or tap the stock number below it.")}</p>
                  </div>
                  <span className="self-start sm:self-auto text-sm font-bold bg-brand-50 text-brand-700 px-3 py-1 rounded-full whitespace-nowrap">
                    {t('{n} of {total} done', { n: panelsDone(installerDraft), total: 4 })}
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
                          <span className="font-bold text-slate-800">{t('Panel {n}', { n: idx + 1 })}</span>
                          {serial ? (
                            <span className="text-emerald-700 font-bold">{t("✓ Saved")}</span>
                          ) : (
                            <span className="text-slate-400">{t("To do")}</span>
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
                              placeholder={t("Panel number")}
                              aria-label={t("Panel {n} number", { n: idx + 1 })}
                              className="flex-1 min-w-0 px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono"
                            />
                            <button type="submit" className="px-3 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-bold">{t("Save")}</button>
                          </form>
                        )}

                        {!serial && (
                          <button
                            onClick={() => handleScanPanel(idx, `SP-540W-26030${idx + 1}`)}
                            className="w-full text-left font-mono text-xs bg-white hover:bg-brand-50 p-2 rounded border border-slate-200 text-slate-700 font-semibold"
                            title={t("Demo: pick an available panel from stock")}
                          >
                            {t('Demo stock:')} SP-540W-26030{idx + 1}
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
                <h3 className="text-lg font-bold text-slate-900">{t("Step 4 — Scan the inverter")}</h3>

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
                        placeholder={t("Inverter number from the label")}
                        aria-label={t("Inverter number")}
                        className="flex-1 min-w-0 px-3 py-3 bg-white border border-slate-300 rounded-lg text-sm font-mono"
                      />
                      <button type="submit" className="px-4 py-3 bg-brand-600 text-white rounded-lg text-sm font-bold">{t("Save")}</button>
                    </form>
                  )}

                  <div className="pt-1">
                    <div className="text-xs text-slate-500 font-bold mb-1.5">{t("Demo stock:")}</div>
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
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{t("Step 5 — Take 7 photos")}</h3>
                    <p className="text-sm text-slate-500">{t("Take each photo as shown. All 7 are needed for the subsidy.")}</p>
                  </div>
                  <span className="self-start sm:self-auto text-sm font-bold bg-brand-50 text-brand-700 px-3 py-1 rounded-full whitespace-nowrap">
                    {t('{n} of {total} done', { n: photosDone(installerDraft), total: 7 })}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {REQUIRED_PHOTOS.map((cat) => {
                    const guide = PHOTO_GUIDES[cat];
                    const photo = installerDraft.photos?.[cat];
                    const ok = hasGeo(photo);
                    return (
                      <div
                        key={cat}
                        className={`rounded-xl border overflow-hidden ${
                          !photo ? 'bg-slate-50 border-slate-200' : ok ? 'bg-emerald-50/40 border-emerald-300' : 'bg-red-50/40 border-red-300'
                        }`}
                      >
                        <div className="h-36 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                          {photo ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.url} alt={t(guide.title)} className="w-full h-full object-cover" />
                              <span className={`absolute bottom-2 right-2 text-white text-xs font-bold px-2 py-0.5 rounded ${ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
                                {ok ? t("✓ Done") : t("No location")}
                              </span>
                            </>
                          ) : (
                            <>
                              {/* A guide picture showing what to take. It is never used as the photo. */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={guide.sampleUrl} alt="" className="w-full h-full object-cover opacity-40 grayscale" />
                              <span className="absolute top-2 left-2 bg-white/90 text-slate-700 text-xs font-bold px-2 py-0.5 rounded">{t("Example")}</span>
                              <span className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
                                <Camera className="w-8 h-8 mb-1" />
                                <span className="text-sm font-bold bg-white/80 px-2 rounded">{t("Photo needed")}</span>
                              </span>
                            </>
                          )}
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="text-sm font-bold text-slate-900">{t(guide.title)}</div>
                          <p className="text-sm text-slate-500">{t(guide.hint)}</p>
                          {photo?.geo && <p className="text-xs text-slate-500">📍 {formatGeo(photo.geo)}</p>}
                          {photo && !ok && <p className="text-sm font-semibold text-red-700">{t("This photo has no location. Please take it again.")}</p>}
                          <button
                            onClick={() => setCameraFor(cat)}
                            className={
                              photo && ok
                                ? 'w-full py-2.5 border border-slate-300 hover:bg-slate-100 rounded-lg text-sm font-semibold text-slate-600'
                                : 'w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2'
                            }
                          >
                            {!(photo && ok) && <Camera className="w-4 h-4" />}
                            {photo ? t("Take again") : t("Take photo")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {cameraFor && (
                  <CameraCapture
                    title={t(PHOTO_GUIDES[cameraFor].title)}
                    stampLabel={`${installerDraft.consumerNumber} · ${PHOTO_GUIDES[cameraFor].title}`}
                    onClose={() => setCameraFor(null)}
                    onCapture={(shot) => handlePhotoTaken(cameraFor, shot)}
                  />
                )}

                <StepFooter step={5} nextLabel="Next: location" />
              </div>
            )}

            {/* STEP 6 */}
            {activeStep === 6 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">{t("Step 6 — Capture the location")}</h3>
                <p className="text-sm text-slate-500">{t("Stand near the panels, outside if you can, then tap the button.")}</p>

                <div className="max-w-md p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  {gpsFinding ? (
                    <div className="text-center py-4 space-y-3" role="status">
                      <Loader2 className="w-10 h-10 text-brand-600 mx-auto animate-spin" />
                      <div className="text-base font-bold text-slate-900">{t("Finding your location…")}</div>
                      <div className="text-sm text-slate-600">
                        {gpsBest
                          ? t('Best so far: accurate to {m} m. Getting a better reading…', { m: Math.round(gpsBest.accuracy) })
                          : t("Stay still, outside if you can. This can take up to 20 seconds.")}
                      </div>
                      {gpsBest && (
                        <button onClick={saveGps} className="w-full py-2.5 border border-slate-300 bg-white rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100">
                          {t("Use this location now")}
                        </button>
                      )}
                    </div>
                  ) : installerDraft.gps ? (
                    (() => {
                      const g = installerDraft.gps;
                      // Compare with where the photos were taken
                      const photoGeos = Object.values(installerDraft.photos || {}).flatMap((p) => (p?.geo ? [p.geo] : []));
                      const farthest = photoGeos.length ? Math.max(...photoGeos.map((pg) => distanceMetres(g, pg))) : 0;
                      return (
                        <div className="space-y-3">
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900 flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-bold">{t("Location saved")}</div>
                              <div className="text-emerald-800 font-mono">
                                {g.latitude.toFixed(6)}, {g.longitude.toFixed(6)}
                              </div>
                              <div className="text-emerald-700">
                                {t('accurate to {m} m', { m: g.accuracy })} · {g.capturedAt}
                              </div>
                              <a href={mapsLink(g)} target="_blank" rel="noopener noreferrer" className="text-brand-700 font-semibold underline">
                                {t("Open in map")}
                              </a>
                            </div>
                          </div>
                          {g.accuracy > 15 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              {t("The signal is weak, so the office will be asked to check this location. Step outside and capture again if you can.")}
                            </div>
                          )}
                          {farthest > 200 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              {t("This is {d} m from where the photos were taken. Make sure you are at the consumer's home.", { d: Math.round(farthest) })}
                            </div>
                          )}
                          <button
                            onClick={handleCaptureGps}
                            className="w-full py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          >{t("Capture again")}</button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-6 space-y-3">
                      <MapPin className="w-10 h-10 text-brand-600 mx-auto" />
                      <button onClick={handleCaptureGps} className={btnPrimary + ' mx-auto'}>{t("Capture location now")}</button>
                    </div>
                  )}
                  {gpsError && !gpsFinding && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-800 flex items-start gap-2" role="alert">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {gpsError}
                    </div>
                  )}
                </div>

                <StepFooter step={6} nextLabel="Next: check & send" />
              </div>
            )}

            {/* STEP 7 */}
            {activeStep === 7 &&
              (() => {
                const missing = missingItems(installerDraft, t);
                const rows: [string, string, boolean][] = [
                  ['Consumer', `${currentConsumer?.name} (${currentConsumer?.consumerNumber})`, installerDraft.consumerConfirmed],
                  ['Panels', t('{n} of {total}', { n: panelsDone(installerDraft), total: 4 }), panelsDone(installerDraft) === 4],
                  ['Inverter', installerDraft.inverterSerial || t('Not scanned'), !!installerDraft.inverterSerial],
                  ['Photos', t('{n} of {total}', { n: photosDone(installerDraft), total: 7 }), photosDone(installerDraft) === 7],
                  ['Location', installerDraft.gps ? t('Saved') : t('Not captured'), !!installerDraft.gps],
                ];
                return (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">{t("Step 7 — Check everything and send")}</h3>

                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-sm max-w-lg">
                      {rows.map(([label, value, ok]) => (
                        <div key={label} className="flex justify-between gap-4 py-2 border-b border-slate-200 last:border-0">
                          <span className="text-slate-600">{t(label)}</span>
                          <span className={`font-bold flex items-center gap-1.5 ${ok ? 'text-emerald-700' : 'text-red-700'}`}>
                            {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {missing.length > 0 && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900 max-w-lg">
                        <div className="font-bold mb-1">{t("Before you can send, please finish:")}</div>
                        <ul className="list-disc pl-5 space-y-0.5">
                          {missing.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <button onClick={() => goTo(6)} className={btnBack}>{t("Back")}</button>
                      <button
                        onClick={handleSubmitFinal}
                        disabled={missing.length > 0}
                        className={btnPrimary.replace('bg-brand-600 hover:bg-brand-700', 'bg-emerald-600 hover:bg-emerald-700')}
                      >
                        <Send className="w-4 h-4" />
                        <span>{t("Send installation")}</span>
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
