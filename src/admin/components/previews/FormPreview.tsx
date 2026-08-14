"use client";

import { useEffect, useRef, useState } from "react";
import type { Form } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { PreviewMode } from "@/components/ui/PreviewMode";
import { RegisterForm } from "@/app/(site)/register/_components/RegisterForm";

/**
 * The form as the page will draw it, shrunk to fit beside the fields.
 *
 * The same `RegisterForm` the public page mounts — not a mock — so a question
 * type that renders wrongly here renders wrongly there too, which is the point.
 * `preview` is what makes it a preview: the questions can be answered, so a
 * rule that hides a question or filters a dropdown can actually be tried, and
 * the send is the only thing blocked.
 *
 * The banner across the top is the one thing the real page does not have. A
 * draft form and an open one look identical from the inside, and the difference
 * — whether anybody can reach it at all — is the thing most worth saying while
 * it is being built.
 */

/** The viewport width the preview pretends to be, as in the other previews. */
const PREVIEW_WIDTH = 1440;

export function FormPreview({
  form,
  showPage = "",
  className,
}: {
  form: Form;
  /**
   * The page open in the builder's outline, so the preview shows the page being
   * edited rather than always the first one. Passed straight through — see the
   * note on `RegisterForm`'s own prop for why it nudges rather than controls.
   */
  showPage?: string;
  className?: string;
}) {
  const paneRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const element = paneRef.current;
    if (!element) return;

    // A zero width is a measurement taken before layout, or while the pane is
    // folded away. Scaling by it would set `zoom: 0` and collapse the preview.
    const measure = () => {
      const width = element.clientWidth;
      if (width > 0) setScale(width / PREVIEW_WIDTH);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={paneRef}
      className={cn("overflow-y-auto rounded-lg border border-border bg-black", className)}
    >
      <div style={{ zoom: scale }} className="origin-top-left">
        <PreviewMode>
          <div className="bg-page p-3">
            <div className="overflow-hidden rounded-card bg-surface">
              {/*
                The COLUMN is a copy; the form inside it is not.
                `RegisterForm` is the real component, so a question always draws
                here exactly as it draws on the site. Everything around it —
                this centred 672px column and the heading above it — is written
                out a second time, because the route's own page also holds the
                entry state, the places-left line and the closed note, none of
                which exist here.

                Which means it can drift, and it did: the register route was
                centred and this was left pinned to the left, so the preview
                showed a layout the site no longer had. Keep this block in step
                with the section in src/app/(site)/register/[slug]/page.tsx.
              */}
              <div className="shell py-16">
                <div className="mx-auto max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">
                    {form.status === "draft"
                      ? "Draft · not reachable yet"
                      : form.status === "closed"
                        ? "Closed · entries have shut"
                        : `Open · /register/${form.slug || "…"}`}
                  </p>

                  <h1 className="headline mt-4 text-[clamp(1.8rem,4vw,3rem)]">
                    {form.intro_title || form.name || "Untitled form"}
                  </h1>

                  {form.intro_body ? (
                    <p className="body-copy mt-4 whitespace-pre-line">{form.intro_body}</p>
                  ) : null}
                </div>

                <div className="mx-auto mt-10 max-w-2xl">
                  {form.status === "closed" ? (
                    <div className="panel-card p-8 text-center">
                      <p className="body-copy">
                        {form.closed_note || "Entries for this one have closed."}
                      </p>
                    </div>
                  ) : (
                    <RegisterForm form={form} preview showPage={showPage} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </PreviewMode>
      </div>
    </div>
  );
}
