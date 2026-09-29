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
  const [extractions, records] = await Promise.all([
    repo.findMany('documentExtraction', { documentId }),
    repo.findMany('incomeRecord', { userId: user.id, taxYear: doc.taxYear, sourceDocumentId: documentId }),
  ]);
  extractions.sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));
  return <ReviewClient doc={JSON.parse(JSON.stringify(doc))} extractions={JSON.parse(JSON.stringify(extractions))} records={JSON.parse(JSON.stringify(records))} />;
}
