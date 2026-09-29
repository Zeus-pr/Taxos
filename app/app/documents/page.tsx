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
  return <DocumentsClient docs={JSON.parse(JSON.stringify(docs))} />;
}
