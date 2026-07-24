import type { PartnerItem } from "@/data/biographyData";
import { cn } from "@/lib/utils";

/** CTR × Partner × Partner lockup with × separators (deck slides 04 & 05). */
export default function PartnerLockup({
  partners,
  dark = false,
  className = "",
}: {
  partners: PartnerItem[];
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-6",
        className
      )}
    >
      {partners.map((p, i) => (
        <div key={p.name} className="flex items-center gap-x-4 sm:gap-x-6">
          {i > 0 && (
            <span
              aria-hidden
              className={cn(
                "font-display font-light text-2xl",
                dark ? "text-white/40" : "text-ctr-navy/35"
              )}
            >
              ×
            </span>
          )}
          <span
            className={cn(
              "flex items-center justify-center rounded-lg px-3 py-2",
              dark ? "bg-white/95" : "bg-white shadow-card ring-1 ring-ctr-navy/5"
            )}
          >
            {p.logo ? (
              <img
                src={p.logo}
                alt={p.name}
                className="h-9 sm:h-11 w-auto object-contain"
                loading="lazy"
              />
            ) : (
              <span className="font-display font-bold uppercase tracking-wide text-ctr-navy">
                {p.name}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
