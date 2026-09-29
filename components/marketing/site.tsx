import Link from 'next/link';
import { Logo } from '@/components/ui';

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-500">
            TaxOS provides informational calculations, organization and preparation assistance. It is not the
            Income Tax Department and does not constitute legal, tax or financial advice.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-medium">Product</p>
          <ul className="space-y-2 text-neutral-500">
            <li><Link className="hover:text-neutral-900" href="/how-it-works">How it works</Link></li>
            <li><Link className="hover:text-neutral-900" href="/pricing">Pricing</Link></li>
            <li><Link className="hover:text-neutral-900" href="/income-tax-calculator">Tax calculator</Link></li>
            <li><Link className="hover:text-neutral-900" href="/security">Security</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-medium">Company</p>
          <ul className="space-y-2 text-neutral-500">
            <li><Link className="hover:text-neutral-900" href="/about">About</Link></li>
            <li><Link className="hover:text-neutral-900" href="/faq">FAQ</Link></li>
            <li><Link className="hover:text-neutral-900" href="/terms">Terms</Link></li>
            <li><Link className="hover:text-neutral-900" href="/privacy-policy">Privacy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-100 py-6 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} TaxOS · Estimates only — verify against official tax records before making any payment.
      </div>
    </footer>
  );
}
