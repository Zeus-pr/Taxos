import { getRepo } from '@/lib/db/repo';
import { formatINR } from '@/lib/format';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const repo = await getRepo();
  const users = await repo.findMany('user', {});
  const profiles = await repo.findMany('taxProfile', {});
  return (
    <div className="card overflow-x-auto p-6">
      <h1 className="mb-4 text-lg font-semibold">Users</h1>
      <table className="w-full min-w-[600px] text-sm">
        <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-neutral-400"><th className="pb-2">Email</th><th className="pb-2">Role</th><th className="pb-2">Plan</th><th className="pb-2">Status</th><th className="pb-2 text-right">Records</th></tr></thead>
        <tbody className="divide-y divide-neutral-100">
          {users.map(u => <tr key={String(u.id)}><td className="py-2">{String(u.email)}</td><td className="py-2">{String(u.role)}</td><td className="py-2 uppercase">{String(u.plan)}</td><td className="py-2">{String(u.status)}</td><td className="num py-2 text-right">{profiles.filter(p => p.userId === u.id).length} profile(s)</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
