import { getRepo } from '@/lib/db/repo';
import { formatINR } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const { getSessionUser } = await import('@/lib/auth/service');
  const { cookies } = await import('next/headers');
  const user = await getSessionUser((await cookies()).get('taxos_session')?.value);
  if (!user) return null;
  const repo = await getRepo();
  const rows = await repo.findMany('investment', { userId: user.id });
  const holdings = rows.map(r => ({ investedPaise: Number(r.invested_paise ?? r.investedPaise ?? 0), currentValuePaise: Number(r.current_value_paise ?? r.currentValuePaise ?? 0) }));
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Investments</h1><p className="mt-1 text-sm text-neutral-500">Import statements from Documents, or add your invested and current values manually.</p></header>
      {holdings.length === 0 ? <div className="card p-10 text-center text-sm text-neutral-500">No investment records yet.<br /><a href="/app/documents" className="underline">Upload a mutual-fund or broker statement →</a></div> : (
        <div className="space-y-4">{holdings.map((h, i) => (
          <div key={i} className="card flex items-center justify-between p-5"><div><p className="text-sm font-medium">Holding {i + 1}</p><p className="num mt-1 text-xs text-neutral-500">Invested {formatINR(h.investedPaise)}</p></div><div className="text-right"><p className="num text-lg font-semibold">{formatINR(h.currentValuePaise)}</p><p className="text-xs text-neutral-400">Current value · change {formatINR(h.currentValuePaise - h.investedPaise)}</p></div></div>
        ))}</div>
      )}
      <p className="text-xs text-neutral-400">Values shown are based on your saved records and are not investment advice.</p>
    </div>
  );
}
