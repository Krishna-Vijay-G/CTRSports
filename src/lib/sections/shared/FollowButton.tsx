import { LinkPill } from "./LinkPill";

/**
 * Follow the championship on Instagram.
 *
 * The championship's own account, not CTR's — this page is about INCRC, and the
 * handle is the one piece of it that updates between rounds.
 *
 * One chip rather than a list, because the introduction's follow button is part
 * of the section's argument ("this is the championship, here is where it
 * lives") rather than a list of places to go. The band at the foot of the page
 * carries THAT — see `family.links`.
 *
 * The wording is `intro.followLabel`, not a constant here. It used to be one —
 * which meant a page whose document said nothing still put a sentence on the
 * screen, and that sentence came from this file rather than from anyone who
 * edits the site. Nothing to say, or nowhere to go, and there is no chip: the
 * glyph alone is not a button, and a button pointing at "" is worse than none.
 */
export function FollowButton({
  href,
  handle,
  label,
  tone = "accent",
}: {
  href: string;
  handle: string;
  label: string;
  tone?: "accent" | "light";
}) {
  if (!label || !href) return null;

  return <LinkPill icon="instagram" label={label} note={handle} href={href} tone={tone} />;
}
