import "server-only";
import { supabaseServer } from "./supabase/server";
import type { Profile } from "./types";
export async function staffSession() {
  const db = await supabaseServer();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await db
    .from("staff_profiles")
    .select("id,name,role,active")
    .eq("id", user.id)
    .eq("active", true)
    .single();
  if (!profile) return null;
  return { db, profile: profile as Profile };
}
