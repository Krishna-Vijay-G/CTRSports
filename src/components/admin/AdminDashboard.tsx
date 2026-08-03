"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MediaPost } from "@/lib/posts";
import { DEFAULT_TEMPLATE, TEMPLATES, resolveTemplate, type TemplateId } from "@/lib/templates";
import {
  DEFAULT_LINK_TYPE,
  LINK_LABEL_MAX,
  LINK_TYPES,
  LINK_TYPE_LIST,
  resolveLinkType,
  type LinkTypeId,
} from "@/lib/links";
import { DEFAULT_SPORT, SPORT_LIST, resolveSport, type SportId } from "@/lib/sports";
import { formatPostDateTime, fromDateTimeLocal, toDateTimeLocal } from "@/lib/formatDate";
import { MediaPicker, EMPTY_MEDIA, type MediaValue } from "@/components/admin/MediaPicker";
import { TemplatePicker } from "@/components/admin/TemplatePicker";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { cn, postLabel } from "@/lib/utils";

type FormState = {
  sport: SportId;
  title: string;
  subtext: string;
  media: MediaValue;
  template: TemplateId;
  linkType: LinkTypeId;
  linkUrl: string;
  linkLabel: string;
  publishedAtLocal: string;
  isPublished: boolean;
};

function emptyForm(nowLocal: string): FormState {
  return {
    sport: DEFAULT_SPORT,
    title: "",
    subtext: "",
    media: EMPTY_MEDIA,
    template: DEFAULT_TEMPLATE,
    linkType: DEFAULT_LINK_TYPE,
    linkUrl: "",
    linkLabel: "",
    publishedAtLocal: nowLocal,
    isPublished: true,
  };
}

function formFromPost(post: MediaPost): FormState {
  return {
    sport: resolveSport(post.sport).id,
    title: post.title ?? "",
    subtext: post.subtext,
    media: {
      url: post.media_url ?? "",
      key: post.media_key,
      type: post.media_type,
      posterUrl: post.poster_url,
      posterKey: post.poster_key,
    },
    template: resolveTemplate(post.template).id,
    linkType: resolveLinkType(post.link_type).id,
    linkUrl: post.link_url ?? "",
    linkLabel: post.link_label ?? "",
    publishedAtLocal: toDateTimeLocal(post.published_at),
    isPublished: post.is_published,
  };
}

/** Where a post tagged with this sport will show up, for the hint under the picker. */
function sportDestination(sport: SportId): string {
  const slug = resolveSport(sport).slug;
  return slug ? `ctrsports.in/${slug}/post` : "ctrsports.in";
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
  const [sportFilter, setSportFilter] = useState<SportId | "all">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const linkMeta = LINK_TYPES[form.linkType];
  const hasContent = Boolean(form.title.trim() || form.subtext.trim() || form.media.url.trim());

  /** A throwaway post shaped like the real thing, so the preview is exact. */
  const previewPost: MediaPost | null = useMemo(() => {
    if (!hasContent) return null;
    return {
      id: "preview",
      sport: form.sport,
      title: form.title.trim() || null,
      subtext: form.subtext,
      media_url: form.media.url.trim() || null,
      media_key: form.media.key,
      media_type: form.media.type,
      poster_url: form.media.posterUrl,
      poster_key: form.media.posterKey,
      template: form.template,
      link_type: form.linkType,
      link_url: form.linkUrl.trim() || null,
      link_label: form.linkLabel.trim() || null,
      published_at: form.publishedAtLocal
        ? fromDateTimeLocal(form.publishedAtLocal)
        : new Date(nowIso).toISOString(),
      is_published: form.isPublished,
    };
  }, [form, hasContent, nowIso]);

  /**
   * Which posts currently sit in a banner slot. Counted per sport, because each
   * sport's page runs its own carousel of that sport's three most recent posts.
   */
  const bannerIds = useMemo(() => {
    const perSport = new Map<SportId, number>();
    const ids = new Set<string>();

    // `posts` arrives newest-first; future-dated ones are not live yet.
    for (const post of posts) {
      if (!post.is_published || post.published_at > nowIso) continue;
      const sport = resolveSport(post.sport).id;
      const count = perSport.get(sport) ?? 0;
      if (count < 3) {
        ids.add(post.id);
        perSport.set(sport, count + 1);
      }
    }
    return ids;
  }, [posts, nowIso]);

  const visiblePosts = useMemo(
    () => (sportFilter === "all" ? posts : posts.filter((p) => resolveSport(p.sport).id === sportFilter)),
    [posts, sportFilter]
  );

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

    // Title, subtext, media and the link are all optional on their own — but a
    // post with none of the first three would render as an empty card.
    if (!hasContent) {
      setError("Add at least a title, some subtext, or media.");
      return;
    }

    setBusy(true);

    const payload = {
      sport: form.sport,
      title: form.title.trim() || null,
      subtext: form.subtext,
      media_url: form.media.url.trim() || null,
      media_key: form.media.key,
      media_type: form.media.type,
      poster_url: form.media.posterUrl,
      poster_key: form.media.posterKey,
      template: form.template,
      link_type: form.linkType,
      link_url: form.linkUrl.trim() || null,
      link_label: form.linkLabel.trim() || null,
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
    if (
      !window.confirm(
        `Delete “${postLabel(post)}”? This removes it from the site and cannot be undone.`
      )
    ) {
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

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-6">
      <AdminHeader username={username} active="posts" title="Media Management" />

      {notice ? (
        <p className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </p>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          {/* ─── Content fields ─── */}
          <div className="h-fit rounded-3xl border border-white/10 bg-white/[0.03] p-6">
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
              <span className={labelClass}>Sport *</span>
              <select
                value={form.sport}
                onChange={(e) => set("sport", e.target.value as SportId)}
                className={cn(fieldClass, "[color-scheme:dark]")}
              >
                {SPORT_LIST.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.short}
                  </option>
                ))}
              </select>
              <span className="mt-1.5 block text-[11px] text-white/35">
                Shows on <span className="text-racing-yellow/70">{sportDestination(form.sport)}</span>
              </span>
            </label>

            <p className="mt-6 text-[11px] leading-relaxed text-white/35">
              Title, subtext, media and the link are all optional — fill in whichever the post
              needs. At least one of title, subtext or media is required.
            </p>

            <label className="mt-4 block">
              <span className={labelClass}>Title</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                maxLength={200}
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
              <span className={labelClass}>Image or video</span>
              <div className="mt-2">
                <MediaPicker
                  value={form.media}
                  onChange={(next) => set("media", next)}
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

            {/* ─── Link ─── */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-carbon-900/40 p-4">
              <span className={labelClass}>Link (optional)</span>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {LINK_TYPE_LIST.map((type) => {
                  const active = type.id === form.linkType;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => set("linkType", type.id)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition",
                        active
                          ? "border-racing-yellow/70 bg-racing-yellow/[0.08] text-racing-yellow"
                          : "border-white/10 bg-carbon-900 text-white/55 hover:border-white/25"
                      )}
                    >
                      {type.name}
                    </button>
                  );
                })}
              </div>

              <label className="mt-3 block">
                <span className={labelClass}>URL</span>
                <input
                  type="url"
                  value={form.linkUrl}
                  onChange={(e) => set("linkUrl", e.target.value)}
                  placeholder={linkMeta.placeholder}
                  className={fieldClass}
                />
              </label>

              {/* The `custom` type exists to carry its own name; the others fall
                  back to a label derived from the type. */}
              {form.linkType === "custom" ? (
                <label className="mt-3 block">
                  <span className={labelClass}>Button name</span>
                  <input
                    type="text"
                    value={form.linkLabel}
                    onChange={(e) => set("linkLabel", e.target.value)}
                    maxLength={LINK_LABEL_MAX}
                    placeholder="Buy tickets"
                    className={fieldClass}
                  />
                </label>
              ) : null}

              <p className="mt-3 text-[11px] text-white/35">
                Button reads{" "}
                <span className="text-racing-yellow/70">
                  {form.linkLabel.trim() || linkMeta.defaultLabel}
                </span>
              </p>
            </div>

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
          </div>

          {/* ─── Template chooser + preview ─── */}
          <div className="space-y-8">
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">
                Template
              </h2>
              <p className="mt-1 text-xs text-white/40">
                The banner layout used when this post is one of the three most recent for its
                sport. Cards in the grid below the banners all share one format. A post with no
                media always uses the copy-only banner.
              </p>
              <div className="mt-5">
                <TemplatePicker
                  value={form.template}
                  onChange={(next) => set("template", next)}
                  previewPost={previewPost}
                  previewKicker={
                    form.sport === DEFAULT_SPORT ? undefined : resolveSport(form.sport).name
                  }
                />
              </div>
            </section>

            {/* ─── Post list ─── */}
            <section>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">
                  Posts
                </h2>
                <span className="text-xs text-white/40">
                  {visiblePosts.length} of {posts.length} · newest first
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {([{ id: "all" as const, short: "All" }, ...SPORT_LIST]).map((sport) => {
                  const active = sportFilter === sport.id;
                  const count =
                    sport.id === "all"
                      ? posts.length
                      : posts.filter((p) => resolveSport(p.sport).id === sport.id).length;

                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => setSportFilter(sport.id)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition",
                        active
                          ? "border-racing-yellow/70 bg-racing-yellow/[0.08] text-racing-yellow"
                          : "border-white/10 text-white/50 hover:border-white/25 hover:text-white/75"
                      )}
                    >
                      {sport.short}
                      <span className="ml-1.5 text-white/30">{count}</span>
                    </button>
                  );
                })}
              </div>

              {visiblePosts.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center text-sm text-white/40">
                  {posts.length === 0
                    ? "No posts yet. Create your first one with the form."
                    : "No posts for this sport yet."}
                </p>
              ) : (
                <ul className="mt-5 space-y-4">
                  {visiblePosts.map((post) => (
                    <li
                      key={post.id}
                      className={cn(
                        "flex gap-4 rounded-2xl border p-4 transition-colors",
                        editingId === post.id
                          ? "border-racing-yellow/50 bg-racing-yellow/[0.06]"
                          : "border-white/10 bg-white/[0.02]"
                      )}
                    >
                      <div className="relative flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/40 p-1.5">
                        {post.media_url ? (
                          <>
                            <img
                              src={post.poster_url ?? post.media_url}
                              alt=""
                              aria-hidden
                              className="max-h-full max-w-full object-contain"
                              loading="lazy"
                            />
                            {post.media_type === "video" ? (
                              <span className="absolute bottom-1 right-1 rounded bg-carbon-950/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-racing-yellow">
                                Video
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white/25">
                            Text only
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/75">
                            {resolveSport(post.sport).short}
                          </span>
                          {bannerIds.has(post.id) ? (
                            <span className="rounded-full bg-racing-yellow/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-racing-yellow">
                              Banner
                            </span>
                          ) : null}
                          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/60">
                            {post.media_url
                              ? TEMPLATES[resolveTemplate(post.template).id].name
                              : "Copy only"}
                          </span>
                          {!post.is_published ? (
                            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
                              Draft
                            </span>
                          ) : null}
                          <span className="text-[11px] text-white/40">
                            {formatPostDateTime(post.published_at)}
                          </span>
                        </div>

                        <h3
                          className={cn(
                            "mt-1.5 truncate font-display text-sm font-semibold uppercase tracking-wide",
                            post.title ? "text-white" : "text-white/45"
                          )}
                        >
                          {postLabel(post)}
                        </h3>
                        {post.title && post.subtext ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45">
                            {post.subtext}
                          </p>
                        ) : null}
                        {post.link_url ? (
                          <p className="mt-1 truncate text-[11px] text-white/35">
                            {resolveLinkType(post.link_type).name}
                            {post.link_label ? ` · ${post.link_label}` : ""} — {post.link_url}
                          </p>
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
      </form>
    </div>
  );
}
