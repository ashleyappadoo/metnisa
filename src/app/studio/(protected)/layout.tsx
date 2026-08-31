import { redirect } from "next/navigation";
import { StudioSidebar } from "@/components/studio/sidebar";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isAppRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function ProtectedStudioLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) redirect("/studio/setup");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/studio/login");

  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", userId).single();
  const role = profile?.role;

  if (!profile || profile.status !== "ACTIVE" || !isAppRole(role)) {
    return <main className="grid min-h-screen place-items-center bg-black p-6 text-white"><div className="max-w-lg"><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Access denied</p><h1 className="mt-3 text-4xl font-black uppercase">Studio profile unavailable.</h1><p className="mt-5 leading-7 text-white/55">Your Supabase user exists, but no active Met Nisa Studio role is attached to it.</p></div></main>;
  }

  return <div className="grid min-h-screen md:grid-cols-[240px_1fr]"><StudioSidebar role={role} /><div>{children}</div></div>;
}
