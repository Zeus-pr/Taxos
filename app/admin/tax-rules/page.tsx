import { getRules, supportedTaxYears } from '@/modules/tax-engine/rules';
import type { SlabRule } from '@/modules/tax-engine/types';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year } = await searchParams;
  const taxYear = year ?? '2026-27';
  const rules = getRules(taxYear);
  const slabs = rules.SLAB_TABLES as SlabRule[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Rule bundles (read-only)</h1>
        <p className="mt-1 text-xs text-neutral-500">Law version {String(rules.LAW_VERSION)}. Rules are code-versioned per tax year with official provenance — never edited at runtime.</p>
      </div>
      <div className="flex gap-2 text-xs">{supportedTaxYears().map(ty => <a key={ty} href={`/admin/tax-rules?year=${ty}`} className={`rounded-full border px-3 py-1 ${ty === taxYear ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white'}`}>FY {ty}</a>)}</div>
      <div className="card overflow-x-auto p-6">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-neutral-400"><th className="pb-2">Rule ID</th><th className="pb-2">Regime</th><th className="pb-2">Band / rate</th><th className="pb-2">Source</th><th className="pb-2">Retrieved</th></tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {slabs.flatMap(slab => slab.bands.map((band, index) => {
              const upper = band.upTo === Infinity ? 'above previous band' : `up to ₹${(band.upTo / 100).toLocaleString('en-IN')}`;
              return <tr key={`${slab.meta.ruleId}-${index}`}>
                <td className="py-2">{slab.meta.ruleId}</td>
                <td className="py-2">{slab.regime} · {slab.ageBand.toLowerCase().replace('_', ' ')}</td>
                <td className="py-2">{upper} · {(band.rate * 100).toFixed(0)}%</td>
                <td className="py-2 text-xs text-neutral-500">{slab.meta.sourceReference} · <a className="underline" href={slab.meta.sourceUrl}>{new URL(slab.meta.sourceUrl).hostname}</a></td>
                <td className="py-2 text-xs">{slab.meta.retrievedOn}</td>
              </tr>;
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
