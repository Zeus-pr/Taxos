import { loadTaxPicture } from '@/modules/income/service';
import { IncomeClient } from './client';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const { getSessionUser } = await import('@/lib/auth/service');
  const { cookies } = await import('next/headers');
  const user = await getSessionUser((await cookies()).get('taxos_session')?.value);
  if (!user) return null;
  const d = await loadTaxPicture(user.id);
  return <IncomeClient data={JSON.parse(JSON.stringify({ incomes: d.incomes, deductions: d.deductions }))} />;
}
