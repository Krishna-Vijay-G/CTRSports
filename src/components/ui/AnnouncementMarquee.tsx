import Link from "next/link";
import type { MarqueeItem } from "@/lib/marquee";

function isInternal(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

function AnnouncementLink({ item }: { item: MarqueeItem }) {
  if (!item.url) {
    return <span className="px-4">{item.text}</span>;
  }

  const className = "px-4 underline-offset-4 transition hover:text-white hover:underline";
  return isInternal(item.url) ? (
    <Link href={item.url} className={className}>
      {item.text}
    </Link>
  ) : (
    <a href={item.url} target="_blank" rel="noreferrer" className={className}>
      {item.text}
    </a>
  );
}

/**
 * Scrolling strip of admin-configured announcements, each optionally linking
 * somewhere. Renders nothing when there are none, so an unconfigured page
 * looks exactly as it did before this existed. Content is duplicated so the
 * loop (`.animate-marquee`, defined in tailwind.config.ts) has no visible seam.
 */
export function AnnouncementMarquee({ items }: { items: MarqueeItem[] }) {
  if (items.length === 0) return null;

  return (
    <div
      className="w-full overflow-hidden border-b border-white/5 bg-white/[0.03] py-2"
      aria-label="Announcements"
    >
      <div className="flex w-max whitespace-nowrap animate-marquee">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
            {items.map((item, i) => (
              <span
                key={`${copy}-${item.id}`}
                className="flex items-center font-display text-xs font-semibold uppercase tracking-[0.14em] text-white/65"
              >
                <AnnouncementLink item={item} />
                {i < items.length - 1 ? <span className="text-racing-yellow/50">·</span> : null}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
