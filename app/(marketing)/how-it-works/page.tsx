export const metadata = { title: 'How it works' };
const STEPS = [
  ['Connect your data', 'Upload Form 16, AIS, 26AS, bank / broker / mutual-fund statements — or enter figures manually. We never ask for bank, broker or Income Tax portal passwords.'],
  ['Structured extraction', 'Documents go through validation, malware scanning, text/OCR extraction and schema-checked parsing. Every value carries a confidence score; low-confidence fields always require your confirmation.'],
  ['Reconciliation', 'We compare what you know with what every document reports — matching duplicates across sources and surfacing potential mismatches. Nothing is merged silently.'],
  ['Deterministic calculation', 'A versioned tax engine (rules sourced from official Income Tax Department documentation) calculates both regimes. AI only explains the numbers; it never produces them.'],
  ['Preparation guidance', 'Each item maps to its likely ITR form, schedule and required documents, with a personalized checklist and downloadable summary report. TaxOS does not file returns.'],
];
export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">How TaxOS works</h1>
      <div className="mt-12 space-y-10">
        {STEPS.map(([t, d], i) => (
          <div key={t} className="flex gap-6">
            <span className="num grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-900 text-sm font-semibold text-white">{i + 1}</span>
            <div><p className="font-semibold">{t}</p><p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{d}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}
