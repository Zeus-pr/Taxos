import { CalculatorClient } from './client';
export const metadata = { title: 'Income Tax Calculator (AY 2026–27)' };
export default function CalcPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Indian income tax calculator</h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-500">
        Estimate salary tax under both regimes using versioned AY 2026–27 rules (new-regime slabs ₹0–4L nil,
        5/10/15/20/25% bands, 30% above ₹24L; ₹60,000 Section 87A rebate up to ₹12L taxable income).
        Estimates only — not affiliated with the Income Tax Department.
      </p>
      <CalculatorClient />
    </div>
  );
}
