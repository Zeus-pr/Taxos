export const dynamic = 'force-dynamic';
const EVENTS = [
  { date: 'Apr 1 – Mar 31', title: 'Financial year runs', body: 'All income earned Apr 1 2026 – Mar 31 2027 belongs to FY 2026–27.' },
  { date: 'Jun 15', title: 'Advance tax deadline (self-employed)', body: 'Final advance-tax instalment due to avoid interest u/s 234B/C.' },
  { date: 'Jul 31', title: 'Return due date (non-audit individuals)', body: 'Most ITR-1 / ITR-2 due. This is the Income Tax Department’s calendar, not ours.' },
  { date: 'Oct 31 / Dec 31', title: 'Audit cases & belated filing windows', body: 'Tax audit cases and belated-return windows per official notifications.' },
];
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Filing timeline</h1><p className="mt-1 text-sm text-neutral-500">FY 2026–27 · indicative dates from official Income Tax Department publications.</p></header>
      <ol className="relative ml-3 space-y-6 border-l border-neutral-200 pl-6">
        {EVENTS.map(e => <li key={e.title} className="relative"><span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-neutral-900" /><p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{e.date}</p><p className="mt-0.5 text-sm font-semibold">{e.title}</p><p className="mt-1 text-sm text-neutral-500">{e.body}</p></li>)}
      </ol>
      <p className="text-xs text-neutral-400">Verify exact dates against official government notifications before relying on them.</p>
    </div>
  );
}
