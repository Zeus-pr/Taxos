import { getRepo } from '@/lib/db/repo';
import { StatusPill } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const repo = await getRepo();
  const docs = await repo.findMany('document', {});
  return (
    <div className="card overflow-x-auto p-6">
      <h1 className="mb-4 text-lg font-semibold">All documents</h1>
      <table className="w-full min-w-[640px] text-sm">
        <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-neutral-400"><th className="pb-2">Name</th><th className="pb-2">Type</th><th className="pb-2">Status</th><th className="pb-2 text-right">Size</th><th className="pb-2 text-right">Uploads</th></tr></thead>
        <tbody className="divide-y divide-neutral-100">
          {docs.slice(0, 200).map(d => <tr key={String(d.id)}><td className="max-w-[240px] truncate py-2">{String(d.name)}</td><td className="py-2">{String(d.docType).replace(/_/g, ' ')}</td><td className="py-2"><StatusPill status={String(d.status)} /></td><td className="num py-2 text-right">{(Number(d.sizeBytes) / 1024).toFixed(0)} KB</td><td className="num py-2 text-right">{Number(d.uploadCount ?? 0)}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
