import { getFoundationStatus } from "@/lib/env";

const modules = [
  ["Culture", "Phrase corpus + cultural review", "Sprint 1"],
  ["Drops", "Curated launch workflows", "Sprint 2"],
  ["Designs", "Deterministic SVG → PNG", "Sprint 3"],
  ["Printify", "POD catalog + fulfillment adapter", "Sprint 4"],
];

export default function StudioHomePage() {
  const health = getFoundationStatus();
  return (
    <main className="p-6 sm:p-10 lg:p-14">
      <div className="flex flex-col gap-6 border-b border-black/10 pb-10 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-black/40">Met Nisa Studio</p><h1 className="mt-3 text-5xl font-black uppercase tracking-[-0.05em]">Foundation.</h1></div>
        <span className="w-fit bg-emerald-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-900">Sprint 0</span>
      </div>
      <section className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(health).map(([name, ready]) => <article key={name} className="border border-black/10 p-5"><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-black/40">Integration</p><p className="mt-4 text-lg font-black uppercase">{name}</p><p className={`mt-2 text-xs font-bold uppercase ${ready ? "text-emerald-700" : "text-black/30"}`}>{ready ? "Configured" : "Planned"}</p></article>)}
      </section>
      <section className="mt-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-black/40">Product engine roadmap</p><div className="mt-4 divide-y divide-black/10 border-y border-black/10">{modules.map(([name, description, sprint]) => <div key={name} className="grid gap-2 py-5 sm:grid-cols-[150px_1fr_100px]"><strong className="uppercase">{name}</strong><span className="text-black/55">{description}</span><span className="text-xs font-bold uppercase tracking-[0.12em] text-black/35 sm:text-right">{sprint}</span></div>)}</div></section>
    </main>
  );
}
