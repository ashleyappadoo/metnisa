import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { logout } from "@/app/studio/actions";

const items = ["Overview", "Culture", "Drops", "Designs", "Products", "Printify", "Orders", "Analytics", "Automations", "Settings"];

export function StudioSidebar({ role }: { role: string }) {
  return (
    <aside className="flex min-h-screen flex-col border-r border-black/10 bg-[#f7f5f0] p-6">
      <BrandLogo />
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black/35">Studio · {role}</p>
      <nav className="mt-10 grid gap-1">
        {items.map((item, index) => (
          <Link key={item} href={index === 0 ? "/studio" : `#${item.toLowerCase()}`} className={`px-3 py-2.5 text-xs font-bold uppercase tracking-[0.13em] ${index === 0 ? "bg-black text-white" : "text-black/55 hover:bg-black/5 hover:text-black"}`}>{item}</Link>
        ))}
      </nav>
      <form action={logout} className="mt-auto pt-8">
        <button className="w-full border border-black/15 px-3 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-black/55">Sign out</button>
      </form>
    </aside>
  );
}
