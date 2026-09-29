import Link from 'next/link';
export const metadata = { title: 'Pricing' };
const PLANS = [
  { name: 'Free', price: '₹0', features: ['Tax calculator', 'Manual income entry', 'Old vs new regime comparison', 'Basic dashboard', '1 tax year · 3 documents'], cta: 'Start free' },
  { name: 'TaxOS Plus', price: '₹99/year', features: ['Document uploads', 'Form 16 extraction', 'AIS import', '26AS import', 'Automatic reconciliation', 'Investment statements', 'Tax checklist', 'Downloadable tax report'], cta: 'Choose Plus', highlight: true },
  { name: 'TaxOS Pro', price: '₹199/year', features: ['Everything in Plus', 'Advanced capital gains', 'Multiple tax years', 'Advanced document reconciliation', 'Tax projections', 'Advanced scenarios'], cta: 'Choose Pro' },
];
export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <h1 className="text-center text-4xl font-semibold tracking-tight">Simple annual pricing</h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-neutral-500">Tax is seasonal — so are we. No monthly traps.</p>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {PLANS.map(p => (
          <div key={p.name} className={`card flex flex-col p-8 ${p.highlight ? 'ring-2 ring-neutral-900' : ''}`}>
            <p className="font-semibold">{p.name}</p>
            <p className="num mt-3 text-3xl font-semibold">{p.price}</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-neutral-600">
              {p.features.map(f => <li key={f} className="flex gap-2"><span className="text-emerald-600">✓</span>{f}</li>)}
            </ul>
            <Link href="/auth/signup" className={`${p.highlight ? 'btn-primary' : 'btn-secondary'} mt-8`}>{p.cta}</Link>
          </div>
        ))}
      </div>
      <p className="mt-10 text-center text-xs text-neutral-400">Limits are enforced server-side. Cancel anytime.</p>
    </div>
  );
}
