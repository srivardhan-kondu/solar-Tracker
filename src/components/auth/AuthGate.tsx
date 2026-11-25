'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertTriangle, Languages, Loader2, LogIn } from 'lucide-react';
import { useLang } from '@/i18n/LanguageContext';
import { Logo } from '@/components/brand/Logo';
import { User } from '@/types';
import { discardUnsentWork, hasUnsentWork } from '@/lib/serverSync';

/**
 * Sign-in gate. Nothing in the app shows until someone signs in with their username and PIN.
 * The person stays signed in for 30 days on this phone, also while offline.
 * The work kept on a phone belongs to the person who signed in; another person can sign in
 * only once that work has been sent.
 */

const USER_KEY = 'SOLAR_TRACKER_USER_V1';
// Work kept on this device by the app (see AppContext)
const DEVICE_DATA_KEYS = ['SOLAR_TRACKER_DATA_V1', 'SOLAR_TRACKER_SURVEYS_V1'];

interface AuthContextType {
  user: User;
  /** Sign out. Refused (returns false) while this phone has work not yet sent. */
  signOut: () => Promise<boolean>;
  /** The server says the sign-in has ended: ask for the PIN again, keeping the work on this phone */
  signedOutByServer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth must be used within AuthGate');
  return c;
};

const readCachedUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

const forgetDeviceData = () => {
  try {
    DEVICE_DATA_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
};

type Phase =
  | { kind: 'checking' }
  | { kind: 'login'; note?: string }
  | { kind: 'no_server' }
  | { kind: 'other_persons_work'; owner: User; next: User }
  | { kind: 'in'; user: User };

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLang();
  const [phase, setPhase] = useState<Phase>({ kind: 'checking' });

  /** Someone has signed in: make sure the work on this phone is theirs */
  const enter = useCallback((user: User) => {
    const owner = readCachedUser();
    if (owner && owner.id !== user.id) {
      if (hasUnsentWork()) {
        setPhase({ kind: 'other_persons_work', owner, next: user });
        return;
      }
      forgetDeviceData();
    }
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
    setPhase({ kind: 'in', user });
  }, []);

  const check = useCallback(async () => {
    setPhase({ kind: 'checking' });
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.status === 401) return setPhase({ kind: 'login' });
      if (!res.ok) throw new Error(String(res.status));
      enter(((await res.json()) as { user: User }).user);
    } catch {
      // No internet: whoever signed in on this phone carries on with the work kept here
      const cached = readCachedUser();
      setPhase(cached ? { kind: 'in', user: cached } : { kind: 'no_server' });
    }
  }, [enter]);

  useEffect(() => {
    void check();
  }, [check]);

  const signOut = useCallback(async () => {
    if (hasUnsentWork()) return false;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* the cookie ends anyway; the phone forgets the person now */
    }
    forgetDeviceData();
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    setPhase({ kind: 'login' });
    return true;
  }, []);

  const signedOutByServer = useCallback(() => {
    setPhase({ kind: 'login', note: t('Please sign in again. Your unsent work is still kept on this phone.') });
  }, [t]);

  if (phase.kind === 'in') {
    return (
      <AuthContext.Provider value={{ user: phase.user, signOut, signedOutByServer }}>
        {/* A different person gets a fresh app */}
        <React.Fragment key={phase.user.id}>{children}</React.Fragment>
      </AuthContext.Provider>
    );
  }

  if (phase.kind === 'checking') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-700" role="status">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
        <p className="text-lg font-semibold">{t('Loading your work…')}</p>
      </div>
    );
  }

  return (
    <Shell>
      {phase.kind === 'login' && <LoginForm note={phase.note} onSignedIn={enter} />}
      {phase.kind === 'no_server' && (
        <div className="space-y-4 text-center" role="alert">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-600" />
          <p className="text-lg font-semibold text-slate-900">
            {t('Cannot reach the server. Connect to the internet to sign in for the first time.')}
          </p>
          <button onClick={() => void check()} className="w-full py-3.5 rounded-xl bg-brand-600 text-white text-lg font-bold">
            {t('Try again')}
          </button>
        </div>
      )}
      {phase.kind === 'other_persons_work' && (
        <div className="space-y-4" role="alert">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-600" />
          <p className="text-lg font-semibold text-slate-900">
            {t('This phone has work from {name} that is not sent yet.', { name: phase.owner.name })}
          </p>
          <p className="text-base text-slate-700">
            {t('{name} must sign in on this phone with internet on, so the work is sent first.', { name: phase.owner.name })}
          </p>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
              setPhase({ kind: 'login' });
            }}
            className="w-full py-3.5 rounded-xl bg-brand-600 text-white text-lg font-bold"
          >
            {t('Sign in as {name}', { name: phase.owner.name })}
          </button>
          <button
            onClick={() => {
              if (!window.confirm(t('Throw away the unsent work of {name}? This cannot be undone.', { name: phase.owner.name }))) return;
              discardUnsentWork();
              enter(phase.next);
            }}
            className="w-full py-3 rounded-xl border-2 border-red-300 text-red-800 text-base font-bold"
          >
            {t('Throw it away and continue as {name}', { name: phase.next.name })}
          </button>
        </div>
      )}
    </Shell>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, lang, toggleLang } = useLang();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-slate-200 text-base font-bold text-slate-700"
            aria-label={t('Change language')}
          >
            <Languages className="w-5 h-5" />
            {lang === 'en' ? 'తెలుగు' : 'English'}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const LoginForm: React.FC<{ note?: string; onSignedIn: (u: User) => void }> = ({ note, onSignedIn }) => {
  const { t } = useLang();
  const [username, setUsername] = useState(() => readCachedUser()?.username ?? '');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !pin) {
      setError(t('Enter your username and PIN.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), pin }),
      });
      if (res.status === 401) setError(t('Wrong username or PIN. Ask the office if you have forgotten your PIN.'));
      else if (!res.ok) setError(t('Could not sign in. Please try again.'));
      else {
        setPin('');
        onSignedIn(((await res.json()) as { user: User }).user);
      }
    } catch {
      setError(t('Cannot reach the server. Connect to the internet to sign in.'));
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full text-lg bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:border-brand-600 outline-none';

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">{t('Sign in')}</h1>
      {note && <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-base text-amber-950">{note}</p>}
      <label className="block space-y-1.5">
        <span className="text-base font-semibold text-slate-700">{t('Username')}</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className={field}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-base font-semibold text-slate-700">{t('PIN')}</span>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          className={field + ' tracking-[0.4em]'}
        />
      </label>
      {error && (
        <p role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-base font-semibold text-red-800">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-lg font-bold flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
        {t('Sign in')}
      </button>
    </form>
  );
};
