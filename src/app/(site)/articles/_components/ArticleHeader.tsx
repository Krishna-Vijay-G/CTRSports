import type { Article } from "@/lib/articles";
import { cn } from "@/lib/utils";

/**
 * The four things every article carries, above the words.
 *
 * Cover, title, subtext, date — asked for as a set, and drawn as one so the
 * public page and the admin preview cannot drift apart. Each is optional and each
 * is simply absent when it is blank: a heading rule over nothing, or an empty
 * picture frame, is worse than a shorter page.
 *
 * The date is printed exactly as it is stored and never reformatted per locale.
 * A server rendering "15 August 2026" and a browser rendering "August 15, 2026"
 * is a hydration mismatch, and the media library's `formatDate` already carries
 * the same note.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** `2026-08-15` → `15 August 2026`. Assembled, never `toLocaleDateString`. */
export function articleDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";

  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month} ${match[1]}` : "";
}

export function ArticleHeader({
  article,
  className,
}: {
  article: Pick<Article, "title" | "subtext" | "cover_image" | "published_at">;
  className?: string;
}) {
  const date = articleDate(article.published_at);

  return (
    <header className={cn("mx-auto w-full max-w-3xl", className)}>
      {article.cover_image ? (
        <img
          src={article.cover_image}
          alt=""
          // The one picture on the page that is above the fold, so it is the one
          // that is not lazy. Everything inside the body is.
          loading="eager"
          decoding="async"
          className="mb-8 block aspect-[16/9] w-full rounded-[6px] bg-panel object-cover"
        />
      ) : null}

      {date ? (
        <p className="mb-3 text-[13px] uppercase tracking-[0.14em] text-fg-muted">{date}</p>
      ) : null}

      {article.title ? (
        <h1 className="headline text-[clamp(1.7rem,3.8vw,2.8rem)]">{article.title}</h1>
      ) : null}

      {article.subtext ? (
        <p className="body-copy mt-4 text-[17px] leading-relaxed">{article.subtext}</p>
      ) : null}

      {article.title || article.subtext ? <hr className="mt-8 border-line" /> : null}
    </header>
  );
}
