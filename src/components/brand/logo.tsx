import Link from "next/link";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" aria-label="Met Nisa home" className="inline-flex items-baseline gap-1 font-black tracking-[0.14em]">
      <span>{compact ? "MN" : "MET NISA"}</span>
      <span aria-hidden="true">.</span>
    </Link>
  );
}
