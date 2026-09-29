import { DocumentsClient } from './client';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const { getSessionUser } = await import('@/lib/auth/service');
  const { cookies } = await import('next/headers');
  const user = await getSessionUser((await cookies()).get('taxos_session')?.value);
  if (!user) return null;
  const { getRepo } = await import('@/lib/db/repo');
  const repo = await getRepo();
  const docs = (await repo.findMany('document', { userId: user.id })).filter(d => !d.deletedAt);
  const view = docs.map(d => ({
    id: d.id, name: d.fileName, docType: d.docType, status: d.importStatus,
    sizeBytes: d.sizeBytes, createdAt: d.createdAt, errorNote: d.errorNote,
  }));
  return <DocumentsClient docs={JSON.parse(JSON.stringify(view))} />;
}
