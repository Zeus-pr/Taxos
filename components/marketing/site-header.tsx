import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

const LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/#dashboard', label: 'Product' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#e8ebe5] bg-white/90 backdrop-blur-xl">
      <div className="relative mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="TaxOS home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#244d39] text-sm font-semibold tracking-tight text-white shadow-[0_3px_8px_rgba(36,77,57,.17)]">T</span>
          <span className="text-[17px] font-semibold tracking-[-.045em] text-[#26342a]">TaxOS</span>
          <span className="rounded-full border border-[#e6eae3] bg-[#f8faf6] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.12em] text-[#7c897e]">Beta</span>
        </Link>

        <nav aria-label="Main navigation" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 lg:flex xl:gap-9">
          {LINKS.map(link => <Link key={link.label} href={link.href} className="whitespace-nowrap text-[13px] font-medium text-[#68756c] transition-colors hover:text-[#27372c]">{link.label}</Link>)}
        </nav>

        <div className="hidden shrink-0 items-center gap-5 lg:flex">
          <Link href="/auth/login" className="text-[13px] font-medium text-[#58655c] transition-colors hover:text-[#203b2a]">Sign in</Link>
          <Link href="/auth/signup" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#244d39] px-4 text-[12px] font-semibold text-white shadow-[0_2px_5px_rgba(36,77,57,.16)] transition-colors hover:bg-[#1d402f]">Build My Tax Profile <ArrowRight size={14} /></Link>
        </div>

        <details className="group relative lg:hidden">
          <summary className="grid h-10 w-10 list-none place-items-center rounded-xl border border-[#e6e9e3] text-[#516056] transition-colors hover:bg-[#f6f8f4] [&::-webkit-details-marker]:hidden" aria-label="Toggle navigation menu">
            <span className="group-open:hidden"><Menu size={19} /></span>
            <span className="hidden group-open:block"><X size={19} /></span>
          </summary>
          <nav aria-label="Mobile navigation" className="absolute right-[-20px] top-[calc(100%+16px)] w-[min(100vw,24rem)] border-y border-[#edf0eb] bg-white px-5 pb-5 pt-3 shadow-[0_16px_30px_rgba(31,42,33,.07)] sm:right-[-32px] lg:hidden">
            <div className="mx-auto flex max-w-[1440px] flex-col">
              {LINKS.map(link => <Link key={link.label} href={link.href} className="border-b border-[#f0f2ee] py-3 text-sm font-medium text-[#536157]">{link.label}</Link>)}
              <div className="mt-4 flex items-center gap-3">
                <Link href="/auth/login" className="flex-1 rounded-xl border border-[#e2e7df] py-2.5 text-center text-sm font-medium text-[#536157]">Sign in</Link>
                <Link href="/auth/signup" className="flex-1 rounded-xl bg-[#244d39] py-2.5 text-center text-sm font-semibold text-white">Build My Tax Profile</Link>
              </div>
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}
