import { getRepo } from '@/lib/db/repo';
import { SettingsClient } from './client';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const { getSessionUser } = await import('@/lib/auth/service');
  const { cookies } = await import('next/headers');
  const user = await getSessionUser((await cookies()).get('taxos_session')?.value);
  if (!user) return null;
  const repo = await getRepo();
  const profile = await repo.findOne('taxProfile', { userId: user.id });
  return <SettingsClient user={JSON.parse(JSON.stringify({ name: user.name, email: user.email, plan: user.plan, role: user.role }))} profile={profile ? JSON.parse(JSON.stringify({ taxYear: profile.taxYear, regime: profile.regime, panMasked: profile.panMasked ?? null })) : null} />;
}
