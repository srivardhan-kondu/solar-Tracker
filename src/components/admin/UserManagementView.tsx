'use client';

import React, { useState } from 'react';
import { useLang } from '@/i18n/LanguageContext';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, MapPin, Power, UserPlus, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ROLE_LABEL } from '@/lib/access';
import { APP_NAME } from '@/lib/company';
import { User } from '@/types';
import { villageLabel, villagesOf } from '@/lib/workArea';
import { checkNewPerson, NewPerson, rolesYouCanAdd } from '@/lib/onboarding';

export const UserManagementView: React.FC = () => {
  const { t } = useLang();
  const { users, currentUser, villages, setUserStatus } = useApp();
  const [onboarding, setOnboarding] = useState(false);
  const [justAdded, setJustAdded] = useState<User | null>(null);
  const headOffice = currentUser.role === 'Super Admin';
  const canAdd = rolesYouCanAdd(currentUser.role);
  // Office staff manage field staff; head office manages everyone
  const canManage = (u: User) => headOffice || (currentUser.role === 'Admin' && canAdd.includes(u.role));

  const people = [...users].sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'Active' ? -1 : 1));

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('Users')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('Everyone who uses {app}, and what kind of work they do.', { app: APP_NAME })}</p>
        </div>
        {canAdd.length > 0 && !onboarding && (
          <button
            onClick={() => {
              setJustAdded(null);
              setOnboarding(true);
            }}
            className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-bold flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            {t('Onboard an employee')}
          </button>
        )}
      </div>

      {justAdded && (
        <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-base text-emerald-950 space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            {t('{name} is onboarded.', { name: justAdded.name })}
          </div>
          <p>
            {t('They can sign in now with username {username} and the PIN you set. Tell them the PIN in person or by phone.', {
              username: justAdded.username,
            })}
          </p>
          {justAdded.role === 'Installer' && (
            <p className="font-semibold">{t('Next: give them villages on Villages & Access, or they cannot take photos.')}</p>
          )}
        </div>
      )}

      {onboarding && (
        <OnboardForm
          onCancel={() => setOnboarding(false)}
          onDone={(u) => {
            setOnboarding(false);
            setJustAdded(u);
          }}
        />
      )}

      <ul className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {people.map((u) => (
          <li key={u.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3 ${u.status !== 'Active' ? 'opacity-70' : ''}`}>
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
              <span className={`px-3 py-1 rounded-full font-bold text-sm ${u.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                {u.status === 'Active' ? t('Active') : t('Switched off')}
              </span>
            </div>
            <dl className="grid grid-cols-1 gap-1 text-sm">
              <Row label={t('Username:')} value={<span className="font-mono">{u.username}</span>} />
              {u.employeeId && <Row label={t('Employee ID:')} value={u.employeeId} />}
              <Row label={t('Mobile:')} value={u.mobile || '—'} />
              {u.division && <Row label={t('Division:')} value={u.division} />}
              {u.address && <Row label={t('Address:')} value={u.address} />}
              {u.joiningDate && <Row label={t('Joined:')} value={new Date(u.joiningDate + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'medium' })} />}
              {u.emergencyContactName || u.emergencyContactPhone ? (
                <Row label={t('Emergency contact:')} value={[u.emergencyContactName, u.emergencyContactPhone].filter(Boolean).join(', ')} />
              ) : null}
              <Row label={t('Last active:')} value={u.lastLogin || t('Not signed in yet')} />
              {u.onboardedBy && <Row label={t('Onboarded by:')} value={`${u.onboardedBy}, ${u.onboardedAt}`} />}
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
            {u.status === 'Active' && canManage(u) && <SetPin user={u} />}
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

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <dt className="inline text-slate-500">{label} </dt>
    <dd className="inline text-slate-900">{value}</dd>
  </div>
);

const EMPTY: NewPerson = {
  name: '',
  username: '',
  pin: '',
  mobile: '',
  role: 'Installer',
  division: '',
  address: '',
  joiningDate: new Date().toLocaleDateString('en-CA'),
  employeeId: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
};

/** Onboard an employee: details and sign-in PIN in one form, saved on the server together */
const OnboardForm: React.FC<{ onCancel: () => void; onDone: (u: User) => void }> = ({ onCancel, onDone }) => {
  const { t } = useLang();
  const { users, currentUser, onboardUser } = useApp();
  const [p, setP] = useState<NewPerson>(EMPTY);
  const [pin2, setPin2] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [problems, setProblems] = useState<Partial<Record<keyof NewPerson | 'pin2', string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const roles = rolesYouCanAdd(currentUser.role);

  const set = <K extends keyof NewPerson>(k: K, v: NewPerson[K]) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setProblems((prev) => ({ ...prev, [k]: undefined }));
  };

  const save = async () => {
    setError(null);
    const { problems: found } = checkNewPerson(p, users.map((u) => u.username));
    const all: typeof problems = { ...found };
    if (p.pin && pin2 !== p.pin) all.pin2 = 'The two PINs are not the same.';
    if (Object.keys(all).length) {
      setProblems(all);
      return;
    }
    setBusy(true);
    const result = await onboardUser(p);
    setBusy(false);
    if ('user' in result) onDone(result.user);
    else if ('problems' in result) setProblems(result.problems);
    else setError(result.error);
  };

  const field = (bad?: string) =>
    `w-full text-base bg-white border-2 rounded-xl px-3 py-2.5 text-slate-900 ${bad ? 'border-red-400' : 'border-slate-300 focus:border-brand-600'}`;
  const Problem = ({ k }: { k: keyof NewPerson | 'pin2' }) =>
    problems[k] ? <span className="block text-sm font-semibold text-red-700">{t(problems[k]!)}</span> : null;
  const Label = ({ text, required }: { text: string; required?: boolean }) => (
    <span className="text-sm font-semibold text-slate-700">
      {t(text)}
      {required && <span className="text-red-600"> *</span>}
    </span>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="bg-white rounded-2xl border-2 border-brand-200 shadow-sm p-5 space-y-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t('Onboard an employee')}</h2>
          <p className="text-sm text-slate-600">{t('Fields marked * are needed. The person can sign in as soon as you save.')}</p>
        </div>
        <button type="button" onClick={onCancel} aria-label={t('Close')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-base font-bold text-slate-900">{t('Personal details')}</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <Label text="Full name" required />
            <input value={p.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" className={field(problems.name)} />
            <Problem k="name" />
          </label>
          <label className="space-y-1">
            <Label text="Mobile" required />
            <input value={p.mobile} onChange={(e) => set('mobile', e.target.value)} inputMode="tel" placeholder="98765 43210" className={field(problems.mobile)} />
            <Problem k="mobile" />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <Label text="Address" required />
            <textarea value={p.address} onChange={(e) => set('address', e.target.value)} rows={2} className={field(problems.address)} />
            <Problem k="address" />
          </label>
          <label className="space-y-1">
            <Label text="Emergency contact name" />
            <input value={p.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} className={field()} />
          </label>
          <label className="space-y-1">
            <Label text="Emergency contact mobile" />
            <input value={p.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} inputMode="tel" className={field(problems.emergencyContactPhone)} />
            <Problem k="emergencyContactPhone" />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-base font-bold text-slate-900">{t('Work details')}</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <Label text="Kind of work" required />
            <select value={p.role} onChange={(e) => set('role', e.target.value as NewPerson['role'])} className={field(problems.role)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {t(ROLE_LABEL[r])}
                </option>
              ))}
            </select>
            <Problem k="role" />
          </label>
          <label className="space-y-1">
            <Label text="Employee ID" />
            <input value={p.employeeId} onChange={(e) => set('employeeId', e.target.value)} className={field()} />
          </label>
          <label className="space-y-1">
            <Label text="Division" />
            <input value={p.division} onChange={(e) => set('division', e.target.value)} className={field()} />
          </label>
          <label className="space-y-1">
            <Label text="Joining date" />
            <input type="date" value={p.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} className={field(problems.joiningDate)} />
            <Problem k="joiningDate" />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-base font-bold text-slate-900">{t('Sign-in details')}</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="space-y-1">
            <Label text="Username" required />
            <input
              value={p.username}
              onChange={(e) => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              placeholder="ravi.k"
              className={field(problems.username) + ' font-mono'}
            />
            <Problem k="username" />
          </label>
          <label className="space-y-1">
            <Label text="App PIN (4 to 8 digits)" required />
            <span className="relative block">
              <input
                value={p.pin}
                onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 8))}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="new-password"
                className={field(problems.pin) + ' font-mono tracking-widest pr-12'}
              />
              <button
                type="button"
                onClick={() => setShowPin((s) => !s)}
                aria-label={showPin ? t('Hide PIN') : t('Show PIN')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </span>
            <Problem k="pin" />
          </label>
          <label className="space-y-1">
            <Label text="Type the PIN again" required />
            <input
              value={pin2}
              onChange={(e) => {
                setPin2(e.target.value.replace(/\D/g, '').slice(0, 8));
                setProblems((prev) => ({ ...prev, pin2: undefined }));
              }}
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="new-password"
              className={field(problems.pin2) + ' font-mono tracking-widest'}
            />
            <Problem k="pin2" />
          </label>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm font-semibold text-red-800 bg-red-50 border border-red-200 rounded-lg p-2.5">
          {error}
        </p>
      )}
      {Object.values(problems).some(Boolean) && (
        <p role="alert" className="text-sm font-semibold text-red-800">{t('Please fix the boxes marked in red.')}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-base font-bold flex items-center gap-2">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
          {t('Save and onboard')}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl border-2 border-slate-300 text-base font-bold text-slate-700">
          {t('Cancel')}
        </button>
      </div>
    </form>
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
          <button
            onClick={() => {
              setOpen(false);
              setPin('');
              setMsg(null);
            }}
            className="px-4 py-2 rounded-xl border-2 border-slate-300 text-base font-bold text-slate-700"
          >
            {t('Cancel')}
          </button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl border-2 border-slate-300 hover:bg-slate-50 text-base font-bold text-slate-700 flex items-center gap-2">
          <KeyRound className="w-5 h-5" />
          {t('Set new PIN')}
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
