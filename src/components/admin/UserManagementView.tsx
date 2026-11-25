'use client';

import React, { useState } from 'react';
import { useLang } from '@/i18n/LanguageContext';
import { KeyRound, MapPin } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ROLE_LABEL } from '@/lib/access';
import { User } from '@/types';
import { villageLabel, villagesOf } from '@/lib/workArea';


export const UserManagementView: React.FC = () => {
  const { t } = useLang();
  const { users, currentUser, villages } = useApp();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t("Users")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("Everyone who uses Solar Tracker, and what kind of work they do.")}</p>
        </div>

        <div className="text-sm font-semibold text-slate-600">{t("Signed in as:")}{" "}<span className="font-bold text-slate-900">{currentUser.name} ({t(ROLE_LABEL[currentUser.role])})</span>
        </div>
      </div>

      {/* People, as cards on every screen size */}
      <ul className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {users.map((u) => (
          <li key={u.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.avatar} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold text-slate-900">{u.name}</div>
                <div className="text-sm text-slate-600">{t(ROLE_LABEL[u.role])}</div>
              </div>
              <span
                className={`px-3 py-1 rounded-full font-bold text-sm ${
                  u.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {u.status}
              </span>
            </div>
            <dl className="grid grid-cols-1 gap-1 text-sm">
              <div><dt className="inline text-slate-500">{t("Division:")}{" "}</dt><dd className="inline text-slate-900">{u.division}</dd></div>
              <div><dt className="inline text-slate-500">{t("Mobile:")}{" "}</dt><dd className="inline text-slate-900">{u.mobile}</dd></div>
              <div><dt className="inline text-slate-500">{t("Username:")}{" "}</dt><dd className="inline font-mono text-slate-900">{u.username}</dd></div>
              <div><dt className="inline text-slate-500">{t("Last active:")}{" "}</dt><dd className="inline text-slate-900">{u.lastLogin}</dd></div>
              {u.role === 'Installer' && (
                <div className="flex gap-1.5">
                  <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${villagesOf(u, villages).length ? 'text-brand-600' : 'text-red-600'}`} />
                  <span>
                    <span className="text-slate-500">{t('Villages:')}</span>{' '}
                    {villagesOf(u, villages).length ? (
                      <span className="text-slate-900">{villagesOf(u, villages).map(villageLabel).join(', ')}</span>
                    ) : (
                      <span className="font-semibold text-red-700">{t('No villages: cannot take photos')}</span>
                    )}
                  </span>
                </div>
              )}
            </dl>
            <SetPin user={u} />
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Give someone a new sign-in PIN. They use it with their username on the sign-in screen. */
const SetPin: React.FC<{ user: User }> = ({ user }) => {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    if (!/^\d{4,8}$/.test(pin)) {
      setMsg({ ok: false, text: t('PIN must be 4 to 8 digits') });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, pin }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setMsg({ ok: true, text: t('PIN set. Tell {name} their new PIN in person or by phone.', { name: user.name }) });
        setPin('');
        setOpen(false);
      } else setMsg({ ok: false, text: t(body.error || 'Could not set the PIN') });
    } catch {
      setMsg({ ok: false, text: t('Cannot reach the server. Connect to the internet and try again.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 pt-1">
      {open ? (
        <div className="flex flex-wrap gap-2">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            inputMode="numeric"
            autoComplete="off"
            placeholder={t('New PIN (4 to 8 digits)')}
            aria-label={t('New PIN for {name}', { name: user.name })}
            className="flex-1 min-w-[10rem] text-base bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-mono tracking-widest"
          />
          <button onClick={save} disabled={busy} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-base font-bold disabled:opacity-60">
            {t('Save PIN')}
          </button>
          <button onClick={() => { setOpen(false); setPin(''); setMsg(null); }} className="px-4 py-2 rounded-xl border-2 border-slate-300 text-base font-bold text-slate-700">
            {t('Cancel')}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-xl border-2 border-slate-300 hover:bg-slate-50 text-base font-bold text-slate-700 flex items-center gap-2"
        >
          <KeyRound className="w-5 h-5" />
          {t('Set PIN')}
        </button>
      )}
      {msg && (
        <p role="status" className={`text-sm font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
};
