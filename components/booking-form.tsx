"use client";
import { useState } from "react";
import type { Service } from "@/lib/types";
export default function BookingForm({
  services,
  enabled,
}: {
  services: Service[];
  enabled: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const b = await r.json();
      if (!r.ok) throw Error(b.error);
      setMessage(b.message);
      form.reset();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not submit your request.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="publicform" onSubmit={submit}>
      <div className="formrow">
        <label>
          Your name
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            placeholder="Full name"
          />
        </label>
        <label>
          Phone / WhatsApp
          <input
            name="phone"
            type="tel"
            required
            maxLength={25}
            autoComplete="tel"
            placeholder="03XX XXXXXXX"
          />
        </label>
      </div>
      <label>
        What brings you in?
        <select name="service_id" required defaultValue="">
          <option value="" disabled>
            Choose your service
          </option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <div className="formrow">
        <label>
          Preferred date
          <input name="preferred_date" type="date" required />
        </label>
        <label>
          Preferred time
          <input
            name="preferred_time"
            type="time"
            min="10:00"
            max="20:00"
            required
          />
        </label>
      </div>
      <label>
        Anything we should know? <span>(optional)</span>
        <textarea
          name="notes"
          maxLength={500}
          rows={3}
          placeholder="Your occasion, preferred look or a question…"
        />
      </label>
      <label className="honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <p className="consent">
        By submitting, you agree to be contacted about this request. Your
        appointment is confirmed only after the salon contacts you.
      </p>
      {!enabled && (
        <p className="notice">
          Concept demo: online requests are not connected yet. Please contact
          the salon directly.
        </p>
      )}
      {message && (
        <p role="status" className="success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="primary full" disabled={busy || !enabled}>
        {busy ? "Sending your request…" : "Request an appointment ↗"}
      </button>
    </form>
  );
}
