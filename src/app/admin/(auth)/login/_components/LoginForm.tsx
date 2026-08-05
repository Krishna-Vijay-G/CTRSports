"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

      // The index route sends each role to its own home page.
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src="/media/ctr-logo.png" alt="CTR Unified" className="h-16 w-auto" />
          <div>
            <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
              Admin
            </h1>
            <p className="mt-1 text-sm text-white/45">Sign in to manage ctrsports.in</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 shadow-[0_28px_70px_-40px_rgba(0,0,0,0.9)]"
        >
          <label className="block">
            <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white/50">
              Username
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              autoFocus
              className="mt-2 w-full rounded-xl border border-white/10 bg-carbon-900 px-4 py-3 text-white outline-none transition focus:border-racing-yellow/60"
            />
          </label>

          <label className="mt-5 block">
            <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white/50">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-carbon-900 px-4 py-3 text-white outline-none transition focus:border-racing-yellow/60"
            />
          </label>

          {error ? (
            <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-7 w-full rounded-full bg-racing-yellow px-7 py-3 font-display text-sm font-bold uppercase tracking-wider text-carbon-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(247,214,25,0.55)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/25">
          Authorised personnel only. All sessions are logged.
        </p>
      </div>
    </main>
  );
}
