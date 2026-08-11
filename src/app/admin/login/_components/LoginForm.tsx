"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@/config/site";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Sign in failed.");
        setBusy(false);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-carbon-950 px-5 py-16 font-body text-white/90">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src={BRAND.logo} alt={BRAND.name} className="h-16 w-auto" />
          <div>
            <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
              Admin
            </h1>
            <p className="mt-1 text-sm text-white/45">Sign in to manage the sports list</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 shadow-[0_28px_70px_-40px_rgba(0,0,0,0.9)]"
        >
          <label className="block">
            <span className="admin-label">Username</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              autoFocus
              className="admin-field mt-2 py-3"
            />
          </label>

          <label className="mt-5 block">
            <span className="admin-label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="admin-field mt-2 py-3"
            />
          </label>

          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="btn-yellow mt-7 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/25">Authorised personnel only.</p>
      </div>
    </main>
  );
}
