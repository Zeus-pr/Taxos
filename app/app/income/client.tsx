'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatINR, CATEGORY_LABELS } from '@/lib/format';
import { StatusPill } from '@/components/ui';

const CATEGORIES = ['SALARY', 'PENSION', 'HOUSE_PROPERTY', 'INTEREST_SAVINGS', 'INTEREST_FD', 'DIVIDEND', 'OTHER_INTEREST', 'OTHER_SOURCE', 'FREELANCE', 'CAPITAL_GAINS_STCG_111A', 'CAPITAL_GAINS_LTCG_112A', 'CAPITAL_GAINS_SLAB'];
const DEDUCTIONS = [
  { section: '80C', label: '80C — investments (₹1.5L cap)', max: 150000 },
  { section: '80D', label: '80D — health insurance', max: 100000 },
  { section: '80CCD(1B)', label: '80CCD(1B) — NPS extra (₹50k cap)', max: 50000 },
  { section: '80TTA', label: '80TTA — savings interest (₹10k cap)', max: 10000 },
  { section: '80E', label: '80E — education loan interest', max: 0 },
  { section: '24b', label: 'Home loan interest u/s 24(b)', max: 200000 },
];

export function IncomeClient({ data }: { data: { incomes: any[]; deductions: any[] } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [inc, setInc] = useState({ category: 'SALARY', amount: '', description: '' });
  const [ded, setDed] = useState({ section: '80C', label: '80C — investments', amount: '' });

  async function call(url: string, body: unknown, method = 'POST') {
    setBusy(true); setErr(null);
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const res = await r.json(); setBusy(false);
    if (!res.ok) setErr(res.error ?? 'Something did not work.'); else router.refresh();
    return res.ok;
  }

  const total = data.incomes.reduce((s, i) => s + Math.max(0, i.amount_paise), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Income & deductions</h1><p className="mt-1 text-sm text-neutral-500">Every record shows its source and confidence. Imported records never overwrite what you entered.</p></header>
      {err && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold">Add income</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <select className="input" value={inc.category} onChange={e => setInc({ ...inc, category: e.target.value })}>{CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}</select>
          <input className="input num" placeholder="Amount ₹" value={inc.amount} onChange={e => setInc({ ...inc, amount: e.target.value })} />
          <input className="input" placeholder="Description (optional)" value={inc.description} onChange={e => setInc({ ...inc, description: e.target.value })} />
          <button className="btn-primary" disabled={busy || !Number(inc.amount)} onClick={() => { if (Number(inc.amount) > 0) call('/api/income', { category: inc.category, amountRupees: Number(inc.amount), description: inc.description || undefined }).then(() => setInc({ ...inc, amount: '', description: '' })); }}>Add</button>
        </div>
      </section>

      <section className="card overflow-x-auto p-6">
        <h2 className="mb-4 text-sm font-semibold">Your income records</h2>
        {data.incomes.length === 0 ? <p className="py-6 text-center text-sm text-neutral-500">Nothing here yet — add income above or upload a Form 16 in Documents.</p> : (
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400"><th className="pb-2">Category</th><th className="pb-2">Source</th><th className="pb-2">Confidence</th><th className="pb-2 text-right">Amount</th><th className="pb-2" /></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {data.incomes.map(i => (
                <tr key={i.id}>
                  <td className="py-2.5">{CATEGORY_LABELS[i.category] ?? i.category}<br /><span className="text-xs text-neutral-400">{i.description}</span></td>
                  <td className="py-2.5 text-neutral-500">{i.source}</td>
                  <td className="py-2.5"><StatusPill status={i.status} /></td>
                  <td className="num py-2.5 text-right font-medium">{formatINR(i.amount_paise)}</td>
                  <td className="py-2.5 text-right">
                    {i.status !== 'USER_CONFIRMED' && <button className="mr-2 text-xs underline" disabled={busy} onClick={() => call(`/api/records/${i.id}/confirm`, {})}>Confirm</button>}
                    <button className="text-xs text-red-600 underline" disabled={busy} onClick={() => call(`/api/records/${i.id}`, {}, 'DELETE')}>Remove</button>
                  </td>
                </tr>
              ))}
              <tr className="font-semibold"><td className="py-2.5">Total</td><td /><td /><td className="num py-2.5 text-right">{formatINR(total)}</td><td /></tr>
            </tbody>
          </table>
        )}
      </section>

      <section className="card p-6">
        <h2 className="mb-1 text-sm font-semibold">Deductions</h2>
        <p className="mb-4 text-xs text-neutral-500">Applied only under the Old regime where allowed; caps enforced by the tax engine.</p>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <select className="input" value={ded.section} onChange={e => { const d = DEDUCTIONS.find(x => x.section === e.target.value)!; setDed({ section: d.section, label: d.label, amount: ded.amount }); }}>{DEDUCTIONS.map(d => <option key={d.section} value={d.section}>{d.label}</option>)}</select>
          <input className="input num" placeholder="Amount ₹" value={ded.amount} onChange={e => setDed({ ...ded, amount: e.target.value })} />
          <button className="btn-primary" disabled={busy || !Number(ded.amount)} onClick={() => { if (Number(ded.amount) > 0) call('/api/income/deductions', ded).then(() => setDed({ ...ded, amount: '' })); }}>Add</button>
        </div>
        {data.deductions.length > 0 && (
          <ul className="mt-4 divide-y divide-neutral-100 text-sm">
            {data.deductions.map((d: any) => (
              <li key={d.section} className="flex items-center justify-between py-2"><span>{d.label}</span><span className="flex items-center gap-3"><span className="num font-medium">{formatINR(d.amount)}</span><button className="text-xs text-red-600 underline" onClick={() => call('/api/income/deductions', { section: d.section }, 'DELETE')}>Remove</button></span></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
