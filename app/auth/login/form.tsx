'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';

export function LoginForm({ googleClientId }: { googleClientId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [f, setF] = useState({ email: '', password: '', code: '' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const url = mode === 'password' ? '/api/auth/login' : '/api/auth/otp';
    const body = mode === 'password'
      ? { email: f.email.trim().toLowerCase(), password: f.password }
      : sent
        ? { action: 'verify', email: f.email.trim().toLowerCase(), code: f.code }
        : { action: 'request', email: f.email.trim().toLowerCase() };

    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setErr(result.error ?? 'Sign in failed. Please try again.');
        return;
      }
      if (mode === 'otp' && !sent) {
        setSent(true);
        if (result.devCode) setF(value => ({ ...value, code: result.devCode }));
        return;
      }
      router.push('/app');
      router.refresh();
    } catch {
      setErr('We could not reach TaxOS. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-neutral-500">Sign in to your tax workspace.</p>
      {err && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block"><span className="label">Email</span><input className="input" type="email" autoComplete="email" value={f.email} onChange={set('email')} required /></label>
        {mode === 'password' && <label className="block"><span className="label">Password</span><input className="input" type="password" autoComplete="current-password" value={f.password} onChange={set('password')} required /></label>}
        {mode === 'otp' && sent && <label className="block"><span className="label">6-digit code</span><input className="input num" type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={f.code} onChange={set('code')} required /></label>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'password' ? 'Sign in' : sent ? 'Verify & continue' : 'Send code'}</button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <button type="button" className="text-neutral-500 underline" onClick={() => { setMode(m => m === 'password' ? 'otp' : 'password'); setSent(false); setF(value => ({ ...value, code: '' })); setErr(null); }}>{mode === 'password' ? 'Sign in with an email code instead' : 'Sign in with password'}</button>
      </div>
      <GoogleSignInButton clientId={googleClientId} />
      <p className="mt-6 text-center text-sm text-neutral-500">New to TaxOS? <Link className="font-medium text-neutral-900 underline" href="/auth/signup">Create an account</Link></p>
    </div>
  );
}
