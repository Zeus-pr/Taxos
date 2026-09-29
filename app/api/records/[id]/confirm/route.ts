import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiPost, HttpError } from '@/lib/api';
import { audit } from '@/lib/audit';
import { getRepo } from '@/lib/db/repo';

const EmptyBody = z.object({}).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return apiPost(EmptyBody, async ({ user }) => {
    const repo = await getRepo();
    const record = await repo.findOne('incomeRecord', { id, userId: user.id });
    if (!record) throw new HttpError(404, 'Income record not found.');

    await repo.update('incomeRecord', id, { status: 'USER_CONFIRMED' });
    await audit(user.id, 'USER_CORRECTION', { taxYear: String(record.taxYear), category: String(record.category) });
    return Response.json({ ok: true });
  })(request);
}
