/**
 * The strip at the very bottom of every public page. `year` is passed in from
 * the server render so the client never disagrees with it after hydration.
 */
export function CopyrightBar({ year }: { year: number }) {
  return (
    <div className="border-t border-white/5 py-4 text-center text-[11px] text-white/30">
      © {year} <a href="https://krishna-vijay-g.vercel.app" target="_blank" className="hover:text-racing-yellow">CTR Unified.</a> All rights reserved.
    </div>
  );
}
