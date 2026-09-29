import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/api';
import { getRepo } from '@/lib/db/repo';
import { getStorage } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Please sign in to continue.' }, { status: 401 });
  const { id } = await context.params;
  const repo = await getRepo();
  const doc = await repo.findOne('document', { id, userId: user.id });
  if (!doc || doc.deletedAt) return NextResponse.json({ ok: false, error: 'Document not found.' }, { status: 404 });
  try {
    const content = await getStorage().get(String(doc.storageKey));
    if (!content) return NextResponse.json({ ok: false, error: 'The stored file could not be found.' }, { status: 404 });
    const name = String(doc.fileName).replace(/[\r\n"\\]/g, '_');
    return new NextResponse(content, {
      headers: {
        'Content-Type': String(doc.mimeType || 'application/octet-stream'),
        'Content-Length': String(content.length),
        'Content-Disposition': `attachment; filename="${name}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Private document storage is not available.' }, { status: 503 });
  }
}
