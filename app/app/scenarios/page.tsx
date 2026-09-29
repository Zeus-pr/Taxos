import { loadTaxPicture, ageFromDob } from '@/modules/income/service';
import { calculateTax } from '@/modules/tax-engine/calculator/finalTax';
import type { IncomeInput, TaxPaymentInput } from '@/modules/tax-engine/types';
import { formatINR } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { getSessionUser } = await import('@/lib/auth/service');
  const { cookies } = await import('next/headers');
  const user = await getSessionUser((await cookies()).get('taxos_session')?.value);
  if (!user) return null;

  const data = await loadTaxPicture(user.id);
  if (data.incomes.length === 0) return <div className="mx-auto max-w-3xl space-y-6"><h1 className="text-2xl font-semibold tracking-tight">What-if scenarios</h1><div className="card p-10 text-center text-sm text-neutral-500">Add income first — scenarios recompute your actual data under different assumptions.</div></div>;

  const baseIncomes: IncomeInput[] = data.incomes.filter(i => i.status !== 'EXCLUDED').map(i => ({ category: i.category as IncomeInput['category'], amount: i.amount_paise, description: i.description ?? undefined, source: i.source ?? undefined }));
  const payments: TaxPaymentInput[] = data.payments.map(p => ({ type: p.type, amount: p.amount, source: p.source }));
  const taxpayer = { age: data.profile?.dob ? ageFromDob(data.profile.dob) : 30, isResident: true };
  const run = (extra: number, deduction: number) => calculateTax({
    incomes: [...baseIncomes, ...(extra ? [{ category: 'OTHER_SOURCE' as const, amount: extra, description: 'Scenario addition', source: 'MANUAL' }] : [])],
    deductions: deduction ? [{ section: '80C', label: 'Scenario 80C', amount: deduction }] : [],
    payments, taxpayer, regime: 'OLD',
  });
  const rows = [
    { label: 'Current data · old regime', c: run(0, 0) },
    { label: '+ ₹1,00,000 bonus · old regime', c: run(10000000, 0) },
    { label: '+ ₹1,50,000 into 80C · old regime', c: run(0, 15000000) },
    { label: 'Sell asset · ₹5,00,000 STCG u/s 111A', c: calculateTax({ incomes: [...baseIncomes, { category: 'CAPITAL_GAINS_STCG_111A', amount: 50000000, description: 'Scenario sale', source: 'MANUAL' }], deductions: [], payments, taxpayer, regime: 'OLD' }) },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">What-if scenarios</h1><p className="mt-1 text-sm text-neutral-500">Deterministic recomputation on copies of your data — nothing is saved.</p></header>
      <div className="card overflow-x-auto p-6">
        <table className="w-full min-w-[480px] text-sm">
          <thead><tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400"><th className="pb-2">Scenario</th><th className="pb-2 text-right">Taxable</th><th className="pb-2 text-right">Tax</th><th className="pb-2 text-right">Δ vs current</th></tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map(row => <tr key={row.label}><td className="py-3">{row.label}</td><td className="num py-3 text-right">{formatINR(row.c.taxableIncome)}</td><td className="num py-3 text-right font-medium">{formatINR(row.c.totalTax)}</td><td className="num py-3 text-right text-neutral-500">{formatINR(row.c.totalTax - rows[0].c.totalTax)}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-400">Estimates only. Scenario results are never stored or shown as your actual liability.</p>
    </div>
  );
}
