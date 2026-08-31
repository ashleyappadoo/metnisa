import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";

export function SiteHeader() {
  return (
    <header className="border-b border-black/10 bg-[#f7f5f0]/95">
      <div className="mn-shell flex h-20 items-center justify-between gap-8">
        <BrandLogo />
        <nav className="hidden items-center gap-8 text-xs font-bold uppercase tracking-[0.16em] md:flex" aria-label="Main navigation">
          <Link href="/drops">Drops</Link>
          <Link href="/#manifesto">Story</Link>
          <Link href="/studio" className="text-black/45">Studio</Link>
        </nav>
        <div className="text-xs font-bold uppercase tracking-[0.16em]">Moris in you.</div>
      </div>
    </header>
  );
}
