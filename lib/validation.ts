import { z } from "zod";
export const phoneSchema = z
  .string()
  .regex(/^[+0-9\s()\-]+$/, "Enter a valid phone number without letters.")
  .transform((v) => {
    const n = v.replace(/[^0-9]/g, "");
    return n.startsWith("0") ? "92" + n.slice(1) : n;
  })
  .pipe(
    z.string().regex(/^92[0-9]{10}$/, "Enter a valid Pakistani phone number."),
  );
const name = z.string().trim().min(2).max(80);
export const clientSchema = z.object({ name, phone: phoneSchema });
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Choose a valid date.");
export const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const requestSchema = clientSchema.extend({
  service_id: z.uuid(),
  preferred_date: dateSchema,
  preferred_time: timeSchema,
  notes: z.string().trim().max(500).default(""),
  website: z.string().max(0).optional(),
});
export const bookingSchema = z.object({
  client_id: z.uuid(),
  service_id: z.uuid(),
  staff_id: z.uuid(),
  date: dateSchema,
  time: timeSchema,
});
export const serviceSchema = z.object({
  name,
  category: z.enum(["Makeup", "Hair", "Skin", "Nails", "Other"]),
  price: z.coerce.number().int().min(1).max(10000000),
  duration: z.coerce.number().int().min(15).max(720),
});
export const paymentSchema = z.object({
  appointment_id: z.uuid(),
  amount: z.coerce.number().int().positive(),
  method: z.enum(["Cash", "Bank transfer"]),
});
export const teamSchema = z.object({
  name,
  email: z.email(),
  password: z.string().min(12).max(128),
  role: z.enum(["owner", "receptionist", "stylist"]),
});
export function canManage(role: string) {
  return role === "owner" || role === "receptionist";
}

export const contactSchema = clientSchema.extend({
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(0).optional(),
});
