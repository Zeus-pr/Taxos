'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Briefcase, Calculator, ChevronRight, CircleHelp, Files, GitCompare,
  LayoutDashboard, ListChecks, LogOut, Settings2, TrendingUp,
  ShieldCheck, Sparkles,
} from 'lucide-react';

const GROUPS = [
  {
    label: 'WORKSPACE',
    links: [
      { href: '/app', label: 'Overview', icon: LayoutDashboard },
      { href: '/app/income', label: 'Income', icon: Briefcase },
      { href: '/app/investments', label: 'Investments', icon: TrendingUp },
      { href: '/app/reconciliation', label: 'Reconciliation', icon: GitCompare },
    ],
  },
  {
    label: 'PREPARE',
    links: [
      { href: '/app/tax', label: 'Tax estimate', icon: Calculator },
      { href: '/app/documents', label: 'Documents', icon: Files },
      { href: '/app/checklist', label: 'ITR checklist', icon: ListChecks },
      { href: '/app/scenarios', label: 'Tax scenarios', icon: Sparkles },
    ],
  },
];

const MOBILE_LINKS = [
  { href: '/app', label: 'Home', icon: LayoutDashboard },
  { href: '/app/income', label: 'Income', icon: Briefcase },
  { href: '/app/tax', label: 'Tax', icon: Calculator },
  { href: '/app/documents', label: 'Files', icon: Files },
  { href: '/app/settings', label: 'More', icon: Settings2 },
];

export function AppNav({ user }: { user: { name: string | null; email: string; role: string } }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const initials = (user.name ?? user.email).split(/[ @]/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-[#e8ebe5] bg-[#fbfcf9] px-4 pb-4 pt-5 md:flex">
        <Link href="/app" className="mb-8 flex items-center gap-2.5 px-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-[#244d39] text-sm font-semibold text-white shadow-[0_3px_7px_rgba(36,77,57,.18)]">T</span>
          <span className="text-[16px] font-semibold tracking-[-.04em] text-[#26352b]">TaxOS</span>
          <span className="ml-auto rounded-full border border-[#e6e9e3] bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.1em] text-[#839087]">Beta</span>
        </Link>

        <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-6">
          {GROUPS.map(group => <div key={group.label}>
            <p className="mb-2 px-2.5 text-[9px] font-semibold tracking-[.16em] text-[#a1aaa2]">{group.label}</p>
            <div className="space-y-1">
              {group.links.map(({ href, label, icon: Icon }) => {
                const active = href === '/app' ? pathname === '/app' : pathname.startsWith(href);
                return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`group flex items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] text-[12px] transition-colors ${active ? 'bg-[#eaf1e9] font-semibold text-[#2e5c3d]' : 'text-[#68756c] hover:bg-[#f1f3ee] hover:text-[#33443a]'}`}>
                  <Icon size={15} strokeWidth={active ? 2.1 : 1.7} className={active ? 'text-[#477452]' : 'text-[#8a958c] group-hover:text-[#607364]'} />
                  <span>{label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#63916b]" />}
                </Link>;
              })}
            </div>
          </div>)}
          <div>
            <p className="mb-2 px-2.5 text-[9px] font-semibold tracking-[.16em] text-[#a1aaa2]">ACCOUNT</p>
            <Link href="/app/settings" className={`group flex items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] text-[12px] transition-colors ${pathname.startsWith('/app/settings') ? 'bg-[#eaf1e9] font-semibold text-[#2e5c3d]' : 'text-[#68756c] hover:bg-[#f1f3ee] hover:text-[#33443a]'}`}>
              <Settings2 size={15} className="text-[#8a958c] group-hover:text-[#607364]" /> Settings
            </Link>
          </div>
        </nav>

        <div className="mb-3 rounded-[14px] border border-[#e5ebe2] bg-[#f2f6ef] p-3.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-[#5b805e] shadow-sm"><ShieldCheck size={15} /></span>
          <p className="mt-2.5 text-[11px] font-semibold text-[#435648]">Your data stays yours</p>
          <p className="mt-1 text-[10px] leading-4 text-[#819084]">TaxOS never asks for your bank or tax portal password.</p>
        </div>
        <Link href="/app/privacy" className="mb-3 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium text-[#758178] hover:bg-[#f1f3ee] hover:text-[#37473c]"><CircleHelp size={14} /> Help & privacy <ChevronRight size={13} className="ml-auto" /></Link>

        <div className="flex items-center gap-2.5 border-t border-[#e8ebe5] px-1 pt-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e7ede4] text-[10px] font-semibold text-[#4e6952]">{initials}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-[#3d4a40]">{user.name ?? 'Your account'}</span><span className="mt-0.5 block truncate text-[10px] text-[#929c94]">{user.email}</span></span>
          <button onClick={signOut} className="rounded-lg p-1.5 text-[#89958c] transition hover:bg-white hover:text-[#455449]" aria-label="Sign out" title="Sign out"><LogOut size={14} /></button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#e8ebe5] bg-[#fbfcf9]/95 px-4 backdrop-blur md:hidden">
        <Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-[#27362c]"><span className="grid h-7 w-7 place-items-center rounded-[9px] bg-[#244d39] text-xs font-semibold text-white">T</span>TaxOS</Link>
        <Link href="/app/settings" className="grid h-8 w-8 place-items-center rounded-full bg-[#e7ede4] text-[10px] font-semibold text-[#4e6952]" aria-label="Account settings">{initials}</Link>
      </header>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 flex h-[62px] items-stretch border-t border-[#e8ebe5] bg-[#fbfcf9]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {MOBILE_LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === '/app' ? pathname === '/app' : pathname.startsWith(href);
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex flex-1 flex-col items-center justify-center gap-1 text-[9px] transition-colors ${active ? 'font-semibold text-[#356346]' : 'text-[#8a958c]'}`}><Icon size={17} strokeWidth={active ? 2.1 : 1.7} />{label}</Link>;
        })}
      </nav>
    </>
  );
}
