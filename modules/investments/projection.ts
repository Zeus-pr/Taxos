/**
 * Tax projection & "what-if" scenarios (§31/§32).
 * Reuses the deterministic engine — simulations are labeled and never stored as actuals.
 */
import { calculateTax, compareRegimes, type CalcRequest } from '@/modules/tax-engine/calculator/finalTax';
import type { IncomeInput, DeductionInput, TaxPaymentInput, TaxRegime } from '@/modules/tax-engine/types';

export interface ScenarioInputs {
  expectedSalaryPaise: number;
  expectedBonusPaise: number;
  expectedInterestPaise: number;
  expectedDividendPaise: number;
  expectedCapitalGainsPaise: number;   // treated as listed-equity LTCG 112A bucket for simulation
  existingDeductions: DeductionInput[];
  paymentsMade: TaxPaymentInput[];
  age: number;
}

export function runProjection(i: ScenarioInputs) {
  const incomes: IncomeInput[] = [];
  if (i.expectedSalaryPaise) incomes.push({ category: 'SALARY', amount: i.expectedSalaryPaise, description: 'Expected salary', source: 'SIMULATION' });
  if (i.expectedBonusPaise) incomes.push({ category: 'SALARY', amount: i.expectedBonusPaise, description: 'Expected bonus', source: 'SIMULATION' });
  if (i.expectedInterestPaise) incomes.push({ category: 'INTEREST_FD', amount: i.expectedInterestPaise, description: 'Expected interest', source: 'SIMULATION' });
  if (i.expectedDividendPaise) incomes.push({ category: 'DIVIDEND', amount: i.expectedDividendPaise, description: 'Expected dividends', source: 'SIMULATION' });
  if (i.expectedCapitalGainsPaise) incomes.push({ category: 'CAPITAL_GAINS_LTCG_112A', amount: i.expectedCapitalGainsPaise, description: 'Expected capital gains', source: 'SIMULATION' });

  const req: Omit<CalcRequest, 'regime'> = {
    incomes, deductions: i.existingDeductions, payments: i.paymentsMade,
    taxpayer: { age: i.age, isResident: true },
  };
  const NEW = calculateTax({ ...req, regime: 'NEW' as TaxRegime });
  const OLD = calculateTax({ ...req, regime: 'OLD' as TaxRegime });
  return {
    simulation: true,
    disclaimer: 'Simulation — not your actual tax position. Based on figures you entered; actual results depend on final documents and rules.',
    newRegime: { totalTax: NEW.totalTax, balance: NEW.refundOrPayable },
    oldRegime: { totalTax: OLD.totalTax, balance: OLD.refundOrPayable },
    calculationNEW: NEW,
    calculationOLD: OLD,
  };
}

export function whatIfDelta(base: ReturnType<typeof runProjection>, modified: ReturnType<typeof runProjection>) {
  return {
    newRegimeTaxChange: modified.newRegime.totalTax - base.newRegime.totalTax,
    oldRegimeTaxChange: modified.oldRegime.totalTax - base.oldRegime.totalTax,
    note: 'Simulation — not your actual tax position.',
  };
}
