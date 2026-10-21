import { NextResponse } from "next/server";
import { z } from "zod";
import { staffSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { teamSchema } from "@/lib/validation";
import { databaseError, fail, HttpError, sameOrigin } from "@/lib/http";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const s = await staffSession();
    if (!s || s.profile.role !== "owner")
      throw new HttpError("Only the owner manages staff.", 403);
    const body = await req.json();
    const db = supabaseAdmin();
    if (body.action === "create") {
      const b = teamSchema.parse(body);
      const { data, error } = await db.auth.admin.createUser({
        email: b.email,
        password: b.password,
        email_confirm: true,
      });
      if (error)
        throw new HttpError(
          "Unable to create this account. Check the email and password, or whether it already exists.",
        );
      const { error: profileError } = await db
        .from("staff_profiles")
        .insert({ id: data.user.id, name: b.name, role: b.role });
      if (profileError) {
        await db.auth.admin.deleteUser(data.user.id);
        databaseError(profileError);
      }
    } else if (body.action === "update") {
      const b = z
        .object({
          id: z.uuid(),
          role: z.enum(["owner", "receptionist", "stylist"]),
          active: z.boolean(),
        })
        .parse(body);
      if (b.id === s.profile.id)
        throw new HttpError("Ask another owner to change your own access.");
      const { error } = await db
        .from("staff_profiles")
        .update({ role: b.role, active: b.active })
        .eq("id", b.id);
      databaseError(error);
    } else throw new HttpError("Unknown action.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
