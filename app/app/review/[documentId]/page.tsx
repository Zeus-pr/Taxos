import { getRepo } from '@/lib/db/repo';
import { ReviewClient } from './client';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ documentId: string }> }) {
  const { getSessionUser } = await import('@/lib/auth/service');
  const { cookies } = await import('next/headers');
  const user = await getSessionUser((await cookies()).get('taxos_session')?.value);
  if (!user) return null;
  const { documentId } = await params;
  const repo = await getRepo();
  // Tenant scoping (§38): document must belong to the session user.
  const doc = await repo.findOne('document', { id: documentId, userId: user.id });
  if (!doc) return <p className="card p-8 text-sm">Document not found.</p>;
  const extractions = await repo.findMany('extraction', { documentId });
  const records = await repo.findMany('incomeRecord', { userId: user.id, taxYear: doc.taxYear ?? undefined });
  const mapped = extractions.map(e => ({ ...e, record: records.find(r => r.documentId === documentId && r.category === e.category) ?? null }));
  return <ReviewClient doc={JSON.parse(JSON.stringify(doc))} extractions={JSON.parse(JSON.stringify(mapped))} />;
}
