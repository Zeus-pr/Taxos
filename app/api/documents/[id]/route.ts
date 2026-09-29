import { NextRequest, NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { currentUser } from '@/lib/api';
import { getRepo } from '@/lib/db/repo';
import { getStorage } from '@/lib/storage';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Please sign in to continue.' }, { status: 401 });
  const { id } = await context.params;
  const repo = await getRepo();
  const doc = await repo.findOne('document', { id, userId: user.id });
  if (!doc || doc.deletedAt) return NextResponse.json({ ok: false, error: 'Document not found.' }, { status: 404 });
  try {
    await getStorage().delete(String(doc.storageKey));
    await repo.update('document', id, { deletedAt: new Date().toISOString() });
    await audit(user.id, 'DOCUMENT_DELETED', { taxYear: String(doc.taxYear) });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'The document could not be deleted from secure storage.' }, { status: 503 });
  }
}
