'use client';

import React, { useState } from 'react';
import { useLang } from '@/i18n/LanguageContext';
import { KeyRound, MapPin, Plus, Power, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ROLE_LABEL } from '@/lib/access';
import { APP_NAME } from '@/lib/company';
import { User, UserRole } from '@/types';
import { villageLabel, villagesOf } from '@/lib/workArea';


export const UserManagementView: React.FC = () => {
  const { t } = useLang();
  const { users, currentUser, villages, setUserStatus } = useApp();
  const [adding, setAdding] = useState(false);
  const headOffice = currentUser.role === 'Super Admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t("Users")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("Everyone who uses {app}, and what kind of work they do.", { app: APP_NAME })}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-semibold text-slate-600">{t("Signed in as:")}{" "}<span className="font-bold text-slate-900">{currentUser.name} ({t(ROLE_LABEL[currentUser.role])})</span>
          </div>
          {headOffice && !adding && (
            <button onClick={() => setAdding(true)} className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-bold flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {t('Add person')}
            </button>
          )}
        </div>
      </div>

      {adding && <AddPersonForm onDone={() => setAdding(false)} />}

      {/* People, as cards on every screen size */}
      <ul className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {users.map((u) => (
          <li key={u.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-4">
              {u.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.avatar} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <span aria-hidden className="w-14 h-14 rounded-xl bg-brand-100 text-brand-800 text-xl font-bold flex items-center justify-center flex-shrink-0">
                  {u.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold text-slate-900">{u.name}</div>
                <div className="text-sm text-slate-600">{t(ROLE_LABEL[u.role])}</div>
              </div>
              <span
                className={`px-3 py-1 rounded-full font-bold text-sm ${
                  u.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {u.status === 'Active' ? t('Active') : t('Switched off')}
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
            {u.status === 'Active' && <SetPin user={u} />}
            {headOffice && u.id !== currentUser.id && (
              <button
                onClick={() => {
                  const off = u.status === 'Active';
                  if (off && !window.confirm(t('Switch off {name}? They will not be able to sign in. Their past work is kept.', { name: u.name }))) return;
                  setUserStatus(u.id, off ? 'Inactive' : 'Active');
                }}
                className={`px-4 py-2 rounded-xl border-2 text-base font-bold flex items-center gap-2 ${
                  u.status === 'Active' ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                <Power className="w-5 h-5" />
                {u.status === 'Active' ? t('Switch off') : t('Switch on')}
              </button>
            )}
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

const ROLES: UserRole[] = ['Installer', 'Admin', 'Service Engineer', 'Super Admin'];

/** Head office: add a person. They then need a PIN (Set PIN) and, for installers, villages. */
const AddPersonForm: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { t } = useLang();
  const { addUser } = useApp();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<UserRole>('Installer');
  const [division, setDivision] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const problem = addUser({ name, username, mobile, role, division });
    if (problem) setError(problem);
    else onDone();
  };

  const field = 'w-full text-base bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-900';
  return (
    <div className="bg-white rounded-2xl border-2 border-brand-200 shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t('Add person')}</h2>
          <p className="text-sm text-slate-600">{t('After adding, press Set PIN on their card. For installers, also give them villages on Villages & Access.')}</p>
        </div>
        <button onClick={onDone} aria-label={t('Close')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">{t('Full name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">{t('Username (for signing in)')}</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
            autoCapitalize="none"
            spellCheck={false}
            placeholder="ravi.k"
            className={field + ' font-mono'}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">{t('Mobile')}</span>
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">{t('Kind of work')}</span>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={field}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(ROLE_LABEL[r])}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-semibold text-slate-700">{t('Division')}</span>
          <input value={division} onChange={(e) => setDivision(e.target.value)} className={field} />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-800 bg-red-50 border border-red-200 rounded-lg p-2.5">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button onClick={save} className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-bold">
          {t('Add person')}
        </button>
        <button onClick={onDone} className="px-5 py-2.5 rounded-xl border-2 border-slate-300 text-base font-bold text-slate-700">
          {t('Cancel')}
        </button>
      </div>
    </div>
  );
};
