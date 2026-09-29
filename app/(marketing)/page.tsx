import Link from 'next/link';

// Demo figures are allowed ONLY on the marketing landing page (§6). No fake data after login.
const DEMO = [
  { label: 'TOTAL INCOME', value: '₹19,74,700' },
  { label: 'ESTIMATED TAX', value: '₹1,82,460' },
  { label: 'TAX ALREADY PAID', value: '₹1,45,000' },
  { label: 'ESTIMATED BALANCE', value: '₹37,460' },
];

export default function LandingPage() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 text-center">
        <p className="mx-auto mb-6 inline-flex items-center rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-600">
          For Indian individual taxpayers · FY 2026–27 ready
        </p>
        <h1 className="mx-auto max-w-3xl text-5xl font-semibold tracking-tight md:text-6xl">
          Your entire tax picture.<br />In one place.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-500">
          Bring together salary, investments, interest, dividends, TDS and tax documents. TaxOS organizes
          everything and shows what you owe and what still needs attention.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/auth/signup" className="btn-primary !px-7 !py-3 text-base">Build My Tax Profile</Link>
          <Link href="/how-it-works" className="btn-secondary !px-7 !py-3 text-base">See How It Works</Link>
        </div>

        {/* Hero dashboard visualization (demo data) */}
        <div id="dashboard" className="card mx-auto mt-16 max-w-4xl scroll-mt-24 p-8 text-left">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm font-semibold">FY 2026–27 · Your tax snapshot <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">Demo data</span></p>
            <p className="text-xs text-neutral-400">Tax profile 82% complete</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DEMO.map((d, i) => (
              <div key={d.label} className={`rounded-xl border p-5 ${i === 3 ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white'}`}>
                <p className={`text-[11px] font-medium uppercase tracking-wider ${i === 3 ? 'text-neutral-400' : 'text-neutral-500'}`}>{d.label}</p>
                <p className="num mt-2 text-2xl font-semibold">{d.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">Your income</p>
              {[['Salary', '₹18,00,000'], ['Capital gains', '₹92,000'], ['Interest', '₹42,500'], ['Dividends', '₹8,200']].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-neutral-100 py-2 text-sm"><span className="text-neutral-600">{k}</span><span className="num font-medium">{v}</span></div>
              ))}
            </div>
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">Needs attention</p>
              <div className="space-y-2 text-sm">
                <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">🔴 AIS and bank interest differ — ₹1,600</p>
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">🟡 Capital-gain statement missing</p>
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">🟢 Form 16 TDS matched with AIS</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 border-y border-neutral-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">Five questions. One answer.</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-5">
            {['How much did I earn?', 'How much tax do I owe?', 'How much have I already paid?', 'What is missing or inconsistent?', 'Where exactly does each item go?'].map((q, i) => (
              <div key={q} className="rounded-2xl border border-neutral-200 p-5">
                <p className="num text-sm font-semibold text-neutral-400">0{i + 1}</p>
                <p className="mt-2 text-sm font-medium leading-snug">{q}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-3">
          {[
            { t: 'Automatic tax reconciliation', d: 'We collect what you know, organize what your documents report, compare the two and show what is missing — across AIS, Form 16, 26AS, bank, broker and MF statements.' },
            { t: 'Every number explainable', d: 'A deterministic tax engine calculates; AI only explains. Every figure links to its rule, source document and calculation line. No unexplained tax numbers, ever.' },
            { t: '“Where do I report this?”', d: 'Each income item maps to its likely ITR form, schedule and required documents — so filing day becomes review, not research.' },
          ].map(f => (
            <div key={f.t}>
              <h3 className="text-lg font-semibold tracking-tight">{f.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">{f.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 rounded-3xl bg-neutral-900 p-10 text-center text-white md:p-16">
          <h2 className="text-3xl font-semibold tracking-tight">Understand your taxes today.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-neutral-400">
            TaxOS is a preparation and organization assistant. It does not file returns and is not affiliated with the Income Tax Department.
          </p>
          <Link href="/auth/signup" className="mt-8 inline-flex rounded-xl bg-white px-7 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-100">Build My Tax Profile</Link>
        </div>
      </section>
    </div>
  );
}
