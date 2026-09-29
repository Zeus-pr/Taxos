import { getRepo } from '@/lib/db/repo';
import { formatINR } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const repo = await getRepo();
  const rows = await repo.findMany('extraction', {});
  return (
    <div className="card overflow-x-auto p-6">
      <h1 className="mb-1 text-lg font-semibold">Extractions</h1>
      <p className="mb-4 text-xs text-neutral-500">Low-confidence rows (&lt;90%) require user confirmation before they can affect any calculation.</p>
      <table className="w-full min-w-[640px] text-sm">
        <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-neutral-400"><th className="pb-2">Field</th><th className="pb-2">Category</th><th className="pb-2 text-right">Value</th><th className="pb-2 text-right">Confidence</th></tr></thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.slice(0, 200).sort((a, b) => Number(a.confidence) - Number(b.confidence)).map(e => (
            <tr key={String(e.id)} className={Number(e.confidence) < 0.9 ? 'bg-amber-50/50' : ''}><td className="py-2">{String(e.fieldPath)}</td><td className="py-2">{String(e.category)}</td><td className="num py-2 text-right">{formatINR(Number(e.valueRupees) * 100)}</td><td className="num py-2 text-right">{(Number(e.confidence) * 100).toFixed(0)}%</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
