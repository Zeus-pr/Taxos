/**
 * "Where do I report this?" mapping (§25).
 * Deterministic category → schedule map with required inputs. Language avoids hard claims
 * about the exact ITR form version until one is selected (itrValidation guidance applies).
 */
export interface ReportLocation {
  category: string;
  taxHead: string;
  schedule: string;
  likelyITR: string;
  whatYouNeed: { label: string; haveIt: boolean }[];
  status: 'ready' | 'needs_inputs';
  note: string;
}

export function reportLocation(category: string, opts: { haveDocuments: string[]; confirmed: boolean }): ReportLocation {
  const need = (labels: [string, string][]) => labels.map(([label, doc]) => ({ label, haveIt: opts.haveDocuments.includes(doc) }));
  switch (category) {
    case 'SALARY':
    case 'PENSION':
      return {
        category, taxHead: 'Income from Salary', schedule: 'Schedule S', likelyITR: 'ITR-1 / ITR-2',
        whatYouNeed: need([['Form 16 from employer', 'FORM_16'], ['AIS salary summary', 'AIS']]),
        status: opts.confirmed ? 'ready' : 'needs_inputs',
        note: 'Gross salary, perquisite values and TDS u/s 192 go here.',
      };
    case 'INTEREST_SAVINGS':
    case 'INTEREST_FD':
    case 'OTHER_INTEREST':
      return {
        category, taxHead: 'Income from Other Sources', schedule: 'Schedule OS', likelyITR: 'ITR-1 / ITR-2',
        whatYouNeed: need([['Bank interest certificate', 'BANK_INTEREST_CERT'], ['AIS interest entries', 'AIS']]),
        status: opts.confirmed ? 'ready' : 'needs_inputs',
        note: 'Savings-bank interest may qualify for s.80TTA deduction (₹10,000) under the old regime.',
      };
    case 'DIVIDEND':
      return {
        category, taxHead: 'Income from Other Sources', schedule: 'Schedule OS', likelyITR: 'ITR-1 / ITR-2',
        whatYouNeed: need([['Dividend statement', 'DIVIDEND_STATEMENT'], ['AIS dividend entries', 'AIS']]),
        status: opts.confirmed ? 'ready' : 'needs_inputs',
        note: 'Dividends are taxable at slab rates; TDS u/s 194 may appear in 26AS.',
      };
    case 'HOUSE_PROPERTY':
      return {
        category, taxHead: 'Income from House Property', schedule: 'Schedule HP', likelyITR: 'ITR-1 (one property) / ITR-2',
        whatYouNeed: need([['Home-loan interest certificate', 'HOME_LOAN_INTEREST_CERT'], ['Municipal records', 'OTHER']]),
        status: opts.confirmed ? 'ready' : 'needs_inputs',
        note: 'Annual value less 30% standard deduction and interest u/s 24(b).',
      };
    case 'CAPITAL_GAINS_STCG_111A':
    case 'CAPITAL_GAINS_LTCG_112A':
    case 'CAPITAL_GAINS_LTCG_112':
    case 'CAPITAL_GAINS_SLAB':
      return {
        category, taxHead: 'Capital Gains', schedule: 'Schedule CG', likelyITR: 'ITR-2 (capital gains present)',
        whatYouNeed: need([['Purchase details', 'BROKER_STATEMENT'], ['Sale details', 'CAPITAL_GAINS_STATEMENT'], ['Security/ISIN details', 'BROKER_STATEMENT']]),
        status: opts.confirmed ? 'ready' : 'needs_inputs',
        note: 'Listed-equity STCG u/s 111A and LTCG u/s 112A are reported separately in Schedule CG.',
      };
    case 'FREELANCE':
      return {
        category, taxHead: 'Profits & Gains of Business or Profession', schedule: 'Schedule P&L (ITR-3/4)', likelyITR: 'ITR-3 / ITR-4',
        whatYouNeed: need([['Invoices / receipts', 'OTHER'], ['Expense records', 'OTHER']]),
        status: opts.confirmed ? 'ready' : 'needs_inputs',
        note: 'Presumptive taxation u/s 44AD may apply — review with a professional if turnover is significant.',
      };
    default:
      return {
        category, taxHead: 'Income from Other Sources', schedule: 'Schedule OS', likelyITR: 'ITR-1 / ITR-2',
        whatYouNeed: need([['Supporting document', 'OTHER']]),
        status: opts.confirmed ? 'ready' : 'needs_inputs',
        note: 'Review required before final placement — confirm the nature of this income.',
      };
  }
}
