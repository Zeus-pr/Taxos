export const metadata = { title: 'FAQ' };
const QA = [
  ['Does TaxOS file my ITR?', 'No. TaxOS prepares and organizes. You (or your CA) file on the official portal. We show you exactly where each figure goes.'],
  ['Do you need my Income Tax portal password?', 'Never. We don&apos;t ask for it, and we don&apos;t scrape or automate the government portal. You upload your own documents.'],
  ['Where do your tax rules come from?', 'Official Income Tax Department publications and government notifications. Every rule stores its source URL, reference and retrieval date, and rules are versioned per tax year.'],
  ['Is the AI calculating my tax?', 'No. A deterministic, tested tax engine calculates. AI only reads the calculation and explains it in plain language — it cannot invent or override numbers.'],
  ['What if two documents disagree?', 'We show both, flag it as a potential mismatch, and let you resolve it. TaxOS never silently picks a winner or merges records.'],
  ['Are my documents safe?', 'They are validated, scanned, stored in encrypted object storage, and only visible to your account. You can delete any document or your entire account at any time.'],
  ['Is the tax number final?', 'It is an estimate. Your estimate may change when additional income, deductions, transactions or tax information are added. Verify against official records before payment.'],
];
export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">FAQ</h1>
      <div className="mt-12 space-y-6">
        {QA.map(([q, a]) => (
          <details key={q} className="card group p-5">
            <summary className="cursor-pointer list-none text-sm font-medium">{q}</summary>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
