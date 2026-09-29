/** Tax profile per tax year (§8 onboarding steps 1–3). PAN encrypted at rest; never returned in plaintext. */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiGet, apiPost } from '@/lib/api';
import { getRepo } from '@/lib/db/repo';
import { encryptString, decryptString, maskPan, PAN_RE } from '@/lib/crypto';
import { supportedTaxYears } from '@/modules/tax-engine/rules';
import { audit } from '@/lib/audit';

const Schema = z.object({
  taxYear: z.enum(supportedTaxYears() as [string, ...string[]]),
  name: z.string().min(1).max(120),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  residentialStatus: z.enum(['RESIDENT', 'NRI', 'ORDINARY_RESIDENT']),
  state: z.string().max(60).optional(),
  pan: z.string().regex(PAN_RE).optional(),
  taxpayerCategory: z.enum(['INDIVIDUAL', 'HUF']).default('INDIVIDUAL'),
  employmentType: z.enum(['SALARIED', 'SELF_EMPLOYED', 'BOTH', 'NONE']).default('SALARIED'),
  isSalaried: z.boolean().default(true),
  isInvestor: z.boolean().default(false),
  hasCapitalGains: z.boolean().default(false),
  ownsProperty: z.boolean().default(false),
  hasFreelance: z.boolean().default(false),
  hasForeignIncome: z.boolean().default(false),
  incomeDiscovery: z.record(z.boolean()).optional(),
  regime: z.enum(['NEW', 'OLD']).default('NEW'),
});

export const GET = apiGet(async ({ user }) => {
  const repo = await getRepo();
  const rows = await repo.findMany('taxProfile', { userId: user.id });
  // Never return ciphertext or plaintext PAN — only a masked hint (§38).
  return NextResponse.json({
    ok: true,
    profiles: rows.map(p => ({
      ...p, panEncrypted: undefined,
      panMasked: p.panEncrypted ? (() => { try { return maskPan(decryptString(String(p.panEncrypted))); } catch { return null; } })() : null,
    })),
    supportedTaxYears: supportedTaxYears(),
  });
});

export const POST = apiPost(Schema, async ({ user }, d) => {
  const repo = await getRepo();
  const existing = await repo.findOne('taxProfile', { userId: user.id, taxYear: d.taxYear });
  const data: Record<string, unknown> = {
    userId: user.id, taxYear: d.taxYear, name: d.name, dob: new Date(d.dob).toISOString(),
    residentialStatus: d.residentialStatus, state: d.state ?? null,
    taxpayerCategory: d.taxpayerCategory, employmentType: d.employmentType,
    isSalaried: d.isSalaried, isInvestor: d.isInvestor, hasCapitalGains: d.hasCapitalGains,
    ownsProperty: d.ownsProperty, hasFreelance: d.hasFreelance, hasForeignIncome: d.hasForeignIncome,
    incomeDiscovery: JSON.parse(JSON.stringify(d.incomeDiscovery ?? {})),
    regime: d.regime, onboardingComplete: true,
  };
  if (d.pan) data.panEncrypted = encryptString(d.pan.toUpperCase());
  const row = existing ? await repo.update('taxProfile', String(existing.id), data) : await repo.insert('taxProfile', data as any);
  await audit(user.id, 'PROFILE_UPDATED', { taxYear: d.taxYear });
  return NextResponse.json({ ok: true, profileId: row?.id });
});
