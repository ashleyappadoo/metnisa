import Link from "next/link";
import { SiteHeader } from "@/components/store/site-header";

const phrases = ["AYO.", "BOUZ FIX.", "KASS PAKÉ."];

export default function HomePage() {
  return (
    <main>
      <SiteHeader />
      <section className="mn-shell grid min-h-[72vh] items-center gap-12 py-16 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <p className="mb-6 text-xs font-bold uppercase tracking-[0.24em] text-black/55">Mauritian cultural wear · Drop 001</p>
          <h1 className="max-w-4xl text-6xl font-black uppercase leading-[0.9] tracking-[-0.055em] sm:text-7xl lg:text-8xl">
            Moris<br /><span className="mn-gradient-text">in you.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-black/65 sm:text-lg">
            Quiet clothes. Loud memories. Minimal pieces built around the words only Mauritians really need explained once.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/drops" className="bg-black px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-white">Discover Drop 001</Link>
            <a href="#manifesto" className="border border-black px-6 py-4 text-xs font-bold uppercase tracking-[0.18em]">Our idea</a>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {phrases.map((phrase, index) => (
            <article key={phrase} className="flex min-h-40 items-center justify-between border border-black/15 bg-white/55 p-7">
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">MN-0{index + 1}</p>
                <p className={`text-3xl font-black tracking-[-0.04em] ${index === 1 ? "mn-gradient-text" : ""}`}>{phrase}</p>
              </div>
              <span className="text-xs font-bold text-black/35">Moris in you.</span>
            </article>
          ))}
        </div>
      </section>
      <section id="manifesto" className="border-y border-black/10 bg-black text-[#f7f5f0]">
        <div className="mn-shell grid gap-10 py-20 md:grid-cols-2">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">The idea</p>
          <div>
            <h2 className="text-4xl font-black uppercase tracking-[-0.04em] sm:text-5xl">Wear Mauritius without having to show Mauritius.</h2>
            <p className="mt-7 max-w-2xl leading-7 text-white/65">No souvenir graphics. No oversized flags. Just language, memory and attitude — made for Moris wherever Moris lives.</p>
          </div>
        </div>
      </section>
      <footer className="mn-shell flex flex-col gap-3 py-10 text-xs font-bold uppercase tracking-[0.16em] text-black/45 sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 Met Nisa.</span><span>Moris in you.</span>
      </footer>
    </main>
  );
}
