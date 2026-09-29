'use client';
import { useMemo, useState } from 'react';
import { calculateTax, compareRegimes } from '@/modules/tax-engine/calculator/finalTax';
import { formatINR } from '@/lib/format';

export function CalculatorClient() {
  const [salary, setSalary] = useState(1800000);
  const [other, setOther] = useState(50000);
  const [tds, setTds] = useState(145000);
  const [ded80c, setDed80c] = useState(150000);

  const result = useMemo(() => {
    const req = {
      incomes: [
        { category: 'SALARY' as const, amount: Math.round(salary * 100), description: 'Salary', source: 'MANUAL' },
        ...(other > 0 ? [{ category: 'OTHER_SOURCE' as const, amount: Math.round(other * 100), description: 'Other income', source: 'MANUAL' }] : []),
      ],
      deductions: ded80c > 0 ? [{ section: '80C', label: '80C investments', amount: Math.round(ded80c * 100) }] : [],
      payments: tds > 0 ? [{ type: 'TDS' as const, amount: Math.round(tds * 100), source: 'MANUAL' }] : [],
      taxpayer: { age: 30, isResident: true },
    };
    return compareRegimes(req);
  }, [salary, other, tds, ded80c]);

  const field = (label: string, v: number, set: (n: number) => void) => (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input num" type="number" min={0} value={v} onChange={e => set(Math.max(0, Number(e.target.value) || 0))} />
    </label>
  );

  const col = (name: string, c: ReturnType<typeof calculateTax>) => (
    <div className="card p-6">
      <p className="text-sm font-semibold">{name}</p>
      <p className="num mt-3 text-2xl font-semibold">{formatINR(c.totalTax)}</p>
      <p className="text-xs text-neutral-500">estimated tax</p>
      <dl className="mt-4 space-y-1.5 border-t border-neutral-100 pt-4 text-sm">
        {[['Gross income', c.grossIncome], ['Deductions', c.deductions], ['Taxable income', c.taxableIncome], ['Rebate u/s 87A', -c.rebate], ['Cess', c.cess], ['Credits (TDS etc.)', -(c.tds + c.tcs + c.advanceTax + c.selfAssessmentTax)]].map(([k, v]) => (
          <div key={k as string} className="flex justify-between"><dt className="text-neutral-500">{k}</dt><dd className="num">{formatINR(v as number)}</dd></div>
        ))}
        <div className="flex justify-between border-t border-neutral-100 pt-2 font-semibold"><dt>{c.refundOrPayable >= 0 ? 'Balance payable' : 'Refund'}</dt><dd className="num">{formatINR(Math.abs(c.refundOrPayable))}</dd></div>
      </dl>
    </div>
  );

  return (
    <div className="mt-10 space-y-8">
      <div className="card grid gap-5 p-6 sm:grid-cols-2">
        {field('Annual salary (₹)', salary, setSalary)}
        {field('Other income (₹)', other, setOther)}
        {field('TDS already deducted (₹)', tds, setTds)}
        {field('Old regime: 80C investments (₹)', ded80c, setDed80c)}
      </div>
      <div className="grid gap-6 md:grid-cols-2">{col('New regime', result.new)}{col('Old regime', result.old)}</div>
      <p className="rounded-xl bg-neutral-100 p-4 text-sm text-neutral-700">Difference: {formatINR(Math.abs(result.difference))} — {result.explanation}</p>
      <p className="text-xs text-neutral-400">Estimate only. Verify against official tax records before making any payment.</p>
    </div>
  );
}
