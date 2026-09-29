import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Banknote, CalendarDays,
  ChevronDown, CircleHelp, FileCheck2, FileText, Landmark, ShieldCheck,
  Sparkles, TriangleAlert, WalletCards,
} from 'lucide-react';
import { loadTaxPicture } from '@/modules/income/service';
import { buildChecklist } from '@/modules/itr-engine/checklist';
import { formatINR, CATEGORY_LABELS } from '@/lib/format';
import { ProgressBar, Disclaimer } from '@/components/ui';

export const dynamic = 'force-dynamic';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default async function OverviewPage() {
  const { getSessionUser } = await import('@/lib/auth/service');
  const { cookies } = await import('next/headers');
  const user = await getSessionUser((await cookies()).get('taxos_session')?.value);
  if (!user) return null;

  const d = await loadTaxPicture(user.id);
  if (!d.profile?.onboardingComplete) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
        <section className="w-full rounded-[28px] border border-[#e7e8e2] bg-white p-8 text-center shadow-[0_12px_40px_rgba(28,35,26,.06)] sm:p-12">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf4ed] text-[#2f7651]"><Sparkles size={24} /></span>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[.16em] text-[#64816b]">Your tax workspace</p>
          <h1 className="mx-auto mt-3 max-w-xl text-3xl font-semibold tracking-[-.04em] text-[#1d2a22]">Let’s bring your tax picture together.</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#758078]">A few details help TaxOS organize your income and prepare an estimate around your tax year.</p>
          <Link href="/app/onboarding" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#244d39] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1c3f2e]">Set up my tax profile <ArrowRight size={16} /></Link>
        </section>
      </div>
    );
  }

  const calc = d.profile.regime === 'OLD' ? d.calculationOLD : d.calculationNEW;
  const attention = d.reconGroups.filter(g => g.status === 'CONFLICT' || g.status === 'DUPLICATE' || g.status === 'NEEDS_REVIEW').slice(0, 3);
  const checklist = await buildChecklist(user.id, d.profile.taxYear);
  const totalIncome = d.incomes.reduce((s, i) => s + Math.max(0, i.amount_paise), 0);
  const paid = calc ? calc.tds + calc.tcs + calc.advanceTax + calc.selfAssessmentTax : 0;
  const payable = calc?.refundOrPayable ?? 0;
  const incomeGroups = Object.entries(d.incomes.reduce<Record<string, number>>((m, i) => {
    m[i.category] = (m[i.category] ?? 0) + i.amount_paise;
    return m;
  }, {})).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const totalDistribution = incomeGroups.reduce((sum, [, amount]) => sum + Math.abs(amount), 0);
  const userName = d.profile.name?.split(' ')[0] ?? 'there';

  const metrics = [
    { label: 'Total income', value: calc ? formatINR(calc.grossIncome) : '—', sub: `${d.incomes.length} recorded ${d.incomes.length === 1 ? 'item' : 'items'}`, icon: WalletCards, href: '/app/income', accent: 'green' },
    { label: 'Estimated tax', value: calc ? formatINR(calc.totalTax) : '—', sub: `${d.profile.regime === 'NEW' ? 'New' : 'Old'} regime selected`, icon: Landmark, href: '/app/tax', accent: 'lavender' },
    { label: 'Tax already paid', value: calc ? formatINR(paid) : '—', sub: `${d.payments.length} credits and payments`, icon: Banknote, href: '/app/tax', accent: 'blue' },
  ];

  return (
    <div className="mx-auto max-w-[1440px] pb-8">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#7f8b82]"><span>Workspace</span><span className="text-[#c0c7c0]">/</span><span className="text-[#42654e]">Overview</span></div>
          <h1 className="text-[27px] font-semibold tracking-[-.045em] text-[#202c24] sm:text-[32px]">{greeting()}, {userName}</h1>
          <p className="mt-1.5 text-sm text-[#7b867e]">Here’s what’s happening with your taxes.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="hidden items-center gap-2 rounded-xl border border-[#e5e8e2] bg-white px-3.5 py-2.5 text-sm text-[#556259] sm:flex"><CalendarDays size={15} className="text-[#829087]" /> FY {d.profile.taxYear}<ChevronDown size={14} className="ml-1 text-[#89958d]" /></div>
          <Link href="/app/documents" className="inline-flex items-center gap-2 rounded-xl bg-[#244d39] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_5px_rgba(36,77,57,.18)] transition hover:bg-[#1d402f]"><span className="text-base leading-none">+</span> Add documents</Link>
        </div>
      </header>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <div className="relative isolate min-h-[242px] overflow-hidden rounded-[24px] bg-[#183d2c] p-6 text-white shadow-[0_12px_32px_rgba(20,53,38,.12)] sm:p-8">
          <div className="absolute -right-12 -top-28 -z-10 h-[330px] w-[330px] rounded-full border border-white/[.08]" />
          <div className="absolute -right-2 -top-[74px] -z-10 h-[250px] w-[250px] rounded-full border border-white/[.08]" />
          <div className="absolute right-8 top-0 -z-10 h-[170px] w-[170px] rounded-full border border-white/[.08]" />
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] text-[#b4d2be]"><span className="h-1.5 w-1.5 rounded-full bg-[#9fdaae]" /> Your tax snapshot</p>
              <p className="mt-5 text-sm text-[#c5d6ca]">{payable < 0 ? 'Estimated refund' : 'Estimated balance'}</p>
              <p className="mt-1 font-[650] tracking-[-.055em] text-white" style={{ fontSize: 'clamp(2.3rem, 5vw, 3.35rem)' }}>{calc ? formatINR(Math.abs(payable)) : '—'}</p>
              {calc && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs text-[#e1eee4]"><ShieldCheck size={13} /> Based on your recorded information</p>}
              {!calc && <p className="mt-2 text-xs text-[#c5d6ca]">Add income or tax payments to see an estimate.</p>}
            </div>
            <Link href="/app/tax" className="mt-1 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[.08] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/[.14]">View calculation <ArrowUpRight size={14} /></Link>
          </div>
          <div className="mt-7 grid max-w-[620px] grid-cols-2 gap-x-8 gap-y-4 border-t border-white/[.14] pt-5 sm:grid-cols-3">
            <div><p className="text-[11px] text-[#a8c5b1]">Total estimated tax</p><p className="mt-1 text-sm font-semibold text-white">{calc ? formatINR(calc.totalTax) : '—'}</p></div>
            <div><p className="text-[11px] text-[#a8c5b1]">Already paid</p><p className="mt-1 text-sm font-semibold text-white">{calc ? formatINR(paid) : '—'}</p></div>
            <div><p className="text-[11px] text-[#a8c5b1]">Tax year</p><p className="mt-1 text-sm font-semibold text-white">FY {d.profile.taxYear}</p></div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#e7e9e3] bg-white p-6 shadow-[0_3px_12px_rgba(31,42,33,.025)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm font-semibold text-[#26342a]">Tax profile</p><p className="mt-1 text-xs text-[#879188]">A clearer picture starts here</p></div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f0f5ed] text-[#4c7956]"><FileCheck2 size={19} /></span>
          </div>
          <div className="mt-6 flex items-end justify-between"><p className="text-[34px] font-semibold leading-none tracking-[-.05em] text-[#26342a]">{d.completeness}<span className="ml-0.5 text-lg text-[#99a49b]">%</span></p><p className="pb-1 text-xs font-medium text-[#718077]">Complete</p></div>
          <div className="mt-4"><ProgressBar value={d.completeness} /></div>
          <div className="mt-5 flex items-center justify-between border-t border-[#eff0ec] pt-4">
            <p className="text-xs text-[#78847b]">{100 - d.completeness}% left to complete</p>
            <Link href="/app/profile" className="inline-flex items-center gap-1 text-xs font-semibold text-[#326147] hover:text-[#1e432f]">Continue setup <ArrowRight size={13} /></Link>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        {metrics.map(({ label, value, sub, icon: Icon, href, accent }) => (
          <Link key={label} href={href} className="group rounded-[20px] border border-[#e7e9e3] bg-white p-5 shadow-[0_3px_12px_rgba(31,42,33,.025)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(31,42,33,.06)] sm:p-6">
            <div className="flex items-center justify-between"><p className="text-xs font-medium text-[#7d897f]">{label}</p><span className={`grid h-9 w-9 place-items-center rounded-xl ${accent === 'green' ? 'bg-[#eef5ee] text-[#4f7d57]' : accent === 'lavender' ? 'bg-[#f2effa] text-[#7566a2]' : 'bg-[#edf3f7] text-[#5d8098]'}`}><Icon size={17} /></span></div>
            <p className="num mt-4 text-[25px] font-semibold tracking-[-.04em] text-[#28342b]">{value}</p>
            <div className="mt-2 flex items-center justify-between"><p className="text-xs text-[#879188]">{sub}</p><ArrowUpRight size={14} className="text-[#a1aaa3] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#3d6a4b]" /></div>
          </Link>
        ))}
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-[22px] border border-[#e7e9e3] bg-white p-5 shadow-[0_3px_12px_rgba(31,42,33,.025)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-[15px] font-semibold text-[#29362d]">Income breakdown</h2><p className="mt-1 text-xs text-[#8a958d]">Your recorded income for FY {d.profile.taxYear}</p></div>
            <Link href="/app/income" className="inline-flex items-center gap-1 text-xs font-semibold text-[#426b4f] hover:text-[#234831]">View income <ArrowRight size={13} /></Link>
          </div>
          {!incomeGroups.length ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#dfe5dc] bg-[#fafbf8] px-5 py-8 text-center">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white text-[#6c8e73] shadow-sm"><WalletCards size={18} /></span>
              <p className="mt-3 text-sm font-semibold text-[#38473b]">No income added yet</p>
              <p className="mt-1 text-xs text-[#89948a]">Add income manually or bring in a tax document.</p>
              <Link href="/app/income" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#376649]">Add income <ArrowRight size={13} /></Link>
            </div>
          ) : <>
            <div className="mt-6 flex h-2 overflow-hidden rounded-full bg-[#f0f2ed]" aria-label="Income mix">
              {incomeGroups.map(([category, amount], index) => <div key={category} title={CATEGORY_LABELS[category] ?? category} style={{ width: `${Math.max(0, Math.abs(amount) / Math.max(1, totalDistribution) * 100)}%` }} className={`${['bg-[#315f45]', 'bg-[#6f9476]', 'bg-[#a9c3a5]', 'bg-[#d4dfc8]', 'bg-[#bcb3d2]'][index % 5]} first:rounded-l-full last:rounded-r-full`} />)}
            </div>
            <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
              {incomeGroups.slice(0, 6).map(([category, amount], index) => (
                <div key={category} className="flex items-center justify-between gap-4 border-b border-[#f0f1ed] py-3">
                  <div className="flex min-w-0 items-center gap-2.5"><span className={`h-2 w-2 shrink-0 rounded-full ${['bg-[#315f45]', 'bg-[#6f9476]', 'bg-[#a9c3a5]', 'bg-[#d4dfc8]', 'bg-[#bcb3d2]'][index % 5]}`} /><span className="truncate text-xs text-[#68756c]">{CATEGORY_LABELS[category] ?? category}</span></div>
                  <span className="num shrink-0 text-xs font-semibold text-[#39463d]">{formatINR(amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f7f8f4] px-4 py-3"><span className="text-xs font-semibold text-[#58655c]">Total recorded income</span><span className="num text-sm font-semibold text-[#27362b]">{formatINR(totalIncome)}</span></div>
          </>}
        </div>

        <div className="rounded-[22px] border border-[#e7e9e3] bg-white p-5 shadow-[0_3px_12px_rgba(31,42,33,.025)] sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-[15px] font-semibold text-[#29362d]">Needs your attention</h2><p className="mt-1 text-xs text-[#8a958d]">Items that may need a closer look</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fcf3e8] text-[#b17633]"><TriangleAlert size={17} /></span></div>
          {attention.length ? <ul className="mt-5 space-y-2.5">{attention.map((g, index) => {
            const conflict = g.status === 'CONFLICT';
            const duplicate = g.status === 'DUPLICATE';
            return <li key={`${g.category}-${index}`}><Link href="/app/reconciliation" className="group flex items-center gap-3 rounded-xl border border-[#f0eee8] px-3.5 py-3 transition hover:border-[#dedfd6] hover:bg-[#fcfcfa]">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${conflict ? 'bg-[#fff0ed] text-[#bd6655]' : duplicate ? 'bg-[#fff5e7] text-[#b57b36]' : 'bg-[#f5f2e8] text-[#a08744]'}`}>{conflict ? <TriangleAlert size={15} /> : <FileText size={15} />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#435047]">{CATEGORY_LABELS[g.category] ?? g.category}</span><span className="mt-0.5 block text-[11px] text-[#8a958d]">{conflict ? 'Sources do not match' : duplicate ? 'Possible duplicate to review' : 'Review detected information'}</span></span>
              {g.differencePaise ? <span className="num shrink-0 text-[11px] font-semibold text-[#755f3f]">{formatINR(g.differencePaise)}</span> : <ArrowUpRight size={14} className="shrink-0 text-[#9da79f] transition group-hover:text-[#3b6748]" />}
            </Link></li>;
          })}</ul> : <div className="mt-5 rounded-xl bg-[#f3f7f1] px-4 py-5 text-center"><span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-white text-[#5c8a62]"><BadgeCheck size={18} /></span><p className="mt-2 text-xs font-semibold text-[#4d6851]">Nothing needs attention</p><p className="mt-1 text-[11px] text-[#819183]">We’ll flag possible mismatches as you add data.</p></div>}
          <Link href="/app/reconciliation" className="mt-4 flex items-center justify-center gap-1 border-t border-[#f0f1ed] pt-4 text-xs font-semibold text-[#496d52] hover:text-[#234831]">Open reconciliation <ArrowRight size={13} /></Link>
        </div>
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[22px] border border-[#e7e9e3] bg-white p-5 shadow-[0_3px_12px_rgba(31,42,33,.025)] sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-[15px] font-semibold text-[#29362d]">Regime comparison</h2><p className="mt-1 text-xs text-[#8a958d]">Compare estimated tax under each regime</p></div><Link href="/app/tax" className="text-xs font-semibold text-[#426b4f]">Details</Link></div>
          {d.calculationNEW && d.calculationOLD ? <>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[['New regime', d.calculationNEW], ['Old regime', d.calculationOLD]].map(([label, item]) => {
                const c = item as NonNullable<typeof calc>;
                const active = (label === 'New regime' && d.profile?.regime === 'NEW') || (label === 'Old regime' && d.profile?.regime === 'OLD');
                return <div key={label as string} className={`rounded-2xl border p-4 ${active ? 'border-[#afc8b2] bg-[#f5f8f2]' : 'border-[#eceee9] bg-[#fbfcf9]'}`}><div className="flex items-center justify-between"><span className="text-xs font-medium text-[#67736a]">{label as string}</span>{active && <span className="rounded-full bg-[#e5efe3] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#4c7553]">Selected</span>}</div><p className="num mt-3 text-lg font-semibold tracking-[-.03em] text-[#303d33]">{formatINR(c.totalTax)}</p><p className="mt-1 text-[10px] text-[#929c94]">Estimated total tax</p></div>;
              })}
            </div>
            <p className="mt-3 rounded-xl bg-[#f7f8f5] px-3.5 py-2.5 text-xs text-[#69766d]">Difference between estimates <span className="num font-semibold text-[#3b4c3e]">{formatINR(Math.abs(d.calculationNEW.totalTax - d.calculationOLD.totalTax))}</span></p>
          </> : <p className="mt-5 rounded-xl bg-[#f8f9f6] px-4 py-5 text-center text-xs text-[#879188]">Add income or tax payments to compare the two regimes.</p>}
        </div>

        <div className="rounded-[22px] border border-[#e7e9e3] bg-white p-5 shadow-[0_3px_12px_rgba(31,42,33,.025)] sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-[15px] font-semibold text-[#29362d]">ITR preparation</h2><p className="mt-1 text-xs text-[#8a958d]">Your filing checklist, organized</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f2eff9] text-[#76699e]"><FileCheck2 size={17} /></span></div>
          <div className="mt-5 flex items-end justify-between"><p className="text-[26px] font-semibold tracking-[-.04em] text-[#303d33]">{checklist.progress}<span className="ml-0.5 text-sm font-medium text-[#89948c]">% ready</span></p><Link href="/app/checklist" className="inline-flex items-center gap-1 pb-1 text-xs font-semibold text-[#496d52]">View checklist <ArrowRight size={13} /></Link></div>
          <div className="mt-3"><ProgressBar value={checklist.progress} /></div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#f0f1ed] pt-4 text-[11px] text-[#7d897f]"><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#6c9a72]" />{checklist.items.filter(i => i.state === 'done').length} sections ready</span><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#d1a35e]" />{checklist.items.filter(i => i.state !== 'done').length} need information</span></div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e8ebe5] bg-[#f7f8f4] px-4 py-3.5 sm:px-5">
        <p className="flex max-w-3xl items-start gap-2 text-[11px] leading-5 text-[#78847b]"><CircleHelp size={15} className="mt-0.5 shrink-0 text-[#7a907e]" /> Your figures are calculated from the information recorded in your profile. Add documents and resolve any review items to improve your estimate.</p>
        <Link href="/app/documents" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#426b4f] hover:text-[#234831]">Manage documents <ArrowRight size={13} /></Link>
      </div>
      <div className="mt-5"><Disclaimer>TaxOS provides informational calculations, organization and preparation assistance. It is not the Income Tax Department and does not constitute legal, tax or financial advice. Your estimate may change when additional income, deductions, transactions or tax information are added.</Disclaimer></div>
    </div>
  );
}
