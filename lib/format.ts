/**
 * TaxOS — shared formatting helpers (Indian numbering system).
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** ₹19,47,700 style (Indian grouping). Accepts paise. */
export function formatINR(paise: number, opts?: { sign?: boolean }): string {
  const rs = paiseToRupees(paise);
  const abs = Math.abs(rs);
  const s = abs.toLocaleString('en-IN', { maximumFractionDigits: abs < 1000 && abs % 1 !== 0 ? 2 : 0 });
  const prefix = rs < 0 ? '-₹' : opts?.sign && rs > 0 ? '+₹' : '₹';
  return `${prefix}${s}`;
}

/** Compact: ₹18.00L / ₹1.2Cr */
export function formatINRCompact(paise: number): string {
  const rs = Math.abs(paiseToRupees(paise));
  const sign = paise < 0 ? '-' : '';
  if (rs >= 1_00_00_000) return `${sign}₹${(rs / 1_00_00_000).toFixed(2)}Cr`;
  if (rs >= 1_00_000) return `${sign}₹${(rs / 1_00_000).toFixed(2)}L`;
  return `${sign}₹${Math.round(rs).toLocaleString('en-IN')}`;
}

export function pct(x: number): string {
  return `${(x * 100).toFixed(0)}%`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  SALARY: 'Salary',
  PENSION: 'Pension',
  HOUSE_PROPERTY: 'House property',
  CAPITAL_GAINS_STCG_111A: 'Equity STCG (111A)',
  CAPITAL_GAINS_LTCG_112A: 'Equity LTCG (112A)',
  CAPITAL_GAINS_STCG_111A_20: 'Other STCG',
  CAPITAL_GAINS_LTCG_112: 'LTCG (112, no indexation)',
  CAPITAL_GAINS_SLAB: 'Gains at slab rates',
  INTEREST_SAVINGS: 'Savings-account interest',
  INTEREST_FD: 'FD/RD interest',
  DIVIDEND: 'Dividends',
  OTHER_INTEREST: 'Other interest',
  OTHER_SOURCE: 'Other income',
  FREELANCE: 'Freelance income',
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  FORM_16: 'Form 16',
  FORM_16A: 'Form 16A',
  AIS: 'AIS',
  FORM_26AS: 'Form 26AS',
  BANK_STATEMENT: 'Bank statement',
  BANK_INTEREST_CERT: 'Bank interest certificate',
  BROKER_STATEMENT: 'Broker statement',
  CAPITAL_GAINS_STATEMENT: 'Capital-gains statement',
  MF_CAPITAL_GAINS_STATEMENT: 'MF capital-gains statement',
  DIVIDEND_STATEMENT: 'Dividend statement',
  NPS_STATEMENT: 'NPS statement',
  INSURANCE_RECEIPT: 'Insurance premium receipt',
  HOME_LOAN_INTEREST: 'Home-loan interest certificate',
  DONATION_RECEIPT: 'Donation receipt',
  OTHER: 'Other document',
};
