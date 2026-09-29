import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth/service';
import { AppNav } from '@/components/app-shell/nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get('taxos_session')?.value;
  const user = await getSessionUser(token);
  if (!user) redirect('/auth/login');
  return (
    <div className="min-h-screen">
      <AppNav user={{ name: user.name, email: user.email, role: user.role }} />
      <main className="px-4 pb-24 pt-5 sm:px-6 md:ml-[248px] md:px-8 md:pb-12 xl:px-10">{children}</main>
    </div>
  );
}
