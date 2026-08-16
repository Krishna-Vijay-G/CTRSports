import type { ReactNode } from "react";
import { onSurface, type Section } from "@/lib/sections/document";
import { SECTION_MODULES } from "@/lib/sections/registry";
import { SECTION_VIEWS } from "@/lib/sections/views";
import type { SectionRecords } from "@/lib/sections/types";

/**
 * The body of a page, drawn from its sections.
 *
 * This is what the 15-arm `switch` in IncrcSections.tsx became, and what the
 * landing page's hardcoded run of JSX became. The public route and the console's
 * preview both render THIS, which is what stops the preview drifting from the
 * site — and there is now only one of it for every page there will ever be.
 *
 * A section that is switched off is not rendered at all, not hidden with CSS, so
 * it costs nothing and its anchor is genuinely absent from the page.
 *
 * `data-preview` is the section's id — its instance, not its kind, because a
 * page may carry two of a kind and the preview has to scroll to the one being
 * edited. It does nothing on the live page.
 *
 * ── Where the header goes ─────────────────────────────────────────────────
 *
 * Above everything, unless the first visible section says it carries the header
 * itself — the banners do, laying the navigation over the photograph. That
 * decision belongs to the section rather than the route; see `carriesHeader`.
 */
export function PageSections({
  sections,
  records,
  header,
}: {
  sections: readonly Section[];
  records: SectionRecords;
  /** The site header. Omitted by the preview panes that draw their own. */
  header?: ReactNode;
}) {
  /*
   * Drawn, on the page, in order.
   *
   * A section with no view is skipped BEFORE the first one is picked, and that
   * ordering is load-bearing: the page's identity is a section of the home
   * surface that renders nothing, and it sorts to the front. Picked as "first"
   * it would take the header the banners are meant to carry, and the navigation
   * would draw as a solid bar above the carousel instead of over it.
   */
  const visible = onSurface(sections, "home").filter(
    (section) => section.visible && SECTION_VIEWS[section.type]
  );
  const first = visible[0];
  const overlaid = Boolean(first && SECTION_MODULES[first.type].carriesHeader);

  return (
    <>
      {header && !overlaid ? (
        <div className="relative z-20 border-b border-line bg-surface">{header}</div>
      ) : null}

      {visible.map((section) => {
        const View = SECTION_VIEWS[section.type]!;

        return (
          <div key={section.id} data-preview={section.id}>
            <View
              value={section.data}
              records={records}
              header={overlaid && section === first ? header : undefined}
            />
          </div>
        );
      })}
    </>
  );
}
