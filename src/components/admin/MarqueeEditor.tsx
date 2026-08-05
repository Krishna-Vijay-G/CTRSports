"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MarqueeItem } from "@/lib/marquee";
import { MAX_MARQUEE_ITEMS, MARQUEE_TEXT_MAX } from "@/lib/marquee";
import type { SportId } from "@/lib/sports";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-carbon-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-racing-yellow/60";

const labelClass = "font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/40";

function emptyItem(): MarqueeItem {
  return { id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text: "", url: "" };
}

/**
 * The announcement strip for one page — reused inside `SportMediaAdmin` for
 * every `/admin/media/{sport}` screen. Its own save button and its own
 * `/api/admin/marquee` call: a separate resource from the posts beside it.
 */
export function MarqueeEditor({ sport, initialItems }: { sport: SportId; initialItems: MarqueeItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<MarqueeItem[]>(initialItems);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function patch(index: number, values: Partial<MarqueeItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...values } : item)));
  }

  function move(index: number, delta: number) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    setNotice(null);

    // Blank rows are dropped rather than rejected — an editor mid-draft with
    // an empty row at the bottom shouldn't have to remove it before saving.
    const payload = items
      .map((item) => ({ id: item.id, text: item.text.trim(), url: item.url?.trim() || null }))
      .filter((item) => item.text);

    try {
      const response = await fetch(`/api/admin/marquee?sport=${sport}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not save the marquee.");
        return;
      }

      setItems(data.items as MarqueeItem[]);
      setNotice("Saved. The announcement strip is updated.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">
            Marquee
          </h2>
          <p className="mt-1 text-xs text-white/40">
            The scrolling announcement strip at the top of the page. Each one can link
            somewhere — leave the link blank for plain text. Empty when there are none.
          </p>
        </div>
        <span className="text-xs text-white/40">
          {items.length} / {MAX_MARQUEE_ITEMS}
        </span>
      </div>

      {notice ? (
        <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-white/15 px-6 py-8 text-center text-sm text-white/40">
          No announcements. Nothing extra shows on the page.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="grid gap-3 rounded-2xl border border-white/10 bg-carbon-900/40 p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
            >
              <label className="block">
                <span className={labelClass}>Text</span>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => patch(index, { text: e.target.value })}
                  maxLength={MARQUEE_TEXT_MAX}
                  placeholder="Registrations for the 2026 season are open"
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Link (optional)</span>
                <input
                  type="text"
                  value={item.url ?? ""}
                  onChange={(e) => patch(index, { url: e.target.value })}
                  placeholder="/academy/registration"
                  className={fieldClass}
                />
              </label>
              <div className="flex items-end gap-2 pb-0.5 sm:pb-0">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  title="Move up"
                  className="rounded-xl border border-white/15 px-3 py-2.5 text-xs font-semibold text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  title="Move down"
                  className="rounded-xl border border-white/15 px-3 py-2.5 text-xs font-semibold text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  className="rounded-xl border border-white/15 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/70 transition hover:border-red-400/60 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, emptyItem()])}
          disabled={items.length >= MAX_MARQUEE_ITEMS}
          className="rounded-full border border-white/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow disabled:cursor-not-allowed disabled:opacity-35"
        >
          + Add announcement
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className={cn(
            "rounded-full bg-racing-yellow px-6 py-2 font-display text-xs font-bold uppercase tracking-wider text-carbon-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(247,214,25,0.55)]",
            busy && "cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-none"
          )}
        >
          {busy ? "Saving…" : "Save marquee"}
        </button>
      </div>
    </section>
  );
}
