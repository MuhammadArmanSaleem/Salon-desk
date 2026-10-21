import { NextResponse } from "next/server";
import { z } from "zod";
import { staffSession } from "@/lib/auth";
import {
  bookingSchema,
  canManage,
  clientSchema,
  paymentSchema,
  serviceSchema,
} from "@/lib/validation";
import { databaseError, fail, HttpError, sameOrigin } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const s = await staffSession();
    if (!s) throw new HttpError("Please sign in.", 401);
    const { db, profile } = s;
    const manage = canManage(profile.role);
    const queries = await Promise.all([
      db.from("staff_profiles").select("id,name,role,active").order("name"),
      db.from("salon_services").select("*").order("name"),
      db.from("salon_clients").select("*").order("name"),
      db
        .from("salon_appointments")
        .select("*")
        .order("starts_at", { ascending: false }),
      manage
        ? db
            .from("salon_payments")
            .select("*")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      manage
        ? db
            .from("booking_requests")
            .select("*")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
    queries.forEach((r) => databaseError(r.error));
    const [team, services, clients, appointments, payments, requests] =
      queries.map((r) => r.data || []);
    return NextResponse.json(
      { profile, team, services, clients, appointments, payments, requests },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const s = await staffSession();
    if (!s) throw new HttpError("Please sign in.", 401);
    const { db, profile } = s;
    const body = await req.json();
    const action = z.string().parse(body.action);
    if (!canManage(profile.role) && action !== "status")
      throw new HttpError("Your role cannot perform this action.", 403);
    switch (action) {
      case "client": {
        const values = clientSchema.parse(body);
        const { error } = await db.from("salon_clients").insert(values);
        databaseError(error);
        break;
      }
      case "service": {
        if (profile.role !== "owner")
          throw new HttpError("Only the owner manages services.", 403);
        const { error } = await db
          .from("salon_services")
          .insert(serviceSchema.parse(body));
        databaseError(error);
        break;
      }
      case "service-toggle": {
        if (profile.role !== "owner")
          throw new HttpError("Only the owner manages services.", 403);
        const v = z.object({ id: z.uuid(), active: z.boolean() }).parse(body);
        const { error } = await db
          .from("salon_services")
          .update({ active: v.active })
          .eq("id", v.id);
        databaseError(error);
        break;
      }
      case "booking": {
        const b = bookingSchema.parse(body);
        const starts_at = new Date(
          `${b.date}T${b.time}:00+05:00`,
        ).toISOString();
        const { error } = await db
          .from("salon_appointments")
          .insert({
            client_id: b.client_id,
            service_id: b.service_id,
            staff_id: b.staff_id,
            starts_at,
            ends_at: starts_at,
            service_name: "",
            total: 1,
          });
        databaseError(error);
        break;
      }
      case "confirm-request": {
        const b = z
          .object({
            request_id: z.uuid(),
            staff_id: z.uuid(),
            date: bookingSchema.shape.date,
            time: bookingSchema.shape.time,
          })
          .parse(body);
        const { error } = await db.rpc("confirm_salon_request", {
          request_id: b.request_id,
          stylist_id: b.staff_id,
          start_time: new Date(`${b.date}T${b.time}:00+05:00`).toISOString(),
        });
        databaseError(error);
        break;
      }
      case "decline-request": {
        const id = z.uuid().parse(body.id);
        const { error } = await db
          .from("booking_requests")
          .update({ status: "Declined" })
          .eq("id", id)
          .eq("status", "Pending");
        databaseError(error);
        break;
      }
      case "status": {
        const b = z
          .object({
            id: z.uuid(),
            status: z.enum(["Confirmed", "Completed", "Cancelled"]),
          })
          .parse(body);
        if (profile.role === "stylist" && b.status !== "Completed")
          throw new HttpError(
            "Stylists can only mark their appointments completed.",
            403,
          );
        const { data, error } = await db
          .from("salon_appointments")
          .update({ status: b.status })
          .eq("id", b.id)
          .select("id")
          .single();
        databaseError(error);
        if (!data) throw new HttpError("Appointment unavailable.", 404);
        break;
      }
      case "payment": {
        const { error } = await db
          .from("salon_payments")
          .insert(paymentSchema.parse(body));
        databaseError(error);
        break;
      }
      default:
        throw new HttpError("Unknown action.");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
