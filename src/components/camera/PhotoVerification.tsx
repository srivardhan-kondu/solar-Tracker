'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { useLang } from '@/i18n/LanguageContext';
import { distanceMetres, mapsLink } from '@/lib/geoPhoto';
import { GeoTag } from '@/types';

type Result =
  | { status: 'unknown' }
  | {
      status: 'verified' | 'changed';
      latitude: number;
      longitude: number;
      accuracy: number;
      takenAt: number;
      receivedAt: number;
      clockChecked: boolean;
      flags: ('late_upload' | 'clock_not_checked' | 'used_elsewhere')[];
    };

const ist = (ms: number) =>
  new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' }) + ' IST';

/**
 * For the office: is this photo exactly as the installer's camera took it?
 * The location and times shown come from the server's own signed record, not from the phone.
 */
export const PhotoVerification: React.FC<{ url: string; geo?: GeoTag }> = ({ url, geo }) => {
  const { t } = useLang();
  const [res, setRes] = useState<Result | 'loading' | 'error'>('loading');
  const key = url.startsWith('/api/files/') ? url.slice('/api/files/'.length) : null;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setRes('loading');
    fetch(`/api/photos/verify?key=${encodeURIComponent(key)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: Result) => !cancelled && setRes(j))
      .catch(() => !cancelled && setRes('error'));
    return () => {
      cancelled = true;
    };
  }, [key]);

  const box = (tone: 'green' | 'red' | 'amber' | 'grey', children: React.ReactNode) => (
    <div
      className={`rounded-lg px-3 py-2 text-xs space-y-0.5 ${
        tone === 'green'
          ? 'bg-emerald-900/60 text-emerald-100'
          : tone === 'red'
          ? 'bg-red-900/70 text-red-100'
          : tone === 'amber'
          ? 'bg-amber-900/60 text-amber-100'
          : 'bg-white/10 text-slate-200'
      }`}
      role="status"
    >
      {children}
    </div>
  );

  if (url.startsWith('/samples/')) return box('grey', t('Sample picture from the demo data — not a real photo.'));
  if (url.startsWith('data:')) return box('amber', t('Not sent to the server yet, so it cannot be checked. It will be sent when the phone is online.'));
  if (!key) return box('amber', t('This photo cannot be checked.'));
  if (res === 'loading')
    return box(
      'grey',
      <span className="flex items-center gap-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {t('Checking photo…')}
      </span>
    );
  if (res === 'error') return box('amber', t('Could not check this photo right now. Try again later.'));
  if (res.status === 'unknown') return box('amber', t('No server record for this photo, so it cannot be verified.'));

  // The phone's copy of the location must match the server's record
  const geoMismatch = !!geo && distanceMetres(geo, res) > 1;
  const changed = res.status === 'changed' || geoMismatch;

  return box(
    changed ? 'red' : res.flags.length ? 'amber' : 'green',
    <>
      <div className="font-bold text-sm flex items-center gap-1.5">
        {changed ? <ShieldX className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
        {changed ? t('Warning: this photo or its details were changed after it was taken') : t('Original photo — not changed since it was taken')}
      </div>
      <div>
        {t('Location (server record)')}:{' '}
        <a href={mapsLink({ ...res, capturedAt: '' })} target="_blank" rel="noopener noreferrer" className="underline">
          {res.latitude.toFixed(6)}, {res.longitude.toFixed(6)} (±{Math.round(res.accuracy)} m)
        </a>
      </div>
      <div>
        {t('Taken')}: {ist(res.takenAt)} · {t('Received by server')}: {ist(res.receivedAt)}
      </div>
      {res.flags.map((f) => (
        <div key={f} className="flex items-start gap-1.5 font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {f === 'late_upload'
            ? t('Sent more than a day after it was taken.')
            : f === 'clock_not_checked'
            ? t('Taken offline, so the time is from the phone clock and could be wrong.')
            : t('The same photo was also sent for another home.')}
        </div>
      ))}
    </>
  );
};
