"use client";
import { useRef, useState } from "react";
export default function ContactForm({ enabled }: { enabled: boolean }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const submitting = useRef(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setMessage("");
    setError("");
    const form = e.currentTarget;
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setMessage(data.message);
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your message.");
    } finally {
      submitting.current = false;
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
          />
        </label>
      </div>
      <label>
        Your message
        <textarea
          name="message"
          rows={4}
          minLength={10}
          maxLength={2000}
          required
        />
      </label>
      <label className="honeypot" aria-hidden="true">
        Website
        <input name="website" autoComplete="off" tabIndex={-1} />
      </label>
      <p className="consent">
        By submitting, you agree to be contacted about your inquiry.
      </p>
      {!enabled && (
        <p className="notice">
          Online messages are not connected yet. Please contact the salon
          directly.
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button disabled={busy || !enabled} className="primary full">
        {busy ? "Sending…" : "Send your message ↗"}
      </button>
    </form>
  );
}
