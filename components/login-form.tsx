"use client";
import { useState } from "react";
export default function LoginForm({ enabled }: { enabled: boolean }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      const b = await r.json();
      if (!r.ok) throw Error(b.error);
      window.location.assign("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={login}>
      {!enabled && (
        <p className="notice">
          The staff portal is waiting for its Supabase connection. Sign-in will
          be available after setup.
        </p>
      )}
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="primary full" disabled={busy || !enabled}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
