import { loadTaxPicture } from '@/modules/income/service';
import { getRepo } from '@/lib/db/repo';
import { formatINR, CATEGORY_LABELS } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { getSessionUser } = await import('@/lib/auth/service');
  const { cookies } = await import('next/headers');
  const user = await getSessionUser((await cookies()).get('taxos_session')?.value);
  if (!user) return null;

  const data = await loadTaxPicture(user.id);
  const taxYear = data.profile?.taxYear ?? '2026-27';
  const repo = await getRepo();
  const [profile, documents] = await Promise.all([
    repo.findOne('taxProfile', { userId: user.id, taxYear }),
    repo.findMany('document', { userId: user.id, taxYear }),
  ]);
  const rows: [string, string][] = [
    ['Name', data.profile?.name ?? '—'],
    ['Residential status', String(profile?.residentialStatus ?? '—').replace(/_/g, ' ')],
    ['Date of birth', data.profile?.dob ? String(data.profile.dob).slice(0, 10) : '—'],
    ['State', data.profile?.state ?? '—'],
    ['Tax year', `FY ${taxYear}`],
    ['Preferred regime', data.profile?.regime ?? '—'],
    ['Profile completeness', `${data.completeness}%`],
    ['Total income (records)', formatINR(data.incomes.reduce((sum, income) => sum + Math.max(0, income.amount_paise), 0))],
    ['Income sources', [...new Set(data.incomes.map(income => CATEGORY_LABELS[income.category] ?? income.category))].join(', ') || 'None recorded'],
    ['Deductions claimed', data.deductions.map(item => `${item.section} ${formatINR(item.amount)}`).join(' · ') || 'None'],
    ['Documents', String(documents.filter(document => !document.deletedAt).length)],
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-end justify-between"><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Tax profile</h1><a href="/app/settings" className="btn-secondary !py-2 text-xs">Edit settings</a></header>
      <div className="card divide-y divide-neutral-100 p-6 text-sm">
        {rows.map(([label, value]) => <div key={label} className="flex justify-between gap-6 py-2.5"><span className="text-neutral-500">{label}</span><span className="num text-right font-medium">{value}</span></div>)}
      </div>
      <p className="text-xs text-neutral-400">Sensitive identity information is not displayed on this overview.</p>
    </div>
  );
}
