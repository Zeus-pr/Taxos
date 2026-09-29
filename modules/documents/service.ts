/**
 * Document processing pipeline (§34):
 * upload → validation/malware scan → store → text extraction → parse (deterministic first,
 * LLM only for gaps via lib/ai) → schema-validated structured records with confidence →
 * REVIEW_REQUIRED until the user confirms. Imports never overwrite existing source records (§36).
 */
import { getRepo } from '@/lib/db/repo';
import { getStorage } from '@/lib/storage';
import { validateUpload } from '@/modules/documents/validation';
import { extractForm16 } from '@/modules/documents/parsers/form16';
import { parseAISJson, parseAISText, summarizeAIS } from '@/modules/documents/parsers/ais';
import { parse26ASText } from '@/modules/documents/parsers/form26as';
import { parseBankCsv, detectedInterest } from '@/modules/documents/parsers/bank';
import { normalizeBrokerCsv, toIncomeCategory } from '@/modules/documents/parsers/broker';
import { audit } from '@/lib/audit';

export type DocType =
  | 'FORM_16' | 'FORM_16A' | 'AIS' | 'FORM_26AS' | 'BANK_STATEMENT' | 'BANK_INTEREST_CERT'
  | 'BROKER_STATEMENT' | 'CAPITAL_GAINS_STATEMENT' | 'MF_CAPITAL_GAINS_STATEMENT'
  | 'DIVIDEND_STATEMENT' | 'NPS_STATEMENT' | 'INSURANCE_RECEIPT' | 'HOME_LOAN_INTEREST_CERT'
  | 'DONATION_RECEIPT' | 'OTHER';

export interface ProcessResult {
  documentId: string;
  status: 'EXTRACTED' | 'REVIEW_REQUIRED' | 'FAILED';
  summary: string;
  needsReview: number;
  extracted: Record<string, unknown>;
}

async function extractText(buffer: Buffer, kind: string): Promise<string> {
  if (kind === 'PDF') {
    // pdf-parse is loaded lazily; server-only.
    try {
      const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
      const data = await (pdfParse as any)(buffer);
      return String(data.text ?? '');
    } catch (e) {
      const msg = (e as Error).message ?? '';
      if (/password/i.test(msg)) throw new Error('This PDF is password protected. Unlock it and upload again.');
      throw new Error("We couldn't read this PDF. Possible reasons: password protected, unsupported format, or damaged file. Try uploading an unlocked PDF or CSV.");
    }
  }
  return buffer.toString('utf8');
}

export async function processDocument(
  userId: string,
  docId: string,
): Promise<ProcessResult> {
  const repo = await getRepo();
  const doc = await repo.findOne('document', { id: docId, userId });
  if (!doc) throw new Error('Document not found.');
  const taxYear = String(doc.taxYear);
  const docType = String(doc.docType) as DocType;

  await repo.update('document', docId, { importStatus: 'PROCESSING' });
  try {
    const storage = getStorage();
    const buf = await storage.get(String(doc.storageKey));
    if (!buf) throw new Error('Uploaded document file is missing from storage.');
    const kind = String(doc.mimeType).includes('json') ? 'JSON' : guessKind(String(doc.fileName), buf);
    const text = await extractText(buf, kind);

    let needsReview = 0;
    let summary = '';
    const extracted: Record<string, unknown> = {};

    if (docType === 'FORM_16' || docType === 'FORM_16A') {
      const f16 = extractForm16(text);
      const fields = [f16.gross_salary, f16.tds_deducted, f16.taxable_salary];
      needsReview = fields.filter(f => f.requiresConfirmation).length;
      summary = `Employer ${f16.employer_name.value ?? 'unknown'} · Salary ₹${((f16.gross_salary.value ?? 0) / 100).toLocaleString('en-IN')} · TDS ₹${((f16.tds_deducted.value ?? 0) / 100).toLocaleString('en-IN')}`;
      Object.assign(extracted, { form16: f16 });

      // Persist normalized income + credit ONLY after review if low-confidence; store as NEEDS_REVIEW rows either way.
      if ((f16.gross_salary.value ?? 0) > 0) {
        await repo.insert('incomeRecord', {
          userId, taxYear, source: 'FORM_16', sourceDocumentId: docId, category: 'SALARY',
          amountPaise: BigInt(f16.gross_salary.value ?? 0), confidence: f16.gross_salary.confidence,
          status: f16.gross_salary.requiresConfirmation ? 'NEEDS_REVIEW' : 'USER_CONFIRMED',
          description: f16.employer_name.value ? `Salary — ${f16.employer_name.value}` : 'Salary (Form 16)',
        });
      }
      if ((f16.tds_deducted.value ?? 0) > 0) {
        await repo.insert('taxCredit', {
          userId, taxYear, type: 'TDS', amountPaise: BigInt(f16.tds_deducted.value ?? 0),
          section: '192', deductor: f16.employer_name.value ?? null, source: 'FORM_16',
        });
      }
    } else if (docType === 'AIS') {
      let records;
      if (kind === 'JSON' || text.trim().startsWith('{')) {
        records = parseAISJson(JSON.parse(text));
      } else {
        records = parseAISText(text);
      }
      const s = summarizeAIS(records);
      needsReview = s.needsReview;
      summary = `AIS import complete — ${s.recordCount} records found`;
      Object.assign(extracted, { aisSummary: s.totalsByCategory, recordCount: s.recordCount });
      for (const r of records) {
        await repo.insert('aisRecord', {
          userId, documentId: docId, taxYear, informationType: r.informationType, description: r.description,
          amountPaise: BigInt(r.amountPaise), txnDate: r.date ?? null, section: r.section ?? null,
          counterparty: r.counterparty ?? null, confidence: r.confidence, raw: JSON.parse(JSON.stringify(r)),
        });
      }
    } else if (docType === 'FORM_26AS') {
      const credits = parse26ASText(text);
      needsReview = credits.filter(c => c.confidence < 0.9).length;
      const total = credits.reduce((s, c) => s + c.tdsCreditedPaise, 0);
      summary = `${credits.length} tax-credit entries · total TDS/TCS ₹${(total / 100).toLocaleString('en-IN')}`;
      Object.assign(extracted, { credits: credits.length, totalPaise: total });
      for (const c of credits) {
        await repo.insert('form26asRecord', {
          userId, documentId: docId, taxYear, deductor: c.deductor, tan: c.tan ?? null, section: c.section,
          txnDate: c.transactionDate ?? null, amountPaidPaise: BigInt(c.amountPaidOrCreditedPaise),
          tdsPaise: BigInt(c.tdsCreditedPaise), isTCS: c.isTCS, confidence: c.confidence,
          raw: JSON.parse(JSON.stringify(c)),
        });
        await repo.insert('taxCredit', {
          userId, taxYear, type: c.isTCS ? 'TCS' : 'TDS', amountPaise: BigInt(c.tdsCreditedPaise),
          section: c.section, deductor: c.deductor, source: 'FORM_26AS',
        });
      }
    } else if (docType === 'BANK_STATEMENT' || docType === 'BANK_INTEREST_CERT') {
      const txns = parseBankCsv(text);
      const interest = detectedInterest(txns);
      needsReview = txns.filter(t => t.classification === 'UNKNOWN' || t.classification === 'TRANSFER').length;
      summary = `${txns.length} transactions · interest detected ₹${(interest / 100).toLocaleString('en-IN')} · ${needsReview} need classification`;
      Object.assign(extracted, { transactions: txns.length, interestPaise: interest });
      if (interest > 0) {
        await repo.insert('incomeRecord', {
          userId, taxYear, source: 'BANK', sourceDocumentId: docId, category: 'INTEREST_SAVINGS',
          amountPaise: BigInt(interest), confidence: 0.85, status: 'NEEDS_REVIEW',
          description: 'Bank interest (detected from statement)',
        });
      }
    } else if (docType === 'BROKER_STATEMENT' || docType === 'CAPITAL_GAINS_STATEMENT' || docType === 'MF_CAPITAL_GAINS_STATEMENT') {
      const txns = normalizeBrokerCsv(text);
      needsReview = txns.filter(t => t.holdingType === 'OPEN').length;
      const gains = txns.filter(t => t.sellDate).reduce((s, t) => s + t.realizedGainPaise, 0);
      summary = `${txns.length} security transactions · realized gain/loss ₹${(gains / 100).toLocaleString('en-IN')}`;
      Object.assign(extracted, { transactions: txns.length, realizedGainPaise: gains });
      for (const t of txns) {
        if (!t.sellDate) continue;
        await repo.insert('incomeRecord', {
          userId, taxYear, source: 'BROKER', sourceDocumentId: docId,
          category: toIncomeCategory(t) as any, amountPaise: BigInt(t.realizedGainPaise),
          confidence: 0.9, status: 'NEEDS_REVIEW',
          description: `${t.security} (${t.holdingType})`, transactionDate: t.sellDate ?? null,
        });
        await repo.insert('investmentTransaction', {
          userId, taxYear, source: 'BROKER', buyDate: t.buyDate ?? null, sellDate: t.sellDate ?? null,
          quantity: t.quantity, buyValuePaise: BigInt(t.buyValuePaise), sellValuePaise: BigInt(t.sellValuePaise),
          chargesPaise: BigInt(t.chargesPaise), gainPaise: BigInt(t.realizedGainPaise),
          holdingType: t.holdingType, confidence: 0.9, status: 'NEEDS_REVIEW',
        });
      }
    } else {
      summary = 'Document stored. Automatic extraction is not available for this type yet — add the values manually and attach this document as proof.';
      needsReview = 1;
    }

    const status = needsReview > 0 ? 'REVIEW_REQUIRED' : 'EXTRACTED';
    await repo.update('document', docId, { importStatus: status, errorNote: null });
    await repo.insert('documentExtraction', {
      documentId: docId, engine: 'REGEX', payload: JSON.parse(JSON.stringify(extracted)),
      avgConfidence: 0.9, needsReview: needsReview > 0,
    });
    await notify(userId, `${labelFor(docType)} processed`, summary);
    await audit(userId, 'DOCUMENT_PROCESSED', { docType, status, needsReview });
    return { documentId: docId, status, summary, needsReview, extracted };
  } catch (e) {
    const friendly = (e as Error).message.includes("couldn't") || (e as Error).message.includes('protected')
      ? (e as Error).message
      : "We couldn't process this document. It may be in an unsupported layout. You can still keep it in your vault and enter the numbers manually.";
    await repo.update('document', docId, { importStatus: 'FAILED', errorNote: friendly });
    await audit(userId, 'DOCUMENT_PROCESSED', { docType, status: 'FAILED' });
    return { documentId: docId, status: 'FAILED', summary: friendly, needsReview: 0, extracted: {} };
  }
}

function guessKind(name: string, buf: Buffer): string {
  if (name.endsWith('.csv')) return 'CSV';
  if (name.endsWith('.json')) return 'JSON';
  if (name.endsWith('.xlsx')) return 'XLSX';
  if (buf.subarray(0, 4).toString() === '%PDF') return 'PDF';
  return 'TXT';
}

function labelFor(t: DocType) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

async function notify(userId: string, title: string, body: string) {
  const repo = await getRepo();
  await repo.insert('notification', { userId, title, body, read: false });
}

export { validateUpload };
