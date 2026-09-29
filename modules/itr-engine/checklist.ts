/**
 * ITR Checklist generator (§27) — deterministic, based on the actual state of the user's data.
 */
import { getRepo } from '@/lib/db/repo';

export interface ChecklistItem { key: string; label: string; state: 'done' | 'warn' | 'todo'; hint?: string }

export async function buildChecklist(userId: string, taxYear: string): Promise<{ items: ChecklistItem[]; progress: number }> {
  const repo = await getRepo();
  const profile = await repo.findOne('taxProfile', { userId, taxYear });
  const incomes = await repo.findMany('incomeRecord', { userId, taxYear });
  const credits = await repo.findMany('taxCredit', { userId, taxYear });
  const deds = await repo.findMany('deduction', { userId, taxYear });
  const docs = (await repo.findMany('document', { userId, taxYear })).filter(d => !d.deletedAt);
  const cats = new Set(incomes.map(i => String(i.category)));

  const items: ChecklistItem[] = [];
  items.push(profile?.onboardingComplete
    ? { key: 'personal', label: 'Personal details', state: 'done' }
    : { key: 'personal', label: 'Personal details', state: 'warn', hint: 'Finish your profile in Settings.' });

  items.push(cats.has('SALARY')
    ? { key: 'salary', label: 'Salary income', state: 'done' }
    : { key: 'salary', label: 'Salary income', state: 'todo', hint: 'Add your salary or upload Form 16.' });

  const hasF16 = docs.some(d => d.docType === 'FORM_16' && d.importStatus !== 'FAILED');
  items.push(hasF16
    ? { key: 'form16', label: 'Form 16', state: 'done' }
    : { key: 'form16', label: 'Form 16', state: 'todo', hint: 'Upload Form 16 from your employer.' });

  items.push(credits.length > 0
    ? { key: 'tds', label: 'TDS / tax credits', state: 'done' }
    : { key: 'tds', label: 'TDS / tax credits', state: 'warn', hint: 'Upload 26AS so we can match TDS.' });

  const interestLike = [...cats].some(c => c.startsWith('INTEREST'));
  items.push(interestLike
    ? { key: 'interest', label: 'Bank interest', state: 'done' }
    : { key: 'interest', label: 'Bank interest', state: 'todo', hint: 'Did you earn savings/FD interest? Add it or upload a statement.' });

  if ([...cats].some(c => c.startsWith('CAPITAL_GAINS'))) {
    const cgDocs = docs.filter(d => ['BROKER_STATEMENT', 'CAPITAL_GAINS_STATEMENT', 'MF_CAPITAL_GAINS_STATEMENT'].includes(String(d.docType)));
    items.push(cgDocs.length
      ? { key: 'cg', label: 'Capital gains', state: 'done' }
      : { key: 'cg', label: 'Capital gains', state: 'warn', hint: 'Upload your capital-gains statement to verify lots and dates.' });
  } else {
    items.push({ key: 'cg', label: 'Capital gains', state: 'todo', hint: 'No sale transactions detected yet.' });
  }

  items.push(deds.length
    ? { key: 'deductions', label: 'Deduction details', state: 'done' }
    : { key: 'deductions', label: 'Deduction details', state: 'warn', hint: 'Confirm NPS, insurance, home-loan and donation details (old regime).' });

  items.push(docs.some(d => d.docType === 'AIS')
    ? { key: 'ais', label: 'AIS reconciled', state: 'done' }
    : { key: 'ais', label: 'AIS import', state: 'todo', hint: 'Download AIS from the Income Tax portal and upload it here.' });

  items.push({ key: 'bank', label: 'Bank account details', state: 'todo', hint: 'Verify accounts for refund credit before filing.' });

  const done = items.filter(i => i.state === 'done').length;
  return { items, progress: Math.round((done / items.length) * 100) };
}
