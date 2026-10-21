import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { fail, sameOrigin } from "@/lib/http";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const db = await supabaseServer();
    await db.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
