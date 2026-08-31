"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/studio/setup");

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/studio/login?error=missing_fields");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect("/studio/login?error=invalid_credentials");
  redirect("/studio");
}
