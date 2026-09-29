import { getRepo } from '@/lib/db/repo';
import { formatINR } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const repo = await getRepo();
  const [users, docs, records, audits] = await Promise.all([repo.findMany('user', {}), repo.findMany('document', {}), repo.findMany('incomeRecord', {}), repo.findMany('auditLog', {})]);
  const cards = [['Users', String(users.length)], ['Documents', `${docs.filter(d => d.status === 'PROCESSED').length}/${docs.length} processed`], ['Income records', String(records.length)], ['Total recorded income', formatINR(records.reduce((s, r) => s + Math.max(0, Number(r.amount_paise)), 0))], ['Audit events', String(audits.length)]];
  return (<div className="space-y-6"><h1 className="text-2xl font-semibold tracking-tight">Platform overview</h1><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([k, v]) => <div key={k} className="card p-5"><p className="text-[11px] uppercase tracking-wider text-neutral-500">{k}</p><p className="num mt-1 text-xl font-semibold">{v}</p></div>)}</div></div>);
}
