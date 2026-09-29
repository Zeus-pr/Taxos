'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const DISCOVERY = [
  ['salary', 'Salary'], ['bank', 'Bank / FD Interest'], ['stocks', 'Stocks'], ['mf', 'Mutual Funds'],
  ['dividends', 'Dividends'], ['rental', 'Rental Income'], ['freelance', 'Freelance / Business'],
  ['foreign', 'Foreign Income'], ['other', 'Other Income'],
];

export function OnboardingClient({ defaultName, years, existing }: { defaultName: string; years: string[]; existing: any[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ex = existing[0];
  const [f, setF] = useState<any>({
    taxYear: ex?.taxYear ?? years[years.length - 1] ?? '2026-27',
    name: ex?.name ?? defaultName, dob: ex?.dob ? String(ex.dob).slice(0, 10) : '', residentialStatus: 'ORDINARY_RESIDENT', state: ex?.state ?? '',
    taxpayerCategory: 'INDIVIDUAL', employmentType: 'SALARIED', isSalaried: true, isInvestor: false, hasCapitalGains: false,
    ownsProperty: false, hasFreelance: false, hasForeignIncome: false, pan: '', regime: ex?.regime ?? 'NEW',
    discovery: { salary: true, bank: true, stocks: false, mf: false, dividends: false, rental: false, freelance: false, foreign: false, other: false },
  });
  const upd = (k: string, v: unknown) => setF({ ...f, [k]: v });

  async function finish() {
    setBusy(true); setErr(null);
    const { discovery, ...profile } = f;
    const r = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...profile, incomeDiscovery: discovery }) });
    const res = await r.json(); setBusy(false);
    if (!res.ok) return setErr(res.error ?? 'Could not save. Please check the highlighted fields.');
    router.push('/app'); router.refresh();
  }

  const toggle = (k: string) => f.discovery[k] ? undefined : upd('discovery', { ...f.discovery, [k]: true });

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Step {step + 1} of 3</p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200"><div className="h-full rounded-full bg-neutral-900 transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
      {err && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}

      {step === 0 && (
        <div className="card mt-8 p-8">
          <h1 className="text-xl font-semibold">Which tax year are we organizing?</h1>
          <p className="mt-2 text-sm text-neutral-500">Rules are versioned per year — TaxOS applies the rules that belong to the selected year.</p>
          <div className="mt-6 space-y-2">
            {years.map(y => (
              <button key={y} onClick={() => upd('taxYear', y)} className={`w-full rounded-xl border p-4 text-left text-sm font-medium ${f.taxYear === y ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:border-neutral-400'}`}>
                FY {y} <span className="float-right text-xs font-normal opacity-70">AY {String(Number(y.slice(0, 4)) + 1)}–{String(Number(y.slice(0, 4)) + 2).slice(-2)}</span>
              </button>
            ))}
          </div>
          <button className="btn-primary mt-8 w-full" onClick={() => setStep(1)}>Continue</button>
        </div>
      )}

      {step === 1 && (
        <div className="card mt-8 space-y-4 p-8">
          <h1 className="text-xl font-semibold">About you</h1>
          <label className="block"><span className="label">Full name (as in official records)</span><input className="input" value={f.name} onChange={e => upd('name', e.target.value)} /></label>
          <label className="block"><span className="label">Date of birth</span><input className="input" type="date" value={f.dob} onChange={e => upd('dob', e.target.value)} required /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="label">Residential status</span>
              <select className="input" value={f.residentialStatus} onChange={e => upd('residentialStatus', e.target.value)}>
                <option value="ORDINARY_RESIDENT">Resident</option><option value="NRI">Resident but Not Ordinarily Resident</option><option value="NON_RESIDENT">Non-Resident</option>
              </select></label>
            <label className="block"><span className="label">State</span><input className="input" value={f.state} onChange={e => upd('state', e.target.value)} /></label>
          </div>
          <label className="block"><span className="label">PAN (optional — encrypted at rest, never shared)</span><input className="input uppercase" maxLength={10} placeholder="ABCDE1234F" value={f.pan} onChange={e => upd('pan', e.target.value.toUpperCase())} /></label>
          <fieldset className="rounded-xl border border-neutral-200 p-4">
            <legend className="px-1 text-xs font-medium uppercase tracking-wide text-neutral-500">What applies to you? (change anytime)</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {[['isSalaried', 'Salaried'], ['isInvestor', 'Investor'], ['hasCapitalGains', 'Has capital gains'], ['ownsProperty', 'Owns property'], ['hasFreelance', 'Freelance / business income'], ['hasForeignIncome', 'Foreign income/assets']].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={!!f[k]} onChange={e => upd(k, e.target.checked)} />{label}</label>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-3"><button className="btn-secondary flex-1" onClick={() => setStep(0)}>Back</button><button className="btn-primary flex-1" onClick={() => setStep(2)}>Continue</button></div>
        </div>
      )}

      {step === 2 && (
        <div className="card mt-8 p-8">
          <h1 className="text-xl font-semibold">Where does your money come from?</h1>
          <p className="mt-2 text-sm text-neutral-500">Pick what applies — this shapes your dashboard and checklist. You can modify later.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {DISCOVERY.map(([k, label]) => {
              const on = !!f.discovery[k];
              return <button key={k} onClick={() => upd('discovery', { ...f.discovery, [k]: !on })} className={`rounded-xl border p-4 text-sm font-medium ${on ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}>{on ? '☑ ' : '☐ '}{label}</button>;
            })}
          </div>
          <label className="mt-6 block"><span className="label">Preferred regime for estimates</span>
            <select className="input" value={f.regime} onChange={e => upd('regime', e.target.value)}><option value="NEW">New regime</option><option value="OLD">Old regime</option></select></label>
          <div className="mt-8 flex gap-3"><button className="btn-secondary flex-1" onClick={() => setStep(1)}>Back</button><button className="btn-primary flex-1" disabled={busy || !f.name || !f.dob} onClick={finish}>{busy ? 'Saving…' : 'Build my tax profile'}</button></div>
        </div>
      )}
    </div>
  );
}
