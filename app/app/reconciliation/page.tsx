import { loadTaxPicture } from '@/modules/income/service';
import { formatINR, CATEGORY_LABELS } from '@/lib/format';
import { StatusPill, Disclaimer } from '@/components/ui';
export const dynamic = 'force-dynamic';

const EXPLAIN: Record<string, string> = {
  MATCHED: 'Sources agree — nothing to do.',
  USER_CONFIRMED: 'You confirmed this value. It stays yours.',
  CONFLICT: 'Two sources disagree. TaxOS never picks a winner silently — review both sides below.',
  DUPLICATE: 'The same income likely appears in two documents (e.g. Form 16 and AIS). Counted once; confirm it is truly the same item.',
  NEEDS_REVIEW: 'A source reports income you have not entered yet — verify whether it belongs to you.',
};

export default async function Page() {
  const { getSessionUser } = await import('@/lib/auth/service');
  const { cookies } = await import('next/headers');
  const user = await getSessionUser((await cookies()).get('taxos_session')?.value);
  if (!user) return null;
  const d = await loadTaxPicture(user.id);
  const groups = d.reconGroups;
  const counts = groups.reduce<Record<string, number>>((m, g) => { m[g.status] = (m[g.status] ?? 0) + 1; return m; }, {});

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Reconciliation</h1><p className="mt-1 text-sm text-neutral-500">What your records say vs what your documents say.</p></header>

      {groups.length === 0 ? <div className="card p-10 text-center text-sm text-neutral-500">Nothing to reconcile yet. Add income and upload documents (AIS / Form 16 / bank statement) to see comparisons here.</div> : (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(counts).map(([s, c]) => <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1"><StatusPill status={s} />{c}</span>)}
          </div>
          <div className="space-y-4">
            {groups.map(g => (
              <div key={g.category} className={`card p-5 ${g.status === 'CONFLICT' ? 'border-red-200' : g.status === 'NEEDS_REVIEW' || g.status === 'DUPLICATE' ? 'border-amber-200' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-sm font-medium">{CATEGORY_LABELS[g.category] ?? g.category}</p><p className="mt-0.5 text-xs text-neutral-500">{g.records.length} source {g.records.length === 1 ? 'record' : 'records'} to review</p></div>
                  <div className="text-right">{g.differencePaise !== 0 && <p className="num text-sm font-semibold text-red-600">Δ {formatINR(Math.abs(g.differencePaise))}</p>}</div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-neutral-500">{EXPLAIN[g.status]}</p>
                {g.records.length > 0 && (
                  <details className="mt-3"><summary className="cursor-pointer text-xs underline text-neutral-600">Show {g.records.length} record(s)</summary>
                    <ul className="mt-2 divide-y divide-neutral-100 text-xs">
                      {g.records.map(r => <li key={r.id} className="flex justify-between py-1.5"><span className="text-neutral-600">{CATEGORY_LABELS[r.category] ?? r.category} · {r.source}{r.reference ? ` · ${r.reference}` : ''}</span><span className="flex items-center gap-2 num">{formatINR(r.amount_paise)}<StatusPill status={r.status} /></span></li>)}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      <Disclaimer>Potential mismatches are shown for your review only. TaxOS does not merge or overwrite records without your explicit confirmation.</Disclaimer>
    </div>
  );
}
