import { z } from 'zod';
import { apiPost, HttpError } from '@/lib/api';
import { getRepo } from '@/lib/db/repo';
import { supportedTaxYears } from '@/modules/tax-engine/rules';

const Schema = z.object({
  section: z.string().min(1).max(30),
  label: z.string().trim().min(1).max(120).optional(),
  amount: z.coerce.number().finite().positive().max(10_000_000),
});
const DeleteSchema = z.object({ section: z.string().min(1).max(30) });

async function profileYear(userId: string) {
  const repo = await getRepo();
  const profiles = await repo.findMany('taxProfile', { userId });
  const profile = profiles.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))[0];
  return { repo, taxYear: String(profile?.taxYear ?? supportedTaxYears().at(-1)) };
}

export const POST = apiPost(Schema, async ({ user }, data) => {
  const { repo, taxYear } = await profileYear(user.id);
  const amountPaise = Math.round(data.amount * 100);
  if (!Number.isSafeInteger(amountPaise)) throw new HttpError(400, 'Enter a valid amount.');
  const existing = await repo.findOne('deduction', { userId: user.id, taxYear, section: data.section });
  const patch = { label: data.label ?? data.section, amountPaise: BigInt(amountPaise) };
  const row = existing
    ? await repo.update('deduction', String(existing.id), patch)
    : await repo.insert('deduction', { userId: user.id, taxYear, section: data.section, ...patch });
  return Response.json({ ok: true, deduction: { id: row?.id, section: data.section, taxYear } });
});

export const DELETE = apiPost(DeleteSchema, async ({ user }, data) => {
  const { repo, taxYear } = await profileYear(user.id);
  await repo.remove('deduction', { userId: user.id, taxYear, section: data.section });
  return Response.json({ ok: true });
});
