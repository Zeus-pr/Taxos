import { getRepo } from '@/lib/db/repo';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const repo = await getRepo();
  const logs = await repo.findMany('auditLog', {});
  return (
    <div className="card overflow-x-auto p-6">
      <h1 className="mb-1 text-lg font-semibold">Audit log</h1>
      <p className="mb-4 text-xs text-neutral-500">Actions only — never passwords, OTPs, document contents or raw financial values.</p>
      <table className="w-full min-w-[560px] text-sm">
        <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-neutral-400"><th className="pb-2">When</th><th className="pb-2">Actor</th><th className="pb-2">Action</th><th className="pb-2">Entity</th></tr></thead>
        <tbody className="divide-y divide-neutral-100">
          {logs.slice(0, 300).map(l => <tr key={String(l.id)}><td className="py-2 text-xs">{new Date(String(l.createdAt)).toLocaleString('en-IN')}</td><td className="py-2 text-xs">{String(l.actorId ?? 'system')}</td><td className="py-2">{String(l.action)}</td><td className="py-2 text-xs text-neutral-500">{String(l.entityType)}{l.entityId ? `#${String(l.entityId).slice(0, 8)}` : ''}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
