import { NextResponse } from "next/server";
import { requestSchema } from "@/lib/validation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { day } from "@/lib/types";
import { databaseError, fail, HttpError, sameOrigin } from "@/lib/http";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const body = requestSchema.parse(await req.json());
    const today = day(new Date().toISOString());
    if (
      body.preferred_date < today ||
      body.preferred_date >
        day(new Date(Date.now() + 180 * 86400000).toISOString())
    )
      throw new HttpError("Choose a date within the next six months.");
    if (body.preferred_time < "10:00" || body.preferred_time > "20:00")
      throw new HttpError("Choose a preferred time between 10 AM and 8 PM.");
    const db = supabaseAdmin();
    const { data: service } = await db
      .from("salon_services")
      .select("id")
      .eq("id", body.service_id)
      .eq("active", true)
      .single();
    if (!service) throw new HttpError("Please select an available service.");
    const { website, ...record } = body;
    void website;
    const { error } = await db.from("booking_requests").insert(record);
    databaseError(error);
    return NextResponse.json(
      {
        message:
          "Request received. The salon will contact you to confirm availability. Your appointment is not confirmed yet.",
      },
      { status: 201 },
    );
  } catch (e) {
    return fail(e);
  }
}
