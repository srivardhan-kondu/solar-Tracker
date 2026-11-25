'use client';

import React, { useEffect, useState } from 'react';
import { CheckSquare, Search, Square, X } from 'lucide-react';
import { useLang } from '@/i18n/LanguageContext';
import { useApp } from '@/context/AppContext';
import { User } from '@/types';
import { villageLabel } from '@/lib/workArea';

/**
 * Office: tick the villages an installer may work in. Saving replaces their previous villages,
 * so moving someone from Village 1 to Village 2 is: untick 1, tick 2, Save.
 */
export const InstallerVillagesPicker: React.FC<{ installer: User; onClose: () => void }> = ({ installer, onClose }) => {
  const { t } = useLang();
  const { villages, setInstallerVillages } = useApp();
  const [picked, setPicked] = useState<Set<string>>(() => new Set(installer.villageIds ?? []));
  const [q, setQ] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sorted = [...villages].sort((a, b) => a.name.localeCompare(b.name));
  const query = q.trim().toLowerCase();
  const shown = query
    ? sorted.filter((v) => [v.name, v.mandal, v.district].some((x) => x?.toLowerCase().includes(query)))
    : sorted;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = () => {
    setInstallerVillages(installer.id, Array.from(picked));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('Villages for {name}', { name: installer.name })}
    >
      <div className="bg-white w-full sm:max-w-lg max-h-[92vh] rounded-t-2xl sm:rounded-2xl flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('Villages for {name}', { name: installer.name })}</h2>
            <p className="text-sm text-slate-600">{t('{name} can work only inside the villages ticked here.', { name: installer.name })}</p>
          </div>
          <button onClick={onClose} aria-label={t('Close')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {villages.length > 8 && (
          <div className="px-4 pt-3">
            <label className="relative block">
              <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('Find a village')}
                aria-label={t('Find a village')}
                className="w-full pl-10 pr-3 py-2.5 text-base bg-slate-50 border-2 border-slate-300 rounded-xl"
              />
            </label>
          </div>
        )}

        <ul className="flex-1 overflow-y-auto p-2">
          {villages.length === 0 && (
            <li className="p-4 text-base text-slate-600">{t('No villages yet. Add a village first.')}</li>
          )}
          {shown.map((v) => {
            const on = picked.has(v.id);
            return (
              <li key={v.id}>
                <button
                  onClick={() => toggle(v.id)}
                  aria-pressed={on}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left ${on ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                >
                  {on ? <CheckSquare className="w-7 h-7 text-brand-600 flex-shrink-0" /> : <Square className="w-7 h-7 text-slate-400 flex-shrink-0" />}
                  <span className="min-w-0">
                    <span className="block text-base font-bold text-slate-900">{villageLabel(v)}</span>
                    {v.district && <span className="block text-sm text-slate-500">{t('{name} district', { name: v.district })}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <p className={`text-sm font-semibold ${picked.size ? 'text-slate-700' : 'text-red-700'}`}>
            {picked.size
              ? t('{n} village(s) ticked.', { n: picked.size })
              : t('Nothing ticked: {name} will not be able to take any photos.', { name: installer.name })}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-slate-300 text-base font-bold text-slate-700">
              {t('Cancel')}
            </button>
            <button onClick={save} className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-bold">
              {t('Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
