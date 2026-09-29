'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatINR, CATEGORY_LABELS, DOC_TYPE_LABELS } from '@/lib/format';
import { StatusPill } from '@/components/ui';

type ReviewField = { path: string; value: unknown; confidence?: number; requiresConfirmation?: boolean };

function flattenPayload(value: unknown, path = ''): ReviewField[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenPayload(item, `${path}[${index + 1}]`));
  }
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    if (Object.hasOwn(item, 'value') && typeof item.confidence === 'number') {
      return [{ path, value: item.value, confidence: item.confidence, requiresConfirmation: Boolean(item.requiresConfirmation) }];
    }
    return Object.entries(item).flatMap(([key, nested]) => flattenPayload(nested, path ? `${path}.${key}` : key));
  }
  return path ? [{ path, value }] : [];
}

function label(path: string) {
  return path.replace(/\[(\d+)\]/g, ' $1').split(/[._]/).filter(Boolean)
    .map(part => part.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, char => char.toUpperCase())).join(' · ');
}

function valueText(path: string, value: unknown) {
  if (value === null || value === undefined || value === '') return 'Not found';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number' && /(paise|salary|tds|amount|interest|gain|dividend)/i.test(path)) return formatINR(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ReviewClient({ doc, extractions, records }: { doc: any; extractions: any[]; records: any[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const latest = extractions.at(-1);
  const fields = flattenPayload(latest?.payload ?? {});

  async function confirm(recordId: string) {
    setBusyId(recordId);
    setMsg(null);
    try {
      const response = await fetch(`/api/records/${recordId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setMsg({ ok: false, text: result.error ?? 'We could not confirm this value. Please retry.' });
        return;
      }
      setMsg({ ok: true, text: 'Value confirmed.' });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: 'We could not reach the server. Please retry.' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Link href="/app/documents" className="text-xs text-neutral-500 underline">← Documents</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Review extraction — {doc.fileName}</h1>
        <p className="mt-1 text-sm text-neutral-500">{DOC_TYPE_LABELS[String(doc.docType)] ?? String(doc.docType).replace(/_/g, ' ')} · <StatusPill status={String(doc.importStatus)} /></p>
      </header>

      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
      {doc.errorNote && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{String(doc.errorNote)}</p>}

      <section className="card space-y-4 p-6">
        <div>
          <h2 className="text-sm font-semibold">Extracted values</h2>
          <p className="mt-1 text-xs text-neutral-500">Check these against your document before relying on them.</p>
        </div>
        {fields.length === 0 ? (
          <p className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">
            {extractions.length === 0 ? 'No structured extraction is available for this document yet.' : 'Processing did not find readable values in this document.'}
          </p>
        ) : (
          <dl className="divide-y divide-neutral-100">
            {fields.map((field, index) => (
              <div key={`${field.path}-${index}`} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <dt className="text-sm text-neutral-600">{label(field.path)}</dt>
                <dd className="text-sm font-medium sm:text-right">
                  <span className={field.requiresConfirmation ? 'text-amber-700' : ''}>{valueText(field.path, field.value)}</span>
                  {field.confidence !== undefined && <span className="ml-2 text-xs font-normal text-neutral-400">{Math.round(field.confidence * 100)}% confidence</span>}
                  {field.requiresConfirmation && <span className="ml-2 text-xs font-normal text-amber-700">Check this value</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="card space-y-4 p-6">
        <div>
          <h2 className="text-sm font-semibold">Income records from this document</h2>
          <p className="mt-1 text-xs text-neutral-500">Confirm records only after checking the amount and category.</p>
        </div>
        {records.length === 0 ? (
          <p className="text-sm text-neutral-500">No income records were created from this document.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {records.map((record: any) => (
              <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{CATEGORY_LABELS[String(record.category)] ?? String(record.category)}</p>
                  <p className="text-xs text-neutral-500">{record.description ?? record.source} · {Math.round(Number(record.confidence ?? 0) * 100)}% confidence</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="num text-sm font-semibold">{formatINR(Number(record.amountPaise))}</span>
                  {record.status === 'USER_CONFIRMED' ? <StatusPill status="USER_CONFIRMED" /> : (
                    <button className="text-xs underline" disabled={busyId !== null} onClick={() => confirm(String(record.id))}>
                      {busyId === record.id ? 'Saving…' : 'Confirm'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
