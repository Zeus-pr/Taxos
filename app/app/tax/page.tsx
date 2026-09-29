import { loadTaxPicture } from '@/modules/income/service';
import { formatINR, CATEGORY_LABELS } from '@/lib/format';
import { Disclaimer } from '@/components/ui';
export const dynamic = 'force-dynamic';

export default async function Page() {
  const { getSessionUser } = await import('@/lib/auth/service');
  const { cookies } = await import('next/headers');
  const user = await getSessionUser((await cookies()).get('taxos_session')?.value);
  if (!user) return null;
  const d = await loadTaxPicture(user.id);
  const n = d.calculationNEW, o = d.calculationOLD;

  if (!n || !o) return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Tax estimate</h1>
      <div className="card p-10 text-center text-sm text-neutral-500">No income or tax data yet — add income first and the engine will calculate both regimes.<br /><a href="/app/income" className="underline">Go to Income →</a></div>
    </div>
  );

  const regimeCard = (name: string, c: typeof n, recommended: boolean) => (
    <div className={`card p-6 ${recommended ? 'ring-2 ring-neutral-900' : ''}`}>
      <p className="text-sm font-semibold">{name} regime {recommended && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Lower tax</span>}</p>
      <p className="num mt-2 text-3xl font-semibold">{formatINR(c.totalTax)}</p>
      <dl className="mt-4 space-y-1.5 text-sm">
        {[['Gross total income', c.grossIncome], ['Deductions applied', c.deductions], ['Taxable income', c.taxableIncome], ['Slab tax', c.slabTax], ['Special-rate gains tax', c.specialRateTax], ['Rebate u/s 87A', -c.rebate], ['Surcharge', c.surcharge], ['Cess', c.cess]].map(([k, v]) => (
          <div key={k as string} className="flex justify-between"><dt className="text-neutral-500">{k}</dt><dd className="num">{formatINR(v as number)}</dd></div>
        ))}
      </dl>
    </div>
  );

  const recNew = d.comparison!.difference <= 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Tax estimate</h1><p className="mt-1 text-sm text-neutral-500">FY {d.profile?.taxYear} · rules v{n.ruleVersion} · law {n.lawVersion} · calculated {new Date(n.calculatedAt).toLocaleString('en-IN')}</p></div>
        <a href="/api/reports/summary?format=md" className="btn-secondary !py-2 text-xs">Download summary report</a>
      </header>

      <div className="grid gap-6 md:grid-cols-2">{regimeCard('New', n, recNew)}{regimeCard('Old', o, !recNew)}</div>

      <section className="card p-6">
        <h2 className="mb-3 text-sm font-semibold">Why one beats the other</h2>
        <p className="text-sm leading-relaxed text-neutral-600">{d.comparison!.explanation}</p>
      </section>

      <section className="card overflow-x-auto p-6">
        <h2 className="mb-4 text-sm font-semibold">Calculation breakdown ({recNew ? 'New' : 'Old'} regime)</h2>
        <table className="w-full min-w-[520px] text-sm">
          <thead><tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400"><th className="pb-2">Line</th><th className="pb-2">Base amount</th><th className="pb-2">Rate</th><th className="pb-2 text-right">Tax effect</th><th className="pb-2">Rule</th></tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {(recNew ? n : o).lines.map((l, i) => (
              <tr key={i}><td className="py-2">{l.description}<br /><span className="text-xs text-neutral-400">{CATEGORY_LABELS[l.category] ?? l.category} · {l.source}</span></td>
                <td className="num py-2">{formatINR(l.baseAmount)}</td>
                <td className="num py-2">{l.rate === null ? '—' : `${(l.rate * 100).toFixed(1)}%`}</td>
                <td className="num py-2 text-right">{formatINR(l.taxAmount)}</td>
                <td className="py-2 text-xs text-neutral-500">{l.ruleId}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-6">
        <h2 className="mb-3 text-sm font-semibold">Payments & credits</h2>
        {d.payments.length === 0 ? <p className="text-sm text-neutral-500">No TDS/advance records yet — upload 26AS or Form 16 to populate credits automatically.</p> : (
          <ul className="divide-y divide-neutral-100 text-sm">{d.payments.map((p, i) => <li key={i} className="flex justify-between py-2"><span className="text-neutral-600">{p.type} · {p.source}</span><span className="num font-medium">{formatINR(p.amount)}</span></li>)}</ul>
        )}
        <div className="mt-4 flex justify-between border-t border-neutral-200 pt-4 text-sm font-semibold"><span>{n.refundOrPayable >= 0 ? 'Estimated balance payable' : 'Estimated refund'}</span><span className="num">{formatINR(Math.abs(n.refundOrPayable))}</span></div>
      </section>

      <Disclaimer>This is an estimate produced by a deterministic, versioned rule engine — not a final liability. Verify against official tax records before making any payment.</Disclaimer>
    </div>
  );
}
