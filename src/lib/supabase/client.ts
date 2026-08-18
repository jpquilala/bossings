"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublic } from "@/lib/env";

/** Browser-side Supabase client. Anon key only — RLS applies. */
export function createClient() {
  const { url, anonKey } = requireSupabasePublic();
  return createBrowserClient(url, anonKey);
}
