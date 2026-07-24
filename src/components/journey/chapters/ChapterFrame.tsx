import type { Chapter } from "@/data/biographyData";
import { EagleWatermark } from "../Motifs";
import { cn } from "@/lib/utils";

/** Outer shell for every standard chapter: themed bg, glow, eagle watermark. */
export default function ChapterFrame({
  chapter,
  children,
  watermark = true,
  className = "",
}: {
  chapter: Chapter;
  children: React.ReactNode;
  watermark?: boolean;
  className?: string;
}) {
  const dark = chapter.theme === "dark";
  return (
    <section
      id={chapter.id}
      aria-labelledby={`${chapter.id}-title`}
      className={cn(
        "relative isolate overflow-hidden scroll-mt-24",
        dark ? "bg-ctr-navy-deep text-white" : "bg-ctr-paper text-ctr-body",
        className
      )}
    >
      {dark ? (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_100%_0%,rgba(244,180,0,0.14)_0%,transparent_55%),radial-gradient(90%_70%_at_0%_100%,rgba(27,42,99,0.6)_0%,transparent_60%)]"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_100%_0%,#EAEDF3_0%,transparent_55%)]"
        />
      )}
      {watermark && <EagleWatermark />}
      {children}
    </section>
  );
}
