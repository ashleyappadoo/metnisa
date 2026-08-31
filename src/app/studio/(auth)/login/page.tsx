import Link from "next/link";
import { login } from "./actions";

export default async function StudioLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-black px-5 text-white">
      <section className="w-full max-w-md border border-white/15 p-8 sm:p-10">
        <Link href="/" className="text-xs font-black uppercase tracking-[0.2em]">MET NISA.</Link>
        <p className="mt-12 text-xs font-bold uppercase tracking-[0.22em] text-white/45">Private operating system</p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.04em]">Studio Login</h1>
        {params.error ? <p className="mt-5 border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-100">Unable to sign in. Check your credentials.</p> : null}
        <form action={login} className="mt-8 grid gap-4">
          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/65">Email<input name="email" type="email" required autoComplete="email" className="border border-white/20 bg-transparent px-4 py-3 text-base font-normal tracking-normal outline-none focus:border-white" /></label>
          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/65">Password<input name="password" type="password" required autoComplete="current-password" className="border border-white/20 bg-transparent px-4 py-3 text-base font-normal tracking-normal outline-none focus:border-white" /></label>
          <button className="mt-2 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-black">Enter Studio</button>
        </form>
      </section>
    </main>
  );
}
