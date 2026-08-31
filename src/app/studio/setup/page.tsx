import Link from "next/link";
import { getFoundationStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function StudioSetupPage() {
  const status = getFoundationStatus();
  return (
    <main className="min-h-screen bg-black px-5 py-12 text-white">
      <section className="mx-auto max-w-3xl">
        <Link href="/" className="text-xs font-black uppercase tracking-[0.2em]">MET NISA.</Link>
        <p className="mt-16 text-xs font-bold uppercase tracking-[0.22em] text-white/40">Sprint 0 · Environment</p>
        <h1 className="mt-3 text-5xl font-black uppercase tracking-[-0.05em]">Studio setup.</h1>
        <p className="mt-6 max-w-2xl leading-7 text-white/60">The application is healthy. Studio stays locked until its infrastructure variables are configured.</p>
        <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
          {Object.entries(status).map(([name, ready]) => (
            <div key={name} className="flex items-center justify-between py-5">
              <span className="text-sm font-bold uppercase tracking-[0.16em]">{name}</span>
              <span className={`text-xs font-black uppercase tracking-[0.14em] ${ready ? "text-emerald-300" : "text-white/35"}`}>{ready ? "Ready" : "Not configured"}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm leading-6 text-white/50">For Sprint 0, only Supabase is required to unlock authentication. OpenAI, Printify and Stripe are intentionally reserved for later sprints.</p>
      </section>
    </main>
  );
}
