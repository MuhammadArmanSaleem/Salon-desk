import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { fail, HttpError, sameOrigin } from "@/lib/http";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const body = z
      .object({ email: z.email(), password: z.string().min(1).max(128) })
      .parse(await req.json());
    const db = await supabaseServer();
    const { data, error } = await db.auth.signInWithPassword(body);
    if (error) throw new HttpError("Email or password is incorrect.", 401);
    const { data: profile } = await db
      .from("staff_profiles")
      .select("id")
      .eq("id", data.user.id)
      .eq("active", true)
      .single();
    if (!profile) {
      await db.auth.signOut();
      throw new HttpError(
        "This account does not have active salon access.",
        403,
      );
    }
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
