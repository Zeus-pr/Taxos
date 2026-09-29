import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/api';
import { processDocument } from '@/modules/documents/service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Please sign in to continue.' }, { status: 401 });
  const { id } = await context.params;
  try {
    const result = await processDocument(user.id, id);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = (error as Error).message;
    const status = message === 'Document not found.' ? 404 : 500;
    return NextResponse.json({ ok: false, error: status === 404 ? message : 'We could not process this document. Please try again.' }, { status });
  }
}
