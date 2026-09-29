import { OnboardingClient } from './client';
import { supportedTaxYears } from '@/modules/tax-engine/rules';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const { getSessionUser } = await import('@/lib/auth/service');
  const { cookies } = await import('next/headers');
  const user = await getSessionUser((await cookies()).get('taxos_session')?.value);
  if (!user) return null;
  const { getRepo } = await import('@/lib/db/repo');
  const repo = await getRepo();
  const existing = await repo.findMany('taxProfile', { userId: user.id });
  return <OnboardingClient defaultName={user.name ?? ''} years={supportedTaxYears()} existing={JSON.parse(JSON.stringify(existing.map(e => ({ taxYear: e.taxYear, name: e.name, dob: e.dob, regime: e.regime, state: e.state }))))} />;
}
