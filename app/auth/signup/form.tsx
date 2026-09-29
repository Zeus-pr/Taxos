'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';

export function SignupForm({ googleClientId }: { googleClientId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF(value => ({ ...value, [k]: e.target.value }));

  async function signup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, name: f.name.trim(), email: f.email.trim().toLowerCase() }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setErr(result.error ?? 'Could not create your account. Please try again.');
        return;
      }
      router.push('/app/onboarding');
      router.refresh();
    } catch {
      setErr('We could not reach TaxOS. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-sm text-neutral-500">We never ask for Income Tax, bank or broker passwords.</p>
      {err && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
      <form onSubmit={signup} className="mt-6 space-y-4">
        <label className="block"><span className="label">Full name</span><input className="input" autoComplete="name" value={f.name} onChange={set('name')} required minLength={2} maxLength={80} /></label>
        <label className="block"><span className="label">Email</span><input className="input" type="email" autoComplete="email" value={f.email} onChange={set('email')} required maxLength={200} /></label>
        <label className="block"><span className="label">Password</span><input className="input" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} required minLength={10} maxLength={200} aria-describedby="password-hint" /></label>
        <p id="password-hint" className="-mt-2 text-xs text-neutral-500">Use at least 10 characters.</p>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'}</button>
      </form>
      <GoogleSignInButton clientId={googleClientId} />
      <p className="mt-6 text-center text-sm text-neutral-500">Already have an account? <Link className="font-medium text-neutral-900 underline" href="/auth/login">Sign in</Link></p>
    </div>
  );
}
