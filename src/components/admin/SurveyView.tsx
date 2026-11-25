'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Send,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { noTranslate, useLang } from '@/i18n/LanguageContext';
import { useApp } from '@/context/AppContext';
import { isOfficeRole } from '@/lib/access';
import { Consumer, SiteSurvey, SurveyPhoto } from '@/types';
import {
  MAX_EXTRA_PHOTOS,
  ROOF_TYPES,
  SHADE_LEVELS,
  SHADE_SOURCES,
  consentMissing,
  needsSurvey,
  surveyFor,
  surveyMissing,
} from '@/lib/survey';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { PhotoVerification } from '@/components/camera/PhotoVerification';
import { formatGeo, hasGeo, mapsLink } from '@/lib/geoPhoto';
import { ConsentSection } from './ConsentForm';
import { DecisionBadge, LabelledPhoto, ReopenedNotice, ReopenSurveyControl, SurveySummary } from './SurveySummary';

const btnPrimary =
  'px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed';
const btnBack =
  'px-5 py-3 border border-slate-300 rounded-xl text-base font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2';

const now = () => new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

/* ---------- Photo taking ---------- */

/** One big button that opens the in-app camera. Photos cannot be uploaded from the phone. */
const PhotoPicker: React.FC<{ onPicked: (photo: SurveyPhoto) => void; title: string; stampLabel: string }> = ({
  onPicked,
  title,
  stampLabel,
}) => {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnPrimary + ' w-full sm:w-auto'}>
        <Camera className="w-5 h-5" />
        {t('Take photo')}
      </button>
      {open && (
        <CameraCapture
          title={title}
          stampLabel={stampLabel}
          onClose={() => setOpen(false)}
          onCapture={(shot) => {
            setOpen(false);
            onPicked({ id: `svp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ...shot });
          }}
        />
      )}
    </>
  );
};

/** A taken photo, with a button to remove it */
const PhotoTile: React.FC<{ photo: SurveyPhoto; label: string; onRemove: () => void; onOpen: () => void }> = ({
  photo,
  label,
  onRemove,
  onOpen,
}) => {
  const { t } = useLang();
  return (
    <div className={`rounded-xl border-2 overflow-hidden bg-white ${hasGeo(photo) ? 'border-emerald-300' : 'border-red-300'}`}>
      <button type="button" onClick={onOpen} className="block w-full" aria-label={t('View {label}', { label })}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={label} className="w-full h-40 object-cover bg-slate-100" />
      </button>
      <div className="p-2.5 flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className={`text-sm font-bold flex items-center gap-1 ${hasGeo(photo) ? 'text-emerald-700' : 'text-red-700'}`}>
            {hasGeo(photo) ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
            {label}
          </span>
          <span className={`block text-xs ${hasGeo(photo) ? 'text-slate-500' : 'text-red-700 font-semibold'}`}>
            {photo.geo ? formatGeo(photo.geo) : hasGeo(photo) ? '' : t('No location — remove and take again')}
          </span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
          {t('Remove')}
        </button>
      </div>
    </div>
  );
};

/* ---------- Layout pieces ---------- */

const Section: React.FC<{ num: number; title: string; done: boolean; hint?: string; children: React.ReactNode }> = ({
  num,
  title,
  done,
  hint,
  children,
}) => {
  const { t } = useLang();
  return (
    <section className={`bg-white rounded-2xl border-2 p-4 sm:p-6 space-y-4 ${done ? 'border-emerald-200' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-base font-bold ${
              done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {done ? '✓' : num}
          </span>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {hint && <p className="text-sm text-slate-600 mt-0.5">{hint}</p>}
          </div>
        </div>
        <span className={`text-sm font-bold whitespace-nowrap ${done ? 'text-emerald-700' : 'text-slate-400'}`}>
          {done ? t('✓ Done') : t('To do')}
        </span>
      </div>
      {children}
    </section>
  );
};

/** Big radio-style choice buttons */
const ChoiceGrid = <V extends string>({
  options,
  value,
  onChange,
  disabled,
  cols = 'grid-cols-2 lg:grid-cols-4',
}: {
  options: { value: V; label: string; hint?: string }[];
  value?: V;
  onChange: (v: V) => void;
  disabled?: boolean;
  cols?: string;
}) => {
  const { t } = useLang();
  return (
    <div className={`grid gap-2 ${cols}`} role="radiogroup">
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`text-left px-4 py-3.5 rounded-xl border-2 transition-colors disabled:cursor-not-allowed ${
              selected ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
            }`}
          >
            <div className="text-base font-bold">{t(o.label)}</div>
            {o.hint && <div className={`text-sm mt-0.5 ${selected ? 'text-white/90' : 'text-slate-500'}`}>{t(o.hint)}</div>}
          </button>
        );
      })}
    </div>
  );
};

/* ---------- Screen ---------- */

export const SurveyView: React.FC<{ onGoToInstallation: () => void }> = ({ onGoToInstallation }) => {
  const { t } = useLang();
  const { consumers, currentUser, surveys, installations, updateSurveyDraft, submitSurvey, storageFull } = useApp();
  const [openNum, setOpenNum] = useState<string | null>(null);
  const [preview, setPreview] = useState<LabelledPhoto | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState<{ message: string; feasible: boolean } | null>(null);
  const [listMsg, setListMsg] = useState<string | null>(null);

  // Esc closes the photo preview
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPreview(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  // Installers see only their own homes; office staff see everyone
  const mine = consumers.filter((c) => currentUser.role !== 'Installer' || c.assignedInstallerId === currentUser.id);
  const toSurvey = mine.filter((c) => needsSurvey(c, surveys, installations));
  const sent = mine
    .map((c) => ({ c, s: surveyFor(surveys, c.consumerNumber) }))
    .filter((x): x is { c: Consumer; s: SiteSurvey } => x.s?.status === 'Submitted');

  const open = (num: string | null) => {
    setOpenNum(num);
    setListMsg(null);
    setSendError(null);
    setJustSent(null);
    window.scrollTo({ top: 0 });
  };

  const storageWarning = storageFull && (
    <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-900 text-base flex items-start gap-3" role="alert">
      <AlertTriangle className="w-6 h-6 flex-shrink-0" />
      <div>
        <div className="font-bold">{t('Phone storage is full')}</div>
        <div className="text-sm mt-0.5">
          {t('Your latest work may not be kept if you close or refresh this page. Send finished surveys now, or remove some photos.')}
        </div>
      </div>
    </div>
  );

  const lightbox = preview && (
    <div
      className="fixed inset-0 bg-black/90 z-[60] flex flex-col p-4 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={t(preview.label, { n: preview.n })}
    >
      <div className="flex justify-between items-center mb-2">
        <div>
          <h4 className="text-base font-bold">{t(preview.label, { n: preview.n })}</h4>
          <p className="text-sm text-slate-300">{t('Taken at {time}', { time: preview.photo.capturedAt })}</p>
              {preview.photo.geo ? (
                <a href={mapsLink(preview.photo.geo)} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-300 underline">
                  📍 {formatGeo(preview.photo.geo)} · {t('Open in map')}
                </a>
              ) : (
                <p className="text-sm text-amber-300">{t('No location saved with this photo')}</p>
              )}
              <div className="mt-1.5 max-w-xl">
                <PhotoVerification url={preview.photo.url} geo={preview.photo.geo} />
              </div>
        </div>
        <button
          onClick={() => setPreview(null)}
          aria-label={t('Close photo')}
          className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview.photo.url} alt={t(preview.label, { n: preview.n })} className="max-h-full max-w-full object-contain rounded-lg" />
      </div>
    </div>
  );

  /* ----- List of homes ----- */
  if (!openNum) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-brand-600" />
            {t('Site Survey')}
          </h1>
          <p className="text-base text-slate-600 mt-1">
            {t('Visit the home and check the roof before installing. Only homes you mark Feasible move on to installation.')}
          </p>
        </div>

        {storageWarning}

        {listMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-base font-semibold text-emerald-900 flex items-center gap-2" role="status">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {listMsg}
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">{t('Homes to survey ({n})', { n: toSurvey.length })}</h2>
          {toSurvey.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-base text-slate-600">
              {t('No homes are waiting for a survey. Ask the office if you expected one.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {toSurvey.map((c) => {
                const draft = surveyFor(surveys, c.consumerNumber);
                return (
                  <div key={c.id} className="bg-white rounded-2xl border-2 border-slate-200 p-4 space-y-3">
                    <div>
                      <div className="text-lg font-bold text-slate-900">{c.name}</div>
                      <div className="text-base text-slate-600">
                        {c.village}, {c.mandal}
                      </div>
                      <div className="text-sm text-slate-500 font-mono mt-0.5">{c.consumerNumber}</div>
                      {c.mobile && (
                        <a href={`tel:${c.mobile.replace(/\s/g, '')}`} className="text-base font-semibold text-brand-700 underline mt-1 inline-block">
                          {c.mobile}
                        </a>
                      )}
                    </div>
                    <ReopenedNotice survey={draft} />
                    {draft && (
                      <div className="text-sm font-semibold text-amber-800 bg-amber-50 rounded-lg px-3 py-1.5">
                        {t('Started — {n} things left', { n: surveyMissing(draft).length })}
                      </div>
                    )}
                    <button onClick={() => open(c.consumerNumber)} className={btnPrimary + ' w-full'}>
                      {draft ? t('Continue survey') : t('Start survey')}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {sent.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">{t('Surveys sent ({n})', { n: sent.length })}</h2>
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {sent.map(({ c, s }) => (
                <button
                  key={c.id}
                  onClick={() => open(c.consumerNumber)}
                  className="w-full text-left p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50"
                >
                  <div>
                    <div className="text-base font-bold text-slate-900">{c.name}</div>
                    <div className="text-sm text-slate-500">
                      {c.village} · {c.consumerNumber} · {s.submittedAt}
                    </div>
                  </div>
                  <DecisionBadge decision={s.decision} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ----- One home ----- */
  const consumer = consumers.find((c) => c.consumerNumber === openNum);
  const survey = surveyFor(surveys, openNum);
  const isSent = survey?.status === 'Submitted';
  const update = (change: (s: SiteSurvey) => SiteSurvey) => {
    setSendError(null);
    updateSurveyDraft(openNum, change);
  };

  const header = (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <button onClick={() => open(null)} className="text-base font-semibold text-brand-700 flex items-center gap-1.5">
        <ArrowLeft className="w-5 h-5" />
        {t('All surveys')}
      </button>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{consumer?.name}</h1>
          <p className="text-base text-slate-600">
            {consumer?.village}, {consumer?.mandal} · <span className="font-mono text-sm">{openNum}</span>
          </p>
        </div>
        {isSent && <DecisionBadge decision={survey?.decision} large />}
      </div>
    </div>
  );

  // Just sent: clear next step
  if (justSent) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
        <div
          className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
            justSent.feasible ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
          }`}
        >
          {justSent.feasible ? <CheckCircle2 className="w-9 h-9" /> : <XCircle className="w-9 h-9" />}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {justSent.feasible ? t('Feasible — ready to install') : t('Not feasible — no installation')}
          </h2>
          <p className="text-base text-slate-600 mt-2">{justSent.message}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {justSent.feasible && (
            <button onClick={onGoToInstallation} className={btnPrimary}>
              {t('Go to installation')}
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => open(null)} className={btnBack}>
            {t('Back to all surveys')}
          </button>
        </div>
      </div>
    );
  }

  // Already sent: read only
  if (isSent && survey) {
    return (
      <div className="space-y-6">
        {header}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-3">
          <p className="text-sm text-slate-600">
            {isOfficeRole(currentUser.role)
              ? t('This survey has been sent. Office staff can reopen it if it needs to be done again.')
              : t('This survey has been sent and can no longer be changed.')}
          </p>
          <SurveySummary survey={survey} onOpenPhoto={setPreview} />
          <ReopenSurveyControl
            survey={survey}
            onReopened={(msg) => {
              open(null);
              setListMsg(msg);
            }}
          />
        </div>
        {lightbox}
      </div>
    );
  }

  const s: SiteSurvey = survey ?? {
    id: '',
    consumerNumber: openNum,
    surveyorId: currentUser.id,
    surveyorName: currentUser.name,
    status: 'Draft',
    startedAt: '',
    roofPhotos: [],
    shadeSources: [],
    surroundingsPhotos: [],
  };
  const missing = surveyMissing(s, t);
  const shadeDone = !!s.shadeLevel && (s.shadeLevel === 'None' || s.shadeSources.length > 0) && s.surroundingsPhotos.length > 0;
  const decisionDone = !!s.decision && (s.decision === 'Feasible' || !!s.decisionNote?.trim());

  const handleSend = () => {
    if (missing.length) return;
    const confirmText =
      s.decision === 'Feasible'
        ? t('Send this survey as FEASIBLE? The home will move on to installation. You cannot change it after sending.')
        : t('Send this survey as NOT FEASIBLE? This home will not be installed and the office will be told. You cannot change it after sending.');
    if (!window.confirm(confirmText)) return;
    const res = submitSurvey(openNum);
    if (!res.success) {
      setSendError(res.message);
      return;
    }
    setJustSent({ message: res.message, feasible: s.decision === 'Feasible' });
    window.scrollTo({ top: 0 });
  };

  const extraPhotos = (key: 'roofPhotos' | 'surroundingsPhotos', label: string) => {
    const list = s[key];
    return (
      <div className="space-y-3">
        {list.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {list.map((p, i) => (
              <PhotoTile
                key={p.id}
                photo={p}
                label={t(label, { n: i + 1 })}
                onOpen={() => setPreview({ photo: p, label, n: i + 1 })}
                onRemove={() => update((d) => ({ ...d, [key]: d[key].filter((x) => x.id !== p.id) }))}
              />
            ))}
          </div>
        )}
        {list.length < MAX_EXTRA_PHOTOS ? (
          <div className="max-w-md space-y-1">
            <div className="text-sm font-semibold text-slate-700">
              {list.length === 0
                ? t('Add at least 1 photo (up to {max}).', { max: MAX_EXTRA_PHOTOS })
                : t('{n} of {max} photos. Add more if it helps.', { n: list.length, max: MAX_EXTRA_PHOTOS })}
            </div>
            <PhotoPicker
              title={t(label, { n: list.length + 1 })}
              stampLabel={`${openNum} · ${noTranslate(label, { n: list.length + 1 })}`}
              onPicked={(photo) => update((d) => ({ ...d, [key]: [...d[key], photo].slice(0, MAX_EXTRA_PHOTOS) }))}
            />
          </div>
        ) : (
          <div className="text-sm text-slate-600">{t('{max} photos added. Remove one to add another.', { max: MAX_EXTRA_PHOTOS })}</div>
        )}
      </div>
    );
  };

  const singlePhoto = (key: 'billPhoto' | 'aadhaarPhoto', label: string) => {
    const p = s[key];
    return p ? (
      <div className="max-w-sm">
        <PhotoTile
          photo={p}
          label={t(label)}
          onOpen={() => setPreview({ photo: p, label })}
          onRemove={() => update((d) => ({ ...d, [key]: undefined }))}
        />
      </div>
    ) : (
      <div className="max-w-md">
        <PhotoPicker
          title={t(label)}
          stampLabel={`${openNum} · ${label}`}
          onPicked={(photo) => update((d) => ({ ...d, [key]: photo }))}
        />
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {header}
      <ReopenedNotice survey={survey} />
      {storageWarning}
      <p className="text-base text-slate-600 px-1">
        {s.decision === 'Feasible'
          ? t('Fill in all 6 parts. Your work is saved as you go.')
          : t('Fill in all 5 parts. Your work is saved as you go.')}
      </p>

      <Section num={1} title={t('Electricity bill')} done={!!s.billPhoto} hint={t('A clear photo of the latest bill. The consumer number must be readable.')}>
        {singlePhoto('billPhoto', 'Electricity bill')}
      </Section>

      <Section
        num={2}
        title={t('Aadhaar card')}
        done={!!s.aadhaarPhoto}
        hint={t('Photo of the front of the card. The consumer may cover the first 8 digits with a finger or paper.')}
      >
        {singlePhoto('aadhaarPhoto', 'Aadhaar card')}
      </Section>

      <Section num={3} title={t('Roof')} done={!!s.roofType && s.roofPhotos.length > 0} hint={t('What is the roof made of? Then take photos of the whole roof.')}>
        <ChoiceGrid options={ROOF_TYPES} value={s.roofType} onChange={(v) => update((d) => ({ ...d, roofType: v }))} />
        {(s.roofType === 'Mud' || s.roofType === 'Sheds') && (
          <div className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {t('Check carefully that this roof is strong enough to hold the panels and stand.')}
          </div>
        )}
        {extraPhotos('roofPhotos', 'Roof photo {n}')}
      </Section>

      <Section num={4} title={t('Shade and surroundings')} done={shadeDone} hint={t('Look around the roof. Will anything block the sunlight?')}>
        <ChoiceGrid
          options={SHADE_LEVELS}
          value={s.shadeLevel}
          cols="grid-cols-1 sm:grid-cols-3"
          onChange={(v) => update((d) => ({ ...d, shadeLevel: v, shadeSources: v === 'None' ? [] : d.shadeSources }))}
        />
        {s.shadeLevel && s.shadeLevel !== 'None' && (
          <fieldset className="space-y-2">
            <legend className="text-base font-bold text-slate-800 mb-2">{t('What is causing the shade? (tick all that apply)')}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SHADE_SOURCES.map((src) => {
                const on = s.shadeSources.includes(src);
                return (
                  <label
                    key={src}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer text-base font-semibold ${
                      on ? 'bg-brand-50 border-brand-500 text-brand-900' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        update((d) => ({
                          ...d,
                          shadeSources: on ? d.shadeSources.filter((x) => x !== src) : [...d.shadeSources, src],
                        }))
                      }
                      className="w-5 h-5 accent-brand-600"
                    />
                    {t(src)}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        <p className="text-sm text-slate-600">{t('Take photos from the roof showing trees, buildings or anything else nearby.')}</p>
        {extraPhotos('surroundingsPhotos', 'Surroundings photo {n}')}
      </Section>

      <Section num={5} title={t('Your decision')} done={decisionDone} hint={t('Can solar panels be installed at this home?')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
          {(
            [
              ['Feasible', 'Feasible', 'Installation can go ahead', CheckCircle2, 'bg-emerald-600 border-emerald-600'],
              ['Not Feasible', 'Not feasible', 'Do not install at this home', XCircle, 'bg-red-600 border-red-600'],
            ] as const
          ).map(([value, label, hint, Icon, onClass]) => {
            const selected = s.decision === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update((d) => ({ ...d, decision: value }))}
                className={`text-left px-5 py-4 rounded-xl border-2 flex items-center gap-3 ${
                  selected ? `${onClass} text-white` : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-8 h-8 flex-shrink-0" />
                <span>
                  <span className="block text-lg font-bold">{t(label)}</span>
                  <span className={`block text-sm ${selected ? 'text-white/90' : 'text-slate-500'}`}>{t(hint)}</span>
                </span>
              </button>
            );
          })}
        </div>
        {s.decision === 'Feasible' && s.shadeLevel === 'Heavy' && (
          <div className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {t('You said the roof gets a lot of shade. Are you sure it is feasible? Explain in the notes below.')}
          </div>
        )}
        {s.decision && (
          <label className="block space-y-1.5">
            <span className="text-base font-bold text-slate-800">
              {s.decision === 'Not Feasible' ? t('Why is it not feasible? (needed)') : t('Notes for the office (optional)')}
            </span>
            <textarea
              value={s.decisionNote || ''}
              onChange={(e) => update((d) => ({ ...d, decisionNote: e.target.value }))}
              rows={3}
              placeholder={s.decision === 'Not Feasible' ? t('e.g. Mud roof is too weak, big tree shades the roof all day') : ''}
              className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-base"
            />
          </label>
        )}
      </Section>

      {s.decision === 'Feasible' && (
        <Section
          num={6}
          title={t('Consumer consent form')}
          done={consentMissing(s.consent).length === 0}
          hint={t('The APSPDCL consent form. Fill in the details, then the consumer reads it and signs on this phone.')}
        >
          <ConsentSection
            consumer={consumer}
            consumerNumber={openNum}
            consent={s.consent}
            collectedBy={currentUser.name}
            onChange={(consent) => update((d) => ({ ...d, consent }))}
          />
        </Section>
      )}

      {/* Send */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-6 space-y-4">
        {missing.length > 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-base text-amber-900">
            <div className="font-bold mb-1">{t('Before you can send, please finish:')}</div>
            <ul className="list-disc pl-5 space-y-0.5">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-base font-semibold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {t('Everything is filled in. Check once and send.')}
          </div>
        )}
        {sendError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900" role="alert">
            {sendError}
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
          <button onClick={() => open(null)} className={btnBack}>
            <ArrowLeft className="w-5 h-5" />
            {t('Save and go back')}
          </button>
          <button
            onClick={handleSend}
            disabled={missing.length > 0}
            className={btnPrimary.replace('bg-brand-600 hover:bg-brand-700', 'bg-emerald-600 hover:bg-emerald-700')}
          >
            <Send className="w-5 h-5" />
            {t('Send survey')}
          </button>
        </div>
      </div>

      {lightbox}
    </div>
  );
};
