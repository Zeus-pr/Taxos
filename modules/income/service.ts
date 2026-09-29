/**
 * Server-side aggregation of a user's tax picture (§9–§12, §30).
 * Reads normalized records from the repository and runs the DETERMINISTIC tax engine.
 * No AI is involved in any calculation path.
 */
import { getRepo } from '@/lib/db/repo';
import { calculateTax, compareRegimes, type CalcRequest } from '@/modules/tax-engine/calculator/finalTax';
import { reconcile, type FinancialRecord } from '@/modules/reconciliation';
import { determineLikelyItr } from '@/modules/itr-engine';
import type { ItrInputs } from '@/modules/itr-engine/types';
import type { IncomeInput, DeductionInput, TaxPaymentInput, TaxRegime } from '@/modules/tax-engine/types';

export interface DashboardData {
  profile: { name: string | null; dob: string | null; taxYear: string; regime: TaxRegime; state: string | null; onboardingComplete: boolean } | null;
  incomes: { category: string; amount_paise: number; description: string | null; source: string | null; status: string; id: string }[];
  deductions: DeductionInput[];
  payments: TaxPaymentInput[];
  calculationNEW: ReturnType<typeof calculateTax> | null;
  calculationOLD: ReturnType<typeof calculateTax> | null;
  comparison: ReturnType<typeof compareRegimes> | null;
  reconGroups: ReturnType<typeof reconcile>;
  itr: ReturnType<typeof determineLikelyItr> | null;
  completeness: number; // 0..100 tax-profile completeness
}

const INCOME_TABLES = ['incomeRecord'] as const;

export async function loadTaxPicture(userId: string, taxYear?: string): Promise<DashboardData> {
  const repo = await getRepo();
  const profiles = await repo.findMany('taxProfile', { userId });
  const year = taxYear ?? String(profiles[0]?.taxYear ?? '2026-27');
  const profile = profiles.find(p => p.taxYear === year) ?? null;
  const regime = ((profile?.regime as string) === 'OLD' ? 'OLD' : 'NEW') as TaxRegime;

  const incomeRows = await repo.findMany('incomeRecord', { userId, taxYear: year });
  const incomes: IncomeInput[] = incomeRows.map(r => ({
    category: r.category as IncomeInput['category'],
    amount: Number(r.amountPaise),
    description: (r.description as string) ?? undefined,
    source: (r.source as string) ?? undefined,
  }));

  const dedRows = await repo.findMany('deduction', { userId, taxYear: year });
  const deductions: DeductionInput[] = dedRows.map(r => ({
    section: r.section as string, label: r.label as string, amount: Number(r.amountPaise),
  }));

  // Tax credits (TDS/TCS from 26AS/AIS/manual) + payments (advance/self-assessment).
  const creditRows = await repo.findMany('taxCredit', { userId, taxYear: year });
  const payRows = await repo.findMany('taxPayment', { userId, taxYear: year });
  const payments: TaxPaymentInput[] = [
    ...creditRows.map(r => ({
      type: r.type as 'TDS' | 'TCS', amount: Number(r.amountPaise), source: String(r.source),
    })),
    ...payRows.map(r => ({
      type: r.type as 'ADVANCE_TAX' | 'SELF_ASSESSMENT', amount: Number(r.amountPaise), source: 'CHALLAN',
    })),
  ];

  const age = profile?.dob ? ageFromDob(String(profile.dob)) : 30;
  const req: Omit<CalcRequest, 'regime'> = {
    incomes, deductions, payments,
    taxpayer: { age, isResident: profile?.residentialStatus !== 'NON_RESIDENT' },
  };
  const hasAny = incomes.length > 0 || payments.length > 0;
  const calculationNEW = hasAny ? calculateTax({ ...req, regime: 'NEW' }) : null;
  const calculationOLD = hasAny ? calculateTax({ ...req, regime: 'OLD' }) : null;
  const comparison = hasAny ? compareRegimes(req) : null;

  // Reconciliation across every record we hold for this year (AIS + bank + broker + manual + form16-derived).
  const aisRows = await repo.findMany('aisRecord', { userId, taxYear: year });
  const f26Rows = await repo.findMany('form26asRecord', { userId, taxYear: year });
  const financialRecords: FinancialRecord[] = [
    ...incomeRows.map(r => ({
      id: String(r.id), user_id: userId, tax_year: year,
      source: String(r.source ?? 'MANUAL'), source_record_id: String(r.sourceDocumentId ?? r.id),
      category: String(r.category), amount_paise: Number(r.amountPaise), currency: 'INR',
      transaction_date: (r.transactionDate as string) ?? undefined, confidence: Number(r.confidence ?? 1),
      status: String(r.status ?? 'NEEDS_REVIEW') as FinancialRecord['status'],
    })),
    ...aisRows.map(r => ({
      id: String(r.id), user_id: userId, tax_year: year,
      source: 'AIS', source_record_id: String(r.id),
      category: String(r.informationType), amount_paise: Number(r.amountPaise), currency: 'INR',
      transaction_date: (r.txnDate as string) ?? undefined, confidence: Number(r.confidence ?? 0.95),
      status: 'NEEDS_REVIEW' as FinancialRecord['status'], reference: (r.section as string) ?? undefined,
    })),
    ...f26Rows.map(r => ({
      id: String(r.id), user_id: userId, tax_year: year,
      source: 'FORM_26AS', source_record_id: String(r.id),
      category: r.isTCS ? 'TCS_CREDIT' : 'TDS_CREDIT', amount_paise: Number(r.tdsPaise), currency: 'INR',
      transaction_date: (r.txnDate as string) ?? undefined, confidence: Number(r.confidence ?? 0.98),
      status: 'NEEDS_REVIEW' as FinancialRecord['status'], reference: (r.tan as string) ?? undefined,
    })),
  ];
  const reconGroups = reconcile(financialRecords);

  // Persist reconciliation verdicts (upsert per category) so the Mismatch Center can query them.
  for (const g of reconGroups) {
    const existing = await repo.findOne('reconciliation', { userId, taxYear: year, category: g.category });
    const data = {
      userId, taxYear: year, category: g.category, status: g.status,
      differencePaise: BigInt(g.differencePaise), summary: JSON.parse(JSON.stringify(g.records.map(r => ({ id: r.id, source: r.source, amount_paise: r.amount_paise })))),
    };
    if (existing) await repo.update('reconciliation', String(existing.id), data);
    else await repo.insert('reconciliation', data);
  }

  // ITR eligibility from actual detected categories.
  const cats = new Set(incomeRows.map(r => String(r.category)));
  const itrInputs: ItrInputs = {
    hasSalary: cats.has('SALARY') || cats.has('PENSION'),
    hasCapitalGains: [...cats].some(c => c.startsWith('CAPITAL_GAINS')),
    hasHouseProperty: cats.has('HOUSE_PROPERTY'),
    hasBusinessOrProfession: cats.has('FREELANCE'),
    isDirector: !!(profile?.incomeDiscovery as any)?.isDirector,
    holdsUnlistedShares: !!(profile?.incomeDiscovery as any)?.hasUnlistedShares,
    hasForeignAssetsOrIncome: !!profile?.hasForeignIncome,
    hasMoreThanOneHouseProperty: !!(profile?.incomeDiscovery as any)?.multiProperty,
    totalIncomePaise: incomes.reduce((s, i) => s + Math.max(0, i.amount), 0),
    isResident: req.taxpayer.isResident,
  };
  const itr = hasAny ? determineLikelyItr(itrInputs) : null;

  return {
    profile: profile ? {
      name: (profile.name as string) ?? null,
      dob: (profile.dob as string) ?? null,
      taxYear: year, regime,
      state: (profile.state as string) ?? null,
      onboardingComplete: !!profile.onboardingComplete,
    } : null,
    incomes: incomeRows.map(r => ({
      category: String(r.category), amount_paise: Number(r.amountPaise),
      description: (r.description as string) ?? null, source: (r.source as string) ?? null,
      status: String(r.status ?? 'NEEDS_REVIEW'), id: String(r.id),
    })),
    deductions, payments, calculationNEW, calculationOLD, comparison, reconGroups, itr,
    completeness: computeCompleteness(profile, incomeRows, dedRows, payRows),
  };
}

function computeCompleteness(profile: any, incomes: any[], deds: any[], pays: any[]): number {
  let score = 0;
  if (profile?.onboardingComplete) score += 20;
  if (incomes.some(i => i.category === 'SALARY')) score += 20;
  if (incomes.some(i => String(i.category).startsWith('INTEREST'))) score += 10;
  if (pays.some(p => p.type === 'TDS')) score += 20;
  if (deds.length > 0) score += 10;
  if (incomes.some(i => String(i.category).startsWith('CAPITAL_GAINS'))) score += 10;
  if (profile?.panEncrypted) score += 10;
  return Math.min(100, score);
}

export function ageFromDob(dobIso: string): number {
  const dob = new Date(dobIso);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}
