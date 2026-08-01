"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MediaPost } from "@/lib/posts";
import { formatPostDateTime, fromDateTimeLocal, toDateTimeLocal } from "@/lib/formatDate";
import { ImagePicker, type ImageValue } from "@/components/admin/ImagePicker";
import { cn } from "@/lib/utils";

type FormState = {
  title: string;
  subtext: string;
  image: ImageValue;
  instagramUrl: string;
  publishedAtLocal: string;
  isPublished: boolean;
};

function emptyForm(nowLocal: string): FormState {
  return {
    title: "",
    subtext: "",
    image: { url: "", key: null },
    instagramUrl: "",
    publishedAtLocal: nowLocal,
    isPublished: true,
  };
}

function formFromPost(post: MediaPost): FormState {
  return {
    title: post.title,
    subtext: post.subtext,
    image: { url: post.image_url, key: post.image_key },
    instagramUrl: post.instagram_url ?? "",
    publishedAtLocal: toDateTimeLocal(post.published_at),
    isPublished: post.is_published,
  };
}

const fieldClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-carbon-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-racing-yellow/60";

const labelClass = "font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/40";

export function AdminDashboard({
  initialPosts,
  username,
  nowIso,
}: {
  initialPosts: MediaPost[];
  username: string;
  nowIso: string;
}) {
  const router = useRouter();
  // Derived from a server-provided timestamp so SSR and hydration agree.
  const nowLocal = useMemo(() => toDateTimeLocal(nowIso), [nowIso]);

  const [posts, setPosts] = useState(initialPosts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(nowLocal));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(toDateTimeLocal(new Date().toISOString())));
    setError(null);
  }

  function startEdit(post: MediaPost) {
    setEditingId(post.id);
    setForm(formFromPost(post));
    setError(null);
    setNotice(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function refresh() {
    const response = await fetch("/api/admin/posts", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setPosts(data.posts as MediaPost[]);
    }
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.image.url.trim()) {
      setError("Add an image — upload one or paste a URL.");
      return;
    }

    setBusy(true);

    const payload = {
      title: form.title,
      subtext: form.subtext,
      image_url: form.image.url,
      image_key: form.image.key,
      instagram_url: form.instagramUrl.trim() || null,
      published_at: form.publishedAtLocal
        ? fromDateTimeLocal(form.publishedAtLocal)
        : new Date().toISOString(),
      is_published: form.isPublished,
    };

    try {
      const response = await fetch(
        editingId ? `/api/admin/posts/${editingId}` : "/api/admin/posts",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not save the post.");
        return;
      }

      setNotice(editingId ? "Post updated." : "Post published.");
      resetForm();
      await refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(post: MediaPost) {
    if (!window.confirm(`Delete “${post.title}”? This removes it from the site and cannot be undone.`)) {
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/posts/${post.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not delete the post.");
        return;
      }
      if (editingId === post.id) resetForm();
      setNotice("Post deleted.");
      await refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/media/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <img src="/media/ctr-logo.png" alt="" aria-hidden className="h-10 w-auto" />
          <div>
            <h1 className="font-display text-lg font-bold uppercase tracking-wide text-white">
              Media Management
            </h1>
            <p className="text-xs text-white/40">
              Signed in as <span className="text-racing-yellow">{username}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow"
          >
            View site
          </a>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 transition hover:border-red-400/60 hover:text-red-300"
          >
            Sign out
          </button>
        </div>
      </header>

      {notice ? (
        <p className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </p>
      ) : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ─── Editor ─── */}
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-3xl border border-white/10 bg-white/[0.03] p-6 xl:sticky xl:top-8"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">
              {editingId ? "Edit post" : "New post"}
            </h2>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold uppercase tracking-wider text-white/45 underline-offset-4 hover:text-racing-yellow hover:underline"
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <label className="mt-6 block">
            <span className={labelClass}>Title *</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={200}
              required
              placeholder="CTR Unified signs new F4 driver"
              className={fieldClass}
            />
          </label>

          <label className="mt-5 block">
            <span className={labelClass}>Subtext</span>
            <textarea
              value={form.subtext}
              onChange={(e) => set("subtext", e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="A short description shown under the title."
              className={cn(fieldClass, "resize-y")}
            />
            <span className="mt-1 block text-right text-[11px] text-white/25">
              {form.subtext.length}/2000
            </span>
          </label>

          <div className="mt-5">
            <span className={labelClass}>Image *</span>
            <div className="mt-2">
              <ImagePicker
                value={form.image}
                onChange={(next) => set("image", next)}
                disabled={busy}
              />
            </div>
          </div>

          <label className="mt-5 block">
            <span className={labelClass}>Date &amp; time (IST)</span>
            <div className="mt-2 flex gap-2">
              <input
                type="datetime-local"
                value={form.publishedAtLocal}
                onChange={(e) => set("publishedAtLocal", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-carbon-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-racing-yellow/60 [color-scheme:dark]"
              />
              <button
                type="button"
                onClick={() => set("publishedAtLocal", toDateTimeLocal(new Date().toISOString()))}
                className="shrink-0 rounded-xl border border-white/15 px-4 text-xs font-semibold uppercase tracking-wider text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow"
              >
                Now
              </button>
            </div>
          </label>

          <label className="mt-5 block">
            <span className={labelClass}>Instagram link (optional)</span>
            <input
              type="url"
              value={form.instagramUrl}
              onChange={(e) => set("instagramUrl", e.target.value)}
              placeholder="https://www.instagram.com/p/…"
              className={fieldClass}
            />
          </label>

          <label className="mt-5 flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => set("isPublished", e.target.checked)}
              className="h-4 w-4 accent-racing-yellow"
            />
            <span className="text-sm text-white/70">
              Visible on the site
              <span className="block text-xs text-white/35">Uncheck to keep it as a draft.</span>
            </span>
          </label>

          {error ? (
            <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-full bg-racing-yellow px-7 py-3 font-display text-sm font-bold uppercase tracking-wider text-carbon-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(247,214,25,0.55)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {busy ? "Saving…" : editingId ? "Save changes" : "Publish post"}
          </button>
        </form>

        {/* ─── Post list ─── */}
        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">
              Posts
            </h2>
            <span className="text-xs text-white/40">
              {posts.length} total · newest first
            </span>
          </div>

          {posts.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center text-sm text-white/40">
              No posts yet. Create your first one with the form.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {posts.map((post, index) => (
                <li
                  key={post.id}
                  className={cn(
                    "flex gap-4 rounded-2xl border p-4 transition-colors",
                    editingId === post.id
                      ? "border-racing-yellow/50 bg-racing-yellow/[0.06]"
                      : "border-white/10 bg-white/[0.02]"
                  )}
                >
                  <div className="flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/40 p-1.5">
                    <img
                      src={post.image_url}
                      alt=""
                      aria-hidden
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {index < 3 && post.is_published ? (
                        <span className="rounded-full bg-racing-yellow/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-racing-yellow">
                          Banner
                        </span>
                      ) : null}
                      {!post.is_published ? (
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
                          Draft
                        </span>
                      ) : null}
                      <span className="text-[11px] text-white/40">
                        {formatPostDateTime(post.published_at)}
                      </span>
                    </div>

                    <h3 className="mt-1.5 truncate font-display text-sm font-semibold uppercase tracking-wide text-white">
                      {post.title}
                    </h3>
                    {post.subtext ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45">
                        {post.subtext}
                      </p>
                    ) : null}
                    {post.instagram_url ? (
                      <a
                        href={post.instagram_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-block truncate text-[11px] text-racing-yellow/80 underline-offset-2 hover:underline"
                      >
                        {post.instagram_url}
                      </a>
                    ) : null}

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(post)}
                        className="rounded-full border border-white/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(post)}
                        disabled={busy}
                        className="rounded-full border border-white/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/70 transition hover:border-red-400/60 hover:text-red-300 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
