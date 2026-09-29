import { z } from 'zod';
import { apiPost } from '@/lib/api';
import { audit } from '@/lib/audit';
import { HttpError } from '@/lib/api';
import { getRepo } from '@/lib/db/repo';
import { supportedTaxYears } from '@/modules/tax-engine/rules';

const Schema = z.object({
  category: z.enum([
    'SALARY', 'PENSION', 'HOUSE_PROPERTY', 'INTEREST_SAVINGS', 'INTEREST_FD', 'DIVIDEND',
    'OTHER_INTEREST', 'CAPITAL_GAINS_STCG_111A', 'CAPITAL_GAINS_LTCG_112A',
    'CAPITAL_GAINS_LTCG_112', 'CAPITAL_GAINS_SLAB', 'OTHER_SOURCE', 'FREELANCE',
  ]),
  amountRupees: z.number().finite().positive().max(1_000_000_000),
  description: z.string().trim().max(240).optional(),
  documentId: z.string().optional(),
  source: z.enum(['MANUAL', 'DOCUMENT_EXTRACTED']).optional(),
});

export const POST = apiPost(Schema, async ({ user }, data) => {
  const repo = await getRepo();
  const profiles = await repo.findMany('taxProfile', { userId: user.id });
  const profile = profiles.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))[0];
  const taxYear = String(profile?.taxYear ?? supportedTaxYears().at(-1));

  if (data.documentId) {
    const document = await repo.findOne('document', { id: data.documentId, userId: user.id });
    if (!document || document.deletedAt) throw new HttpError(404, 'Document not found.');
  }

  const amountPaise = Math.round(data.amountRupees * 100);
  if (!Number.isSafeInteger(amountPaise)) throw new HttpError(400, 'Enter a valid amount.');
  const row = await repo.insert('incomeRecord', {
    userId: user.id,
    taxYear,
    source: data.documentId ? 'DOCUMENT_EXTRACTED' : 'MANUAL',
    sourceDocumentId: data.documentId ?? null,
    category: data.category,
    amountPaise: BigInt(amountPaise),
    currency: 'INR',
    confidence: 1,
    status: 'USER_CONFIRMED',
    description: data.description ?? null,
  });
  await audit(user.id, 'USER_CORRECTION', { taxYear, category: data.category });
  return Response.json({ ok: true, income: { id: row.id, taxYear, category: data.category } });
});
