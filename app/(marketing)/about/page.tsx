export const metadata = { title: 'About' };
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">About TaxOS</h1>
      <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-neutral-600">
        <p>TaxOS is an independent tax calculation, organization, reconciliation and preparation assistant for Indian individual taxpayers.</p>
        <p>We built it because filing season shouldn&apos;t mean reconstructing your own finances from twelve PDFs. TaxOS brings salary, interest, dividends, capital gains and TDS into one organized picture — then shows exactly what you owe, what you&apos;ve paid, what&apos;s missing, and where each item belongs in your return.</p>
        <p>TaxOS is <strong>not</strong> affiliated with, endorsed by, or operated by the Income Tax Department. It does not submit returns. All calculations are estimates based on the information you provide and versioned rules sourced from official documentation.</p>
      </div>
    </div>
  );
}
