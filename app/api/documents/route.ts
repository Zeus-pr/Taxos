import { del, get } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { currentUser } from '@/lib/api';
import { getRepo } from '@/lib/db/repo';
import { MAX_FILE_BYTES, validateUpload } from '@/modules/documents/validation';

export const runtime = 'nodejs';

const ALLOWED_CONTENT_TYPES = [
  'application/pdf', 'text/csv', 'application/csv', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/json', 'text/plain', 'text/html', 'application/octet-stream',
];

type UploadMetadata = { userId: string; taxYear: string; fileName: string };

function safeName(value: unknown): string {
  return String(value ?? 'document').replace(/[\\/\0\r\n]/g, '_').trim().slice(-180) || 'document';
}

function docTypeFor(fileName: string): string {
  const name = fileName.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  if (/form 16 a|form16a/.test(name)) return 'FORM_16A';
  if (/form 16|form16/.test(name)) return 'FORM_16';
  if (/26 as|26as/.test(name)) return 'FORM_26AS';
  if (/ais|annual information/.test(name)) return 'AIS';
  if (/bank/.test(name) && /interest/.test(name)) return 'BANK_INTEREST_CERT';
  if (/bank|statement/.test(name) && /csv|xls/.test(name)) return 'BANK_STATEMENT';
  if (/broker/.test(name)) return 'BROKER_STATEMENT';
  if (/capital gains/.test(name)) return 'CAPITAL_GAINS_STATEMENT';
  if (/mutual fund|mf/.test(name)) return 'MF_CAPITAL_GAINS_STATEMENT';
  if (/dividend/.test(name)) return 'DIVIDEND_STATEMENT';
  if (/nps/.test(name)) return 'NPS_STATEMENT';
  if (/insurance/.test(name)) return 'INSURANCE_RECEIPT';
  if (/home loan/.test(name)) return 'HOME_LOAN_INTEREST_CERT';
  if (/donation/.test(name)) return 'DONATION_RECEIPT';
  return 'OTHER';
}

function inferredMime(kind: string): string {
  switch (kind) {
    case 'PDF': return 'application/pdf';
    case 'CSV': return 'text/csv';
    case 'XLSX': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'JSON': return 'application/json';
    case 'HTML': return 'text/html';
    default: return 'text/plain';
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, error: 'Private document storage is not connected yet. In Vercel, create a private Blob store for this project and connect it to Production.' }, { status: 503 });
  }

  try {
    const body = await request.json() as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const user = await currentUser(request);
        if (!user) throw new Error('TAXOS_AUTH_REQUIRED');

        let metadata: { fileName?: string; size?: number } = {};
        try { metadata = JSON.parse(clientPayload ?? '{}'); } catch { throw new Error('Invalid upload metadata.'); }
        const fileName = safeName(metadata.fileName);
        if (!Number.isSafeInteger(metadata.size) || Number(metadata.size) <= 0 || Number(metadata.size) > MAX_FILE_BYTES) {
          throw new Error(`Choose a file smaller than ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
        }

        const repo = await getRepo();
        const profiles = await repo.findMany('taxProfile', { userId: user.id });
        const profile = profiles.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))[0];
        if (!profile) throw new Error('Complete your tax profile before uploading documents.');

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id, taxYear: String(profile.taxYear), fileName } satisfies UploadMetadata),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const metadata = JSON.parse(tokenPayload ?? '{}') as UploadMetadata;
        if (!metadata.userId || !metadata.taxYear || !metadata.fileName) throw new Error('Upload metadata was incomplete.');

        const stored = await get(blob.pathname, { access: 'private' });
        if (!stored || stored.statusCode !== 200 || !stored.stream) throw new Error('Uploaded document could not be verified.');
        const chunks: Buffer[] = [];
        let size = 0;
        const reader = stored.stream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          size += value.length;
          if (size > MAX_FILE_BYTES) {
            await reader.cancel();
            await del(blob.pathname);
            throw new Error(`File is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
          }
          chunks.push(Buffer.from(value));
        }
        const buffer = Buffer.concat(chunks);
        const validation = validateUpload({ name: metadata.fileName, size: buffer.length, buffer });
        if (!validation.ok || !validation.kind || !validation.checksum) {
          await del(blob.pathname);
          throw new Error(validation.error ?? 'This file could not be verified.');
        }

        const repo = await getRepo();
        const existing = await repo.findOne('document', { storageKey: blob.pathname });
        if (existing) return; // Vercel retries completion callbacks; do not duplicate rows.
        await repo.insert('document', {
          userId: metadata.userId,
          taxYear: metadata.taxYear,
          docType: docTypeFor(metadata.fileName),
          fileName: metadata.fileName,
          storageKey: blob.pathname,
          mimeType: inferredMime(validation.kind),
          sizeBytes: buffer.length,
          checksum: validation.checksum,
          importStatus: 'UPLOADED',
        });
        await audit(metadata.userId, 'DOCUMENT_UPLOADED', { taxYear: metadata.taxYear, sizeBytes: buffer.length });
      },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = (error as Error).message ?? '';
    const status = message === 'TAXOS_AUTH_REQUIRED' ? 401 : 400;
    return NextResponse.json({ ok: false, error: status === 401 ? 'Please sign in to continue.' : message || 'The upload could not be completed.' }, { status });
  }
}
