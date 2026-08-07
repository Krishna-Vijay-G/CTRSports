import { NumberTab, GoldTitle, ChevronRun } from "./Motifs";
import { cn } from "@/lib/utils";

/** Shared chapter header: numbered chevron tab + kicker, then gold-barred title. */
export function ChapterHeader({
  id,
  number,
  title,
  kicker,
  dark = false,
  chevrons = false,
  className = "",
}: {
  id: string;
  number: string;
  title: string;
  kicker?: string;
  dark?: boolean;
  chevrons?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <div className="flex items-center gap-4 mb-4">
        <NumberTab number={number} />
        {kicker && (
          <span className={cn("kicker", dark && "text-ctr-gold")}>{kicker}</span>
        )}
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <GoldTitle id={`${id}-title`} dark={dark}>
          {title}
        </GoldTitle>
        {chevrons && <ChevronRun className="mt-1" size={18} />}
      </div>
    </div>
  );
}
