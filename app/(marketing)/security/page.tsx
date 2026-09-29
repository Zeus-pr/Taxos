export const metadata = { title: 'Security' };
const ITEMS = [
  ['Encrypted at rest', 'PAN and sensitive identifiers are encrypted (AES-256-GCM) before storage. Documents live in encrypted object storage with signed, expiring download URLs.'],
  ['Secure sessions', 'httpOnly, SameSite session cookies with server-side hashed tokens. Brute-force lockout and rate limiting on every endpoint.'],
  ['Tenant isolation', 'Every query is scoped to your account server-side. Resource IDs from the browser are never trusted.'],
  ['Honest ingestion', 'Files are validated by magic bytes, size-capped, and scanned before processing. Password-protected or malformed files are rejected with clear reasons.'],
  ['Minimal logging', 'Audit logs record actions — never passwords, OTPs, document contents or raw financial values. Analytics events carry no financial data.'],
  ['No portal automation', 'TaxOS never asks for your Income Tax Department password, never scrapes government portals, and does not file returns.'],
];
export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">Security</h1>
      <p className="mt-4 text-neutral-500">This is a financial application. It is treated that way.</p>
      <div className="mt-12 space-y-8">
        {ITEMS.map(([t, d]) => (<div key={t}><p className="font-semibold">{t}</p><p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{d}</p></div>))}
      </div>
    </div>
  );
}
