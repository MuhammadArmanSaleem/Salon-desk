import { test } from "node:test";
import assert from "node:assert/strict";
import {
  phoneSchema,
  dateSchema,
  timeSchema,
  requestSchema,
  paymentSchema,
  canManage,
} from "./validation";
test("normalizes local and international Pakistani phone numbers", () => {
  assert.equal(phoneSchema.parse("0300-1234567"), "923001234567");
  assert.equal(phoneSchema.parse("+92 300 1234567"), "923001234567");
  assert.equal(phoneSchema.safeParse("123").success, false);
});
test("rejects impossible dates and invalid times", () => {
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  assert.equal(dateSchema.parse("2028-02-29"), "2028-02-29");
  assert.equal(timeSchema.safeParse("25:00").success, false);
});
test("rejects bot honeypot and non-positive payments; only management roles manage", () => {
  assert.equal(
    requestSchema.safeParse({
      name: "Test",
      phone: "03001234567",
      service_id: "10000000-0000-4000-8000-000000000001",
      preferred_date: "2026-12-01",
      preferred_time: "12:00",
      website: "spam",
    }).success,
    false,
  );
  assert.equal(
    paymentSchema.safeParse({
      appointment_id: "10000000-0000-4000-8000-000000000001",
      amount: -1,
      method: "Cash",
    }).success,
    false,
  );
  assert.equal(canManage("stylist"), false);
  assert.equal(canManage("owner"), true);
  assert.equal(canManage("receptionist"), true);
});
