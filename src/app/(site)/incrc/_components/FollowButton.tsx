import { LinkPill } from "./LinkPill";

/**
 * Follow the championship on Instagram.
 *
 * The championship's own account, not CTR's — this page is about INCRC, and the
 * handle is the one piece of it that updates between rounds.
 *
 * A fixed chip rather than an editable one, because the introduction's follow
 * button is part of the section's argument ("this is the championship, here is
 * where it lives") rather than a list of places to go. The band at the foot of
 * the page carries THAT — see `family.links`.
 */
export function FollowButton({
  href,
  handle,
  tone = "accent",
}: {
  href: string;
  handle: string;
  tone?: "accent" | "light";
}) {
  return (
    <LinkPill
      icon="instagram"
      label="Follow the championship"
      note={handle}
      href={href}
      tone={tone}
    />
  );
}
