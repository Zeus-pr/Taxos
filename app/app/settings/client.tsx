'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SettingsClient({ user, profile }: { user: any; profile: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: '', next: '' });

  async function post(url: string, body?: unknown) {
    setBusy(true);
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const res = await r.json().catch(() => ({})); setBusy(false);
    setMsg(res.ok ? (res.message ?? 'Done.') : (res.error ?? 'Something went wrong.'));
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Settings</h1>
      {msg && <p className="rounded-xl bg-neutral-100 px-4 py-3 text-sm">{msg}</p>}

      <section className="card space-y-2 p-6 text-sm">
        <p className="font-semibold">Account</p>
        <p className="text-neutral-600">{user.name ?? '—'} · {user.email} · plan: {String(user.plan).toUpperCase()}</p>
        {profile && <p className="text-neutral-600">FY {profile.taxYear} · {profile.regime} regime{profile.panMasked ? ` · PAN ${profile.panMasked}` : ''}</p>}
      </section>

      <section className="card space-y-3 p-6">
        <p className="text-sm font-semibold">Change password</p>
        <input className="input" type="password" placeholder="Current password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} />
        <input className="input" type="password" placeholder="New password (min 10 characters)" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} />
        <button className="btn-primary" disabled={busy || !pw.current || pw.next.length < 10} onClick={() => post('/api/account/password', pw)}>Update password</button>
      </section>

      <section className="card space-y-3 p-6">
        <p className="text-sm font-semibold">Sessions</p>
        <p className="text-xs text-neutral-500">Sign out of this device — or every device.</p>
        <div className="flex gap-3"><button className="btn-secondary" disabled={busy} onClick={() => post('/api/auth/logout')}>Sign out here</button><button className="btn-secondary" disabled={busy} onClick={() => post('/api/account/logout-all')}>Sign out everywhere</button></div>
      </section>

      <section className="card space-y-3 border-red-200 p-6">
        <p className="text-sm font-semibold text-red-700">Delete account</p>
        <p className="text-xs leading-relaxed text-neutral-500">Permanently removes your account and all data. TaxOS does not retain deleted financial information without your explicit consent. This cannot be undone.</p>
        <button className="btn-secondary !border-red-300 !text-red-700 hover:!bg-red-50" disabled={busy} onClick={() => { if (confirm('Delete your account and ALL data permanently?')) post('/api/account/delete'); }}>Delete my account</button>
      </section>
    </div>
  );
}
