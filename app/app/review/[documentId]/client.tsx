'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatINR, CATEGORY_LABELS } from '@/lib/format';
import { StatusPill } from '@/components/ui';

export function ReviewClient({ doc, extractions }: { doc: any; extractions: any[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  async function act(url: string, body: unknown = {}) {
    setBusy(true);
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const res = await r.json(); setBusy(false);
    setMsg(res.ok ? 'Saved.' : res.error ?? 'Something went wrong.');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Link href="/app/documents" className="text-xs text-neutral-500 underline">← Documents</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Review extraction — {doc.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">{String(doc.docType).replace(/_/g, ' ')} · parser v{String(doc.parserVersion ?? '—')} · <StatusPill status={String(doc.status)} /></p>
      </header>
      {msg && <p className="rounded-xl bg-neutral-100 px-4 py-3 text-sm">{msg}</p>}
      {doc.parseError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{String(doc.parseError)}</p>}

      {extractions.length === 0 ? (
        <div className="card space-y-3 p-8 text-center text-sm text-neutral-500">
          <p>No structured values extracted yet.</p>
          <button className="btn-primary mx-auto" disabled={busy} onClick={() => act(`/api/documents/${doc.id}/process`)}>Run processing now</button>
        </div>
      ) : (
        <div className="card overflow-x-auto p-6">
          <table className="w-full min-w-[600px] text-sm">
            <thead><tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400"><th className="pb-2">Item</th><th className="pb-2">Confidence</th><th className="pb-2 text-right">Extracted</th><th className="pb-2 text-right">Corrected</th><th className="pb-2" /></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {extractions.map((e: any) => {
                const low = Number(e.confidence) < 0.9;
                return (
                  <tr key={e.id} className={low ? 'bg-amber-50/50' : ''}>
                    <td className="py-2.5">{CATEGORY_LABELS[e.category] ?? e.category}<br /><span className="text-xs text-neutral-400">{e.fieldPath}</span></td>
                    <td className="num py-2.5">{(Number(e.confidence) * 100).toFixed(0)}%{low && <p className="text-[10px] text-amber-600">Low confidence — please verify</p>}</td>
                    <td className="num py-2.5 text-right">{formatINR(Number(e.valueRupees) * 100)}</td>
                    <td className="py-2.5 text-right">{e.record ? <span className="num">{formatINR(e.record.amount_paise)} {e.record.status === 'USER_CONFIRMED' && <span className="text-emerald-600">✓</span>}</span> : <input className="input num !w-28 !py-1 text-right" placeholder="₹" value={values[e.id] ?? ''} onChange={ev => setValues({ ...values, [e.id]: ev.target.value })} />}</td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      {!e.record && <button className="mr-2 text-xs underline" disabled={busy || !Number(values[e.id])} onClick={() => act('/api/income', { category: e.category, amountRupees: Number(values[e.id]), description: e.fieldPath, documentId: doc.id, source: 'DOCUMENT_EXTRACTED' })}>Accept</button>}
                      {e.record && e.record.status !== 'USER_CONFIRMED' && <button className="text-xs underline" disabled={busy} onClick={() => act(`/api/records/${e.record.id}/confirm`, {})}>Confirm</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-neutral-400">Accepting creates an income record linked to this document — original values are kept for audit.</p>
        </div>
      )}
    </div>
  );
}
