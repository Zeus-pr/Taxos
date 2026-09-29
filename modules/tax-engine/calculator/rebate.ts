import type { Paise, TaxRegime } from '../types';
import { REBATE_87A_NEW, REBATE_87A_OLD } from '../rules/2026-27';

/** Section 87A rebate. New regime AY 2027-28: up to ₹60,000 if total income ≤ ₹12,00,000,
 * with marginal relief immediately above that threshold for resident individuals.
 * Old regime: up to ₹12,500 if total income ≤ ₹5,00,000. Rebate only offsets slab-rate tax. */
export function rebate87A(
  regime: TaxRegime,
  qualifyingIncome: Paise,
  slabTaxBeforeRebate: Paise,
  isResident: boolean,
): { rebate: Paise; ruleId: string } {
  const r = regime === 'NEW' ? REBATE_87A_NEW : REBATE_87A_OLD;
  if (!isResident || !r) {
    return { rebate: 0, ruleId: r.meta.ruleId };
  }

  if (qualifyingIncome <= r.maxIncome) {
    return { rebate: Math.min(r.maxRebate, Math.max(0, slabTaxBeforeRebate)), ruleId: r.meta.ruleId };
  }

  // The statutory marginal relief applies to the enhanced new-regime rebate only.
  if (regime === 'NEW') {
    const incomeAboveLimit = qualifyingIncome - r.maxIncome;
    const relief = Math.max(0, slabTaxBeforeRebate - incomeAboveLimit);
    return { rebate: Math.min(r.maxRebate, relief), ruleId: r.meta.ruleId };
  }

  return { rebate: 0, ruleId: r.meta.ruleId };
}
