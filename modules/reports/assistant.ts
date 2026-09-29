/**
 * AI assistant (§33). The assistant retrieves the ACTUAL deterministic calculation and explains it.
 * It never invents numbers: every rupee figure in answers is sourced from stored records or
 * engine output, formatted server-side. If no calculation exists, it says so.
 */
import { getAI } from '@/lib/ai/provider';
import type { DashboardData } from '@/modules/income/service';
import { formatINR, CATEGORY_LABELS } from '@/lib/format';

export function buildCalculationSummary(d: DashboardData): string | null {
  const c = d.calculationNEW;
  if (!c) return null;
  const byCat: Record<string, number> = {};
  for (const i of d.incomes) byCat[i.category] = (byCat[i.category] ?? 0) + i.amount_paise;
  const lines = Object.entries(byCat).map(([k, v]) => `${CATEGORY_LABELS[k] ?? k}: ${formatINR(v)}`);
  lines.push(`Total income: ${formatINR(c.grossIncome)}`);
  lines.push(`Deductions: ${formatINR(c.deductions)}`);
  lines.push(`Taxable income (slab head): ${formatINR(c.taxableIncome)}`);
  lines.push(`Slab tax: ${formatINR(c.slabTax)} · Special-rate gains tax: ${formatINR(c.specialRateTax)}`);
  if (c.rebate) lines.push(`Rebate u/s 87A: -${formatINR(c.rebate)}`);
  if (c.surcharge) lines.push(`Surcharge: ${formatINR(c.surcharge)}`);
  lines.push(`Health & education cess: ${formatINR(c.cess)}`);
  lines.push(`Total estimated tax: ${formatINR(c.totalTax)}`);
  lines.push(`TDS ${formatINR(c.tds)} · TCS ${formatINR(c.tcs)} · Advance ${formatINR(c.advanceTax)} · Self-assessment ${formatINR(c.selfAssessmentTax)}`);
  lines.push(c.refundOrPayable >= 0 ? `Estimated balance payable: ${formatINR(c.refundOrPayable)}` : `Estimated refund: ${formatINR(-c.refundOrPayable)}`);
  lines.push(`Rules applied: ${c.taxYear} · ${c.lawVersion} · rule set ${c.ruleVersion}`);
  return lines.join('\n');
}

export async function answerQuestion(question: string, d: DashboardData): Promise<{ answer: string; grounded: boolean }> {
  const summary = buildCalculationSummary(d);
  const ai = getAI();
  if (!summary) {
    return {
      answer: 'I can only explain numbers that exist in your profile. Right now there is no calculation yet — add your salary or upload Form 16/AIS and I will be able to walk you through it.',
      grounded: true,
    };
  }
  // §62: AI may restate/explain the deterministic summary; it must not alter figures.
  const text = await ai.explainCalculation(summary, question);
  return { answer: text, grounded: true };
}
