import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sameOrigin, fail, databaseError } from "@/lib/http";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const { website, ...record } = contactSchema.parse(await req.json());
    void website;
    const db = supabaseAdmin();
    const { error } = await db.from("contact_messages").insert(record);
    databaseError(error);
    return NextResponse.json(
      { message: "Message received. The salon team will contact you." },
      { status: 201 },
    );
  } catch (e) {
    return fail(e);
  }
}
