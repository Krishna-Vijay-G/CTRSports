import "server-only";

import { getSql } from "@/lib/server/db";
import type { MarqueeItem } from "@/lib/marquee";
import type { SportId } from "@/lib/sports";

/** A page's announcements, newest-configured first is not meaningful here — order is editorial. */
export async function getMarquee(sport: SportId): Promise<MarqueeItem[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT items FROM page_marquees WHERE sport = ${sport}
  `) as { items: MarqueeItem[] }[];

  return rows[0]?.items ?? [];
}

export async function saveMarquee(sport: SportId, items: MarqueeItem[]): Promise<MarqueeItem[]> {
  const sql = getSql();
  await sql`
    INSERT INTO page_marquees (sport, items, updated_at)
    VALUES (${sport}, ${JSON.stringify(items)}::jsonb, now())
    ON CONFLICT (sport) DO UPDATE
      SET items      = EXCLUDED.items,
          updated_at = now()
  `;

  return items;
}
