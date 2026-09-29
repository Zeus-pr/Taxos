import Link from 'next/link';
import { buildChecklist } from '@/modules/itr-engine/checklist';
import { loadTaxPicture } from '@/modules/income/service';
import { ProgressBar, Disclaimer } from '@/components/ui';

export const dynamic = 'force-dynamic';

const RESOLVE_HREF: Record<string, string> = {
  personal: '/app/profile', salary: '/app/income', form16: '/app/documents',
  tds: '/app/documents', interest: '/app/income', cg: '/app/documents',
  deductions: '/app/income', ais: '/app/documents', bank: '/app/profile',
};

export default async function Page() {
  const { getSessionUser } = await import('@/lib/auth/service');
  const { cookies } = await import('next/headers');
  const user = await getSessionUser((await cookies()).get('taxos_session')?.value);
  if (!user) return null;
  const { getRepo } = await import('@/lib/db/repo');
  const repo = await getRepo();
  const profile = await repo.findOne('taxProfile', { userId: user.id });
  if (!profile) return <p className="card p-8 text-sm"><a href="/app/onboarding" className="underline">Finish onboarding first →</a></p>;

  const taxYear = String(profile.taxYear);
  const [checklist, picture] = await Promise.all([
    buildChecklist(user.id, taxYear),
    loadTaxPicture(user.id, taxYear),
  ]);
  const likelyItr = picture.itr?.likely;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">FY {taxYear}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">ITR preparation checklist</h1>
        <p className="mt-2 text-sm text-neutral-500">Likely form: <span className="font-medium text-neutral-700">{likelyItr?.form ?? 'More information needed'}</span>{likelyItr?.reasons.length ? ` · ${likelyItr.reasons.join('; ')}` : ''}</p>
        <p className="mt-3 text-sm">Readiness: <span className="font-medium">{checklist.progress}%</span></p>
        <div className="mt-2 max-w-xs"><ProgressBar value={checklist.progress} /></div>
      </header>
      <section className="card divide-y divide-neutral-100 p-6">
        {checklist.items.map(item => (
          <div key={item.key} className="flex items-start gap-3 py-3">
            <span aria-label={item.state} className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.state === 'done' ? 'bg-emerald-500' : item.state === 'warn' ? 'bg-amber-400' : 'bg-neutral-300'}`} />
            <div className="flex-1"><p className="text-sm font-medium">{item.label}</p><p className="mt-0.5 text-xs text-neutral-500">{item.hint ?? (item.state === 'done' ? 'Information recorded.' : 'Ready for review.')}</p></div>
            {item.state !== 'done' && <Link href={RESOLVE_HREF[item.key] ?? '/app/documents'} className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs">Resolve</Link>}
          </div>
        ))}
      </section>
      <Disclaimer>Guidance is informational — TaxOS does not file returns. Confirm final form selection and disclosures with the official instructions or a tax professional.</Disclaimer>
    </div>
  );
}
