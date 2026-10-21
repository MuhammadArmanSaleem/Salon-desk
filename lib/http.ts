import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin)
    throw new HttpError("Invalid request origin.", 403);
}
export function fail(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Invalid details." },
      { status: 400 },
    );
  console.error(
    "SalonDesk request failed",
    error instanceof Error ? error.message : "Database error",
  );
  return NextResponse.json(
    {
      error: "Unable to save right now. Please try again or contact the salon.",
    },
    { status: 503 },
  );
}
export function databaseError(
  error: { code?: string; message: string } | null,
) {
  if (!error) return;
  if (error.code === "23P01")
    throw new HttpError(
      "This stylist already has an appointment at that time.",
    );
  if (error.code === "23505")
    throw new HttpError(
      "This record already exists. Refresh and check the list.",
    );
  if (error.code === "P0001") throw new HttpError(error.message);
  if (error.code === "42501")
    throw new HttpError("Your role cannot perform this action.", 403);
  throw new Error(error.message);
}
