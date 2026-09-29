'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { upload as uploadFile } from '@vercel/blob/client';
import { StatusPill } from '@/components/ui';

const SERVER_UPLOAD_LIMIT = 4 * 1024 * 1024;

function uploadThroughServer(file: File, onProgress: (percentage: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData();
    form.set('file', file);
    const request = new XMLHttpRequest();
    request.open('POST', '/api/documents');
    request.withCredentials = true;
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.min(95, Math.round((event.loaded / event.total) * 95)));
    };
    request.onerror = () => reject(new Error('We could not reach the upload server. Check your connection and retry.'));
    request.onload = () => {
      let result: { ok?: boolean; error?: string } = {};
      try { result = JSON.parse(request.responseText); } catch { /* use the generic message below */ }
      if (request.status < 200 || request.status >= 300 || !result.ok) {
        reject(new Error(result.error ?? 'The secure upload could not be completed. Please retry.'));
        return;
      }
      resolve();
    };
    request.send(form);
  });
}

export function DocumentsClient({ docs }: { docs: any[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [progress, setProgress] = useState<Record<string, { name: string; percent: number; state?: 'preparing' | 'uploading' | 'fallback' | 'done' | 'error'; error?: string }>>({});

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true); setMsg(null);
    for (const f of Array.from(files)) {
      const key = `${f.name}-${f.size}-${f.lastModified}`;
      setProgress(p => ({ ...p, [key]: { name: f.name, percent: 0, state: 'preparing' } }));
      try {
        if (f.size === 0) throw new Error('This file is empty.');
        if (f.size > 20 * 1024 * 1024) throw new Error('Choose a file smaller than 20 MB.');
        const contentType = f.type || (f.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
        if (f.size <= SERVER_UPLOAD_LIMIT) {
          await uploadThroughServer(f, percentage => setProgress(p => ({ ...p, [key]: { name: f.name, percent: percentage, state: 'uploading' } })));
        } else {
          await uploadFile(`taxos-documents/${f.name.replace(/[\\/\0\r\n]/g, '_')}`, f, {
            access: 'private',
            handleUploadUrl: '/api/documents',
            clientPayload: JSON.stringify({ fileName: f.name, size: f.size }),
            contentType,
            multipart: f.size > 4 * 1024 * 1024,
            onUploadProgress: ({ percentage }) => setProgress(p => ({ ...p, [key]: { name: f.name, percent: Math.round(percentage), state: 'uploading' } })),
          });
        }
        setProgress(p => ({ ...p, [key]: { name: f.name, percent: 100, state: 'done' } }));
        setMsg({ kind: 'ok', text: `${f.name}: uploaded securely. Select Process to extract its details.` });
      } catch (error) {
        const message = (error as Error).message || 'Upload failed. Please try again.';
        setProgress(p => ({ ...p, [key]: { name: f.name, percent: 0, state: 'error', error: message } }));
        setMsg({ kind: 'err', text: `${f.name}: ${message}` });
      }
    }
    setBusy(false);
    router.refresh();
    if (fileRef.current) fileRef.current.value = '';
  }

  async function process(id: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/documents/${id}/process`, { method: 'POST' });
      const res = await r.json();
      setMsg(r.ok && res.ok ? { kind: 'ok', text: `Processed — ${res.result?.status ?? 'done'}.` } : { kind: 'err', text: res.error ?? 'Processing failed.' });
      if (r.ok && res.ok) router.refresh();
    } catch {
      setMsg({ kind: 'err', text: 'We could not reach the server. Please try processing again.' });
    } finally {
      setBusy(false);
    }
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
      {Object.entries(progress).map(([key, item]) => (
        <div key={key} className={`flex items-center gap-3 text-xs ${item.state === 'error' ? 'text-red-700' : 'text-neutral-500'}`}><span className="w-40 truncate">{item.name}</span><div className="h-1.5 flex-1 rounded-full bg-neutral-200"><div className={`h-full rounded-full transition-all ${item.state === 'error' ? 'bg-red-600' : 'bg-neutral-900'}`} style={{ width: `${item.percent}%` }} /></div><span>{item.state === 'preparing' ? 'Preparing' : item.state === 'error' ? 'Failed' : item.state === 'done' ? 'Uploaded' : `${item.percent}%`}</span>{item.error && <span className="max-w-xs">{item.error}</span>}</div>
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
                    <button className="text-xs text-red-600 underline" disabled={busy} onClick={async () => { setBusy(true); try { const r = await fetch(`/api/documents/${d.id}`, { method: 'DELETE' }); const res = await r.json(); if (!r.ok || !res.ok) setMsg({ kind: 'err', text: res.error ?? 'Could not delete this file.' }); else { setMsg(null); router.refresh(); } } catch { setMsg({ kind: 'err', text: 'We could not reach the server. Please try again.' }); } finally { setBusy(false); } }}>Delete</button>
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
