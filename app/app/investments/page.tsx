import { getRepo } from '@/lib/db/repo';
import { formatINR } from '@/lib/format';
import { StatusPill } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { getSessionUser } = await import('@/lib/auth/service');
  const { cookies } = await import('next/headers');
  const user = await getSessionUser((await cookies()).get('taxos_session')?.value);
  if (!user) return null;

  const repo = await getRepo();
  const [holdingRows, transactionRows] = await Promise.all([
    repo.findMany('investmentHolding', { userId: user.id }),
    repo.findMany('investmentTransaction', { userId: user.id }),
  ]);
  const holdings = holdingRows.map(row => ({
    ...row,
    security: String(row.security ?? 'Investment'),
    isin: row.isin == null ? null : String(row.isin),
    assetKind: String(row.assetKind ?? '—'),
    taxYear: String(row.taxYear ?? '—'),
    quantity: Number(row.quantity ?? 0),
    costPaise: Number(row.costPaise ?? 0),
  }));
  const transactions = transactionRows
    .map(row => ({
      ...row,
      taxYear: String(row.taxYear ?? '—'),
      source: String(row.source ?? '—'),
      buyDate: row.buyDate == null ? null : String(row.buyDate),
      sellDate: row.sellDate == null ? null : String(row.sellDate),
      createdAt: row.createdAt == null ? '' : String(row.createdAt),
      holdingType: String(row.holdingType ?? 'OPEN'),
      status: String(row.status ?? 'NEEDS_REVIEW'),
      quantity: Number(row.quantity ?? 0),
      buyValuePaise: Number(row.buyValuePaise ?? 0),
      sellValuePaise: Number(row.sellValuePaise ?? 0),
      gainPaise: Number(row.gainPaise ?? 0),
    }))
    .sort((a, b) => String(b.sellDate ?? b.buyDate ?? b.createdAt ?? '').localeCompare(String(a.sellDate ?? a.buyDate ?? a.createdAt ?? '')));
  const realizedGainPaise = transactions.reduce((sum, row) => sum + (row.sellDate ? row.gainPaise : 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Investments</h1>
          <p className="mt-1 text-sm text-neutral-500">Review imported holdings and investment transactions used in your tax picture.</p>
        </div>
        <a href="/app/documents" className="btn-secondary !py-2 text-xs">Import a statement</a>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Investment summary">
        <div className="card p-5"><p className="text-xs text-neutral-500">Holdings recorded</p><p className="num mt-2 text-2xl font-semibold">{holdings.length}</p></div>
        <div className="card p-5"><p className="text-xs text-neutral-500">Transactions recorded</p><p className="num mt-2 text-2xl font-semibold">{transactions.length}</p></div>
        <div className="card p-5"><p className="text-xs text-neutral-500">Realized gain / loss</p><p className="num mt-2 text-2xl font-semibold">{formatINR(realizedGainPaise)}</p></div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Holdings</h2>
        {holdings.length === 0 ? (
          <div className="card p-7 text-center text-sm text-neutral-500">No holdings have been imported yet. Upload a broker or mutual-fund statement to add investment records.</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400"><th className="p-4">Security</th><th className="p-4">Asset type</th><th className="p-4">Tax year</th><th className="p-4 text-right">Quantity</th><th className="p-4 text-right">Recorded cost</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {holdings.map((holding, index) => <tr key={String(holding.id ?? index)}>
                  <td className="p-4"><span className="font-medium">{String(holding.security ?? 'Investment')}</span>{holding.isin ? <span className="mt-1 block text-xs text-neutral-400">ISIN {String(holding.isin)}</span> : null}</td>
                  <td className="p-4 text-neutral-600">{String(holding.assetKind ?? '—').replace(/_/g, ' ')}</td>
                  <td className="p-4 text-neutral-600">{String(holding.taxYear ?? '—')}</td>
                  <td className="num p-4 text-right">{holding.quantity.toLocaleString('en-IN')}</td>
                  <td className="num p-4 text-right">{formatINR(holding.costPaise)}</td>
                </tr>)}
              </tbody>
            </table>
            <p className="border-t border-neutral-100 px-4 py-3 text-xs text-neutral-400">Current market values are not shown because TaxOS does not fetch live prices.</p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Transactions</h2>
        {transactions.length === 0 ? (
          <div className="card p-7 text-center text-sm text-neutral-500">No investment transactions yet. Upload a broker or capital-gains statement to import realized trades.</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead><tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400"><th className="p-4">Transaction</th><th className="p-4">Source · Tax year</th><th className="p-4 text-right">Quantity</th><th className="p-4 text-right">Buy value</th><th className="p-4 text-right">Sale value</th><th className="p-4 text-right">Gain / loss</th><th className="p-4">Review</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {transactions.map((transaction, index) => <tr key={String(transaction.id ?? index)}>
                  <td className="p-4"><span className="font-medium">{String(transaction.holdingType ?? 'OPEN').replace(/_/g, ' ')} investment</span><span className="mt-1 block text-xs text-neutral-400">Bought {String(transaction.buyDate ?? 'date unavailable')} · Sold {String(transaction.sellDate ?? 'not sold')}</span></td>
                  <td className="p-4 text-neutral-600">{String(transaction.source ?? '—')} · {String(transaction.taxYear ?? '—')}</td>
                  <td className="num p-4 text-right">{transaction.quantity.toLocaleString('en-IN')}</td>
                  <td className="num p-4 text-right">{formatINR(transaction.buyValuePaise)}</td>
                  <td className="num p-4 text-right">{transaction.sellDate ? formatINR(transaction.sellValuePaise) : '—'}</td>
                  <td className="num p-4 text-right">{transaction.sellDate ? formatINR(transaction.gainPaise) : '—'}</td>
                  <td className="p-4"><StatusPill status={String(transaction.status ?? 'NEEDS_REVIEW')} /></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-neutral-400">Transactions are shown from your saved records. Capital-gains tax estimates depend on complete purchase dates, sale dates, and transaction charges.</p>
    </div>
  );
}
