import Link from 'next/link';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-neutral-900 p-12 text-white md:flex">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-sm font-bold text-neutral-900">T</span>TaxOS</Link>
        <blockquote className="max-w-sm text-xl font-medium leading-relaxed">“I finally understand my taxes.”<footer className="mt-3 text-sm text-neutral-400">— the feeling we build for.</footer></blockquote>
        <p className="text-xs text-neutral-500">TaxOS is an independent preparation assistant and is not affiliated with the Income Tax Department.</p>
      </div>
      <div className="flex items-center justify-center p-6">{children}</div>
    </div>
  );
}
