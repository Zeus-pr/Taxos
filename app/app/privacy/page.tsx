import Link from 'next/link';
export default function Page() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy & data control</h1>
      <ul className="card space-y-3 p-6 text-sm leading-relaxed text-neutral-600">
        <li>• Your documents and records are visible only to your account.</li>
        <li>• PAN and sensitive identifiers are encrypted at rest; we show them masked.</li>
        <li>• We never ask for Income Tax Department, bank or broker passwords.</li>
        <li>• Deleting a document removes its storage object and derived records.</li>
        <li>• Deleting your account permanently removes all data — no retention without consent.</li>
      </ul>
      <div className="flex gap-3"><Link href="/app/settings" className="btn-primary !py-2 text-sm">Manage my data</Link><Link href="/privacy-policy" className="btn-secondary !py-2 text-sm">Full privacy policy</Link></div>
    </div>
  );
}
