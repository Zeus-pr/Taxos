'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StatusPill } from '@/components/ui';

export function DocumentsClient({ docs }: { docs: any[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true); setMsg(null);
    for (const f of Array.from(files)) {
      const fd = new FormData(); fd.append('file', f); fd.append('name', f.name);
      setProgress(p => ({ ...p, [f.name]: 5 }));
      const r = await fetch('/api/documents', { method: 'POST', body: fd });
      const res = await r.json();
      setProgress(p => ({ ...p, [f.name]: 100 }));
      if (!res.ok) setMsg({ kind: 'err', text: `${f.name}: ${res.error ?? 'Upload failed.'}` });
      else setMsg({ kind: 'ok', text: `${f.name}: ${res.document?.status === 'PROCESSING' ? 'queued for processing' : 'uploaded'} (${res.document?.docType ?? 'type pending'}).` });
    }
    setBusy(false); setTimeout(() => setProgress({}), 800);
    router.refresh();
    if (fileRef.current) fileRef.current.value = '';
  }

  async function process(id: string) {
    setBusy(true);
    const r = await fetch(`/api/documents/${id}/process`, { method: 'POST' });
    const res = await r.json(); setBusy(false);
    setMsg(res.ok ? { kind: 'ok', text: `Processed — ${res.result?.status ?? 'done'}.` } : { kind: 'err', text: res.error ?? 'Processing failed.' });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Documents</h1><p className="mt-1 text-sm text-neutral-500">Form 16 · AIS · 26AS · bank / broker / mutual-fund statements. PDF, CSV, XLSX or JSON up to 20 MB.</p></header>
      {msg && <p role={msg.kind === 'err' ? 'alert' : undefined} className={`rounded-xl px-4 py-3 text-sm ${msg.kind === 'err' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{msg.text}</p>}

      <label className="card flex cursor-pointer flex-col items-center gap-2 border-dashed !border-neutral-300 p-10 text-center hover:border-neutral-900">
        <span className="text-3xl">⬆️</span>
        <span className="text-sm font-medium">{busy ? 'Uploading…' : 'Click to choose files (or drag them here)'}</span>
        <span className="text-xs text-neutral-400">We never ask for portal or bank passwords. Files are validated and scanned before processing.</span>
        <input ref={fileRef} type="file" multiple className="hidden" accept=".pdf,.csv,.xlsx,.json,.txt,.html" onChange={e => upload(e.target.files)} disabled={busy} />
      </label>
      {Object.entries(progress).map(([name, pct]) => (
        <div key={name} className="flex items-center gap-3 text-xs text-neutral-500"><span className="w-40 truncate">{name}</span><div className="h-1.5 flex-1 rounded-full bg-neutral-200"><div className="h-full rounded-full bg-neutral-900 transition-all" style={{ width: `${pct}%` }} /></div><span>{pct}%</span></div>
      ))}

      <section className="card overflow-x-auto p-6">
        <h2 className="mb-4 text-sm font-semibold">Your documents</h2>
        {docs.length === 0 ? <p className="py-6 text-center text-sm text-neutral-500">No documents yet. Upload Form 16 or AIS to begin.</p> : (
          <table className="w-full min-w-[620px] text-sm">
            <thead><tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400"><th className="pb-2">Name</th><th className="pb-2">Detected type</th><th className="pb-2">Status</th><th className="pb-2 text-right">Size</th><th className="pb-2 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {docs.map(d => (
                <tr key={d.id}>
                  <td className="py-2.5">{d.name}<br /><span className="text-xs text-neutral-400">{new Date(String(d.createdAt)).toLocaleDateString('en-IN')}</span></td>
                  <td className="py-2.5 text-neutral-500">{String(d.docType).replace(/_/g, ' ')}</td>
                  <td className="py-2.5"><StatusPill status={String(d.status)} /></td>
                  <td className="num py-2.5 text-right">{(Number(d.sizeBytes) / 1024).toFixed(0)} KB</td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    {(d.status === 'UPLOADED' || d.status === 'FAILED') && <button className="mr-3 text-xs underline" disabled={busy} onClick={() => process(d.id)}>Process</button>}
                    <a className="mr-3 text-xs underline" href={`/api/documents/${d.id}/download`}>Download</a>
                    <Link className="mr-3 text-xs underline" href={`/app/review/${d.id}`}>Review</Link>
                    <button className="text-xs text-red-600 underline" disabled={busy} onClick={async () => { setBusy(true); await fetch(`/api/documents/${d.id}`, { method: 'DELETE' }); setBusy(false); router.refresh(); }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
