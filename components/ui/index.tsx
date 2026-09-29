import Link from 'next/link';

export function Logo({ dark = true }: { dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${dark ? 'text-neutral-900' : 'text-white'}`}>
      <span className={`grid h-7 w-7 place-items-center rounded-lg text-sm font-bold ${dark ? 'bg-[#244d39] text-white' : 'bg-white text-[#244d39]'}`}>T</span>
      TaxOS
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    MATCHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    USER_CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    EXTRACTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CONFLICT: 'bg-red-50 text-red-700 border-red-200',
    DUPLICATE: 'bg-amber-50 text-amber-700 border-amber-200',
    NEEDS_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
    REVIEW_REQUIRED: 'bg-amber-50 text-amber-700 border-amber-200',
    PROCESSING: 'bg-sky-50 text-sky-700 border-sky-200',
    MISSING: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    FAILED: 'bg-red-50 text-red-700 border-red-200',
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${map[status] ?? map.MISSING}`}>{status.replace(/_/g, ' ')}</span>;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#e9eee6]">
      <div className="h-full rounded-full bg-[#63916b] transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-neutral-500">{children}</p>;
}

export function EmptyState({ title, body, cta, href }: { title: string; body: string; cta?: string; href?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-sm text-neutral-500">{body}</p>
      {cta && href && <Link href={href} className="btn-secondary mt-2">{cta}</Link>}
    </div>
  );
}
