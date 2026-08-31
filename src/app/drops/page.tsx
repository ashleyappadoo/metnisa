import type { Metadata } from "next";
import { SiteHeader } from "@/components/store/site-header";

export const metadata: Metadata = { title: "Drops" };

const launchPhrases = ["AYO.", "BOUZ FIX.", "KASS PAKÉ.", "DAN FATAK.", "SON LA-DAN MEM.", "MALERR PENA LODERR."];

export default function DropsPage() {
  return (
    <main>
      <SiteHeader />
      <section className="mn-shell py-16 sm:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-black/45">Drop 001 · Foundation preview</p>
        <h1 className="mt-5 text-5xl font-black uppercase tracking-[-0.05em] sm:text-7xl">Moris in You.</h1>
        <p className="mt-6 max-w-2xl leading-7 text-black/60">The first Met Nisa vocabulary. Each phrase will ship in Essential black and the Moris gradient after cultural and product QA.</p>
        <div className="mt-12 grid gap-px bg-black/15 sm:grid-cols-2 lg:grid-cols-3">
          {launchPhrases.map((phrase, index) => (
            <article key={phrase} className="min-h-56 bg-[#f7f5f0] p-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Drop 001 · {String(index + 1).padStart(2, "0")}</p>
              <p className={`mt-16 text-2xl font-black tracking-[-0.04em] ${index % 2 ? "mn-gradient-text" : ""}`}>{phrase}</p>
              <p className="mt-3 text-xs text-black/45">Essential + Moris editions</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
