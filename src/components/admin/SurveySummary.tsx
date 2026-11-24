'use client';

import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { useLang } from '@/i18n/LanguageContext';
import { useApp } from '@/context/AppContext';
import { isOfficeRole } from '@/lib/access';
import { SiteSurvey, SurveyPhoto } from '@/types';
import { ROOF_TYPES, SHADE_LEVELS, reopenBlocker } from '@/lib/survey';

export interface LabelledPhoto {
  photo: SurveyPhoto;
  label: string; // English text, translated when shown; may contain {n}
  n?: number;
}

/** Every survey photo with a plain label, in the order they were asked for */
export const surveyPhotoList = (s: SiteSurvey): LabelledPhoto[] => [
  ...(s.billPhoto ? [{ photo: s.billPhoto, label: 'Electricity bill' }] : []),
  ...(s.aadhaarPhoto ? [{ photo: s.aadhaarPhoto, label: 'Aadhaar card' }] : []),
  ...s.roofPhotos.map((photo, i) => ({ photo, label: 'Roof photo {n}', n: i + 1 })),
  ...s.surroundingsPhotos.map((photo, i) => ({ photo, label: 'Surroundings photo {n}', n: i + 1 })),
];

export const DecisionBadge: React.FC<{ decision?: SiteSurvey['decision']; large?: boolean }> = ({ decision, large }) => {
  const { t } = useLang();
  if (!decision) return null;
  const ok = decision === 'Feasible';
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full ${large ? 'text-base px-4 py-1.5' : 'text-sm px-3 py-1'} ${
        ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
      }`}
    >
      {ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {ok ? t('Feasible') : t('Not feasible')}
    </span>
  );
};

/** Read-only view of a sent survey */
export const SurveySummary: React.FC<{
  survey: SiteSurvey;
  onOpenPhoto: (p: LabelledPhoto) => void;
}> = ({ survey, onOpenPhoto }) => {
  const { t } = useLang();
  const roof = ROOF_TYPES.find((r) => r.value === survey.roofType)?.label;
  const shade = SHADE_LEVELS.find((s) => s.value === survey.shadeLevel)?.label;
  const rows: [string, string][] = [
    ['Decision', ''],
    ['Type of roof', roof ? t(roof) : '—'],
    ['Shade on the roof', shade ? t(shade) : '—'],
    ...(survey.shadeSources.length
      ? ([['Shade caused by', survey.shadeSources.map((x) => t(x)).join(', ')]] as [string, string][])
      : []),
    ...(survey.decisionNote?.trim() ? ([['Installer notes', survey.decisionNote.trim()]] as [string, string][]) : []),
    ['Surveyed by', survey.surveyorName],
    ['Sent on', survey.submittedAt || '—'],
  ];

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between items-start gap-4 py-2 border-b border-slate-200 last:border-0">
            <span className="text-slate-500">{t(label)}</span>
            {label === 'Decision' ? (
              <DecisionBadge decision={survey.decision} />
            ) : (
              <span className="font-semibold text-slate-900 text-right">{value}</span>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {surveyPhotoList(survey).map((item) => (
          <button
            key={item.photo.id}
            onClick={() => onOpenPhoto(item)}
            className="text-left rounded-xl border border-slate-200 overflow-hidden bg-white hover:border-brand-400"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.photo.url} alt={t(item.label, { n: item.n })} className="w-full h-28 object-cover bg-slate-100" />
            <div className="px-2.5 py-2 text-sm font-semibold text-slate-800">{t(item.label, { n: item.n })}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Office staff only: send a sent survey back to the installer to be done again.
 * Shows nothing to installers.
 */
export const ReopenSurveyControl: React.FC<{ survey: SiteSurvey; onReopened?: (message: string) => void }> = ({
  survey,
  onReopened,
}) => {
  const { t } = useLang();
  const { currentUser, consumers, installations, reopenSurvey } = useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOfficeRole(currentUser.role) || survey.status !== 'Submitted') return null;
  const consumer = consumers.find((c) => c.consumerNumber === survey.consumerNumber);
  const blocker = reopenBlocker(survey, consumer, installations, t);

  if (blocker) return <p className="text-sm text-slate-500">{blocker}</p>;

  if (!open)
    return (
      <button
        onClick={() => {
          setReason('');
          setError(null);
          setOpen(true);
        }}
        className="px-5 py-2.5 bg-white border-2 border-amber-400 text-amber-800 hover:bg-amber-50 rounded-xl text-sm font-bold flex items-center gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        {t('Reopen survey')}
      </button>
    );

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
      <p className="text-sm text-amber-900">
        {t('The survey goes back to the installer. Their photos are kept, but they must choose Feasible or Not feasible again. Until then, this home cannot be installed.')}
      </p>
      <label className="block space-y-1.5">
        <span className="text-sm font-bold text-slate-800">{t('Why are you reopening it? (required — the installer will see this)')}</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
          rows={3}
          placeholder={t('e.g. Consumer says the tree has been cut, please check again')}
          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm"
        />
      </label>
      {error && (
        <div className="text-sm text-red-800" role="alert">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setOpen(false)} className="px-4 py-2 border border-slate-300 bg-white rounded-lg text-sm font-semibold text-slate-700">
          {t('Cancel')}
        </button>
        <button
          disabled={!reason.trim()}
          onClick={() => {
            const res = reopenSurvey(survey.consumerNumber, reason);
            if (!res.success) return setError(res.message);
            setOpen(false);
            onReopened?.(res.message);
          }}
          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
        >
          {t('Yes, reopen')}
        </button>
      </div>
    </div>
  );
};

/** Shown to the installer when the office has reopened their survey */
export const ReopenedNotice: React.FC<{ survey?: SiteSurvey }> = ({ survey }) => {
  const { t } = useLang();
  if (!survey?.reopenNote || survey.status !== 'Draft') return null;
  return (
    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-900 flex items-start gap-2" role="status">
      <RotateCcw className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div>
        <div className="font-bold">{t('Reopened by {who} on {when}', { who: survey.reopenedBy, when: survey.reopenedAt })}</div>
        <div>&ldquo;{survey.reopenNote}&rdquo;</div>
      </div>
    </div>
  );
};
