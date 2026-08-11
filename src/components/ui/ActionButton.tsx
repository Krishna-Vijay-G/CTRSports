import { cn } from "@/lib/utils";

/**
 * The design's signature button: a pill of text with a filled circle on the
 * right holding an arrow. Every call to action on the site is one of these, so
 * the three variants below are the whole button vocabulary — resist adding a
 * fourth.
 *
 * Renders an <a> because nothing on this page submits anything yet.
 */
export function ActionButton({
  href,
  children,
  variant = "accent",
  className,
  target,
  rel,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "accent" | "outline" | "white";
  className?: string;
  /** For the buttons that leave this site — everything in-page omits both. */
  target?: string;
  rel?: string;
}) {
  const shell = {
    accent: "bg-accent text-accent-ink hover:bg-accent-dark",
    outline: "border border-line bg-panel text-fg hover:border-fg-faint",
    white: "bg-white text-accent-ink hover:bg-white/90",
  }[variant];

  // The circle inverts against its pill, which is what makes it read as a knob
  // rather than a second button.
  const knob = {
    accent: "bg-accent-ink text-accent",
    outline: "bg-accent text-accent-ink",
    white: "bg-accent-ink text-white",
  }[variant];

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-full py-1.5 pl-6 pr-1.5 text-sm font-semibold",
        "transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0",
        shell,
        className
      )}
    >
      {children}
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", knob)}>
        <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
    </a>
  );
}

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden className={className}>
      <path
        d="M3 7h8M7.5 3.5 11 7l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
