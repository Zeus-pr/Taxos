import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth/service';
import Link from 'next/link';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser((await cookies()).get('taxos_session')?.value);
  if (!user || user.role !== 'ADMIN') redirect('/app');
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center gap-6 border-b border-neutral-200 bg-white px-6 text-sm">
        <Link href="/app" className="font-semibold">TaxOS</Link><span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Admin</span>
        <nav className="ml-4 flex gap-4 text-neutral-500">{['users', 'documents', 'extractions', 'tax-rules', 'audit'].map(p => <Link key={p} href={`/admin/${p}`} className="capitalize hover:text-neutral-900">{p.replace('-', ' ')}</Link>)}</nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
