'use client';

import React, { useState } from 'react';
import { Crosshair, Loader2, MapPin, Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { useLang } from '@/i18n/LanguageContext';
import { useApp } from '@/context/AppContext';
import { User, Village } from '@/types';
import { villageLabel, villagesOf } from '@/lib/workArea';
import { DEFAULT_RADIUS_M, MAX_RADIUS_M, MIN_RADIUS_M } from '@/lib/fence';
import { InstallerVillagesPicker } from './InstallerVillagesPicker';

/**
 * Office: villages and who may work in them, on one screen (also shown on the dashboard).
 * 1. Who can work where: each installer and their villages, with one button to change them.
 * 2. Villages: each one's name and circle on the ground (centre point + distance). Added by the office only.
 */
export const VillagesAccessView: React.FC = () => {
  const { t } = useLang();
  const { users, villages, consumers } = useApp();
  const [pickFor, setPickFor] = useState<User | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  const installers = users.filter((u) => u.role === 'Installer' && u.status === 'Active');
  const sortedVillages = [...villages].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      {pickFor && <InstallerVillagesPicker installer={pickFor} onClose={() => setPickFor(null)} />}

      {/* Who can work where */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">{t('Who can work where')}</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {t('An installer can take survey and installation photos only when standing inside one of their villages.')}
          </p>
        </div>
        <ul className="divide-y divide-slate-100">
          {installers.length === 0 && <li className="p-5 text-base text-slate-600">{t('No installers yet.')}</li>}
          {installers.map((u) => {
            const mine = villagesOf(u, villages);
            const homes = consumers.filter((c) => c.assignedInstallerId === u.id && c.status !== 'Completed').length;
            return (
              <li key={u.id} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="sm:w-48 flex-shrink-0">
                  <div className="text-base font-bold text-slate-900">{u.name}</div>
                  <div className="text-sm text-slate-500">{t('{n} unfinished homes', { n: homes })}</div>
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5">
                  {mine.length ? (
                    mine.map((v) => (
                      <span key={v.id} className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-800 text-sm font-semibold">
                        {villageLabel(v)}
                      </span>
                    ))
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-800 text-sm font-bold">
                      {t('No villages: cannot take photos')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setPickFor(u)}
                  disabled={villages.length === 0}
                  title={villages.length === 0 ? t('Add a village first') : undefined}
                  className="px-4 py-2.5 rounded-xl border-2 border-brand-200 bg-brand-50 hover:bg-brand-100 disabled:opacity-50 text-brand-800 text-base font-bold flex items-center justify-center gap-2"
                >
                  <UserCog className="w-5 h-5" />
                  {t('Change villages')}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Villages */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t('Villages')}</h2>
            <p className="text-sm text-slate-600 mt-0.5">{t('Each village is a centre point and a distance around it.')}</p>
          </div>
          {editing !== 'new' && (
            <button
              onClick={() => setEditing('new')}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-bold flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {t('Add village')}
            </button>
          )}
        </div>
        {editing === 'new' && (
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <VillageForm onDone={() => setEditing(null)} />
          </div>
        )}
        <ul className="divide-y divide-slate-100">
          {villages.length === 0 && editing !== 'new' && (
            <li className="p-5 text-base text-slate-600">{t('No villages yet. Add the first one.')}</li>
          )}
          {sortedVillages.map((v) => {
            const who = installers.filter((u) => u.villageIds?.includes(v.id));
            return (
              <li key={v.id} className="p-4 sm:px-5 space-y-2">
                {editing === v.id ? (
                  <VillageForm village={v} onDone={() => setEditing(null)} />
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="text-base font-bold text-slate-900">
                        {v.name}
                        {(v.mandal || v.district) && (
                          <span className="font-normal text-slate-500"> · {[v.mandal && t('{name} mandal', { name: v.mandal }), v.district && t('{name} district', { name: v.district })].filter(Boolean).join(', ')}</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-brand-600 flex-shrink-0" />
                        <span className="font-mono">{v.latitude.toFixed(6)}, {v.longitude.toFixed(6)}</span>
                        <span>· {t('within {m} m', { m: v.radiusM })}</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        {who.length ? t('Allowed: {names}', { names: who.map((u) => u.name).join(', ') }) : t('No installer allowed yet')}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditing(v.id)}
                      className="px-4 py-2.5 rounded-xl border-2 border-slate-300 hover:bg-slate-50 text-base font-bold text-slate-700 flex items-center justify-center gap-2"
                    >
                      <Pencil className="w-5 h-5" />
                      {t('Change location')}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};

/** Add a village or change one. The centre can be typed, pasted as "lat, long", or taken from this device's GPS. */
const VillageForm: React.FC<{ village?: Village; onDone: () => void }> = ({ village, onDone }) => {
  const { t } = useLang();
  const { saveVillage, removeVillage, villages, users } = useApp();
  const [name, setName] = useState(village?.name ?? '');
  const [mandal, setMandal] = useState(village?.mandal ?? '');
  const [district, setDistrict] = useState(village?.district ?? '');
  const [lat, setLat] = useState(village ? String(village.latitude) : '');
  const [lng, setLng] = useState(village ? String(village.longitude) : '');
  const [radius, setRadius] = useState(String(village?.radiusM ?? DEFAULT_RADIUS_M));
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  // Pasting "16.2345, 80.4567" into the latitude box fills both
  const onLat = (v: string) => {
    const m = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(v);
    if (m) {
      setLat(m[1]);
      setLng(m[2]);
    } else setLat(v);
  };

  const useHere = () => {
    setError(null);
    if (!window.isSecureContext || !navigator.geolocation) {
      setError(t('This device or link cannot read the location. Open the app with its https link in Chrome.'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError(t('Could not find this device\'s location. Turn on location and try again, or type the numbers.'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const save = () => {
    const la = Number(lat);
    const lo = Number(lng);
    const ra = Math.round(Number(radius));
    if (!name.trim()) return setError(t('Enter the village name.'));
    const same = villages.find(
      (v) => v.id !== village?.id && v.name.trim().toLowerCase() === name.trim().toLowerCase() && (v.mandal ?? '').trim().toLowerCase() === mandal.trim().toLowerCase()
    );
    if (same) return setError(t('{name} is already in the list.', { name: villageLabel(same) }));
    if (!lat.trim() || !lng.trim() || !Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
      return setError(t('Enter the centre point as numbers, for example 16.306652 and 80.436539.'));
    }
    if (!Number.isFinite(ra) || ra < MIN_RADIUS_M || ra > MAX_RADIUS_M) {
      return setError(t('Distance must be between {min} and {max} metres.', { min: MIN_RADIUS_M, max: MAX_RADIUS_M }));
    }
    // Andhra Pradesh, roughly: outside this the numbers are probably swapped or mistyped
    const inState = la > 12.5 && la < 19.6 && lo > 76.6 && lo < 84.9;
    if (!inState && !window.confirm(t('This point is outside Andhra Pradesh. The numbers may be swapped or mistyped. Save anyway?'))) return;
    saveVillage({ id: village?.id, name, mandal, district, latitude: la, longitude: lo, radiusM: ra });
    onDone();
  };

  const remove = () => {
    if (!village) return;
    const who = users.filter((u) => u.villageIds?.includes(village.id)).map((u) => u.name);
    const msg = who.length
      ? t('Remove {name}? {names} will no longer be able to work there.', { name: village.name, names: who.join(', ') })
      : t('Remove {name}?', { name: village.name });
    if (!window.confirm(msg)) return;
    removeVillage(village.id);
    onDone();
  };

  const field = 'w-full text-base bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-900';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">{t('Village name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">{t('Mandal (optional)')}</span>
          <input value={mandal} onChange={(e) => setMandal(e.target.value)} className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">{t('District (optional)')}</span>
          <input value={district} onChange={(e) => setDistrict(e.target.value)} className={field} />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">{t('Centre: latitude')}</span>
          <input value={lat} onChange={(e) => onLat(e.target.value)} inputMode="decimal" placeholder="16.306652" className={field + ' font-mono'} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">{t('Centre: longitude')}</span>
          <input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" placeholder="80.436539" className={field + ' font-mono'} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">{t('Distance around it (metres)')}</span>
          <input value={radius} onChange={(e) => setRadius(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={field} />
        </label>
      </div>
      <button
        type="button"
        onClick={useHere}
        disabled={locating}
        className="px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-base font-semibold text-slate-700 flex items-center gap-2"
      >
        {locating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crosshair className="w-5 h-5" />}
        {t('Use where I am standing now')}
      </button>
      <p className="text-sm text-slate-500">{t('Choose a distance that covers the whole village: 1000 to 3000 m is usual.')}</p>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-800 bg-red-50 border border-red-200 rounded-lg p-2.5">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={save} className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-bold">
          {village ? t('Save changes') : t('Add village')}
        </button>
        <button onClick={onDone} className="px-5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-base font-bold text-slate-700">
          {t('Cancel')}
        </button>
        {village && (
          <button onClick={remove} className="ml-auto px-4 py-2.5 rounded-xl text-red-700 hover:bg-red-50 text-base font-bold flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            {t('Remove village')}
          </button>
        )}
      </div>
    </div>
  );
};
