"use client";

import {
  BANNER_FITS,
  BANNER_FIT_META,
  BANNER_FOCUS,
  BANNER_FOCUS_LABELS,
  BANNER_OVERLAYS,
  BANNER_OVERLAY_META,
  fitCrops,
  type Banner,
} from "@/lib/banners";
import { cn } from "@/lib/utils";
import { Button } from "@/admin/ui/Button";
import { Label } from "@/admin/ui/Input";
import { Hint, Note } from "@/admin/components/Fields";

/**
 * How a banner's photograph sits in its box, and how dark the wash over it is.
 *
 * Three rows of buttons rather than three dropdowns: each of these is a small
 * fixed set where seeing the options is the whole decision, and a menu that has
 * to be opened to find out what is in it is slower for exactly that case.
 *
 * The focus row appears only for the two ways of filling the box that CROP
 * something. For "Fit" and "Stretch" nothing is cut off, so a control asking
 * which part to keep would be a control that does nothing — which is worse than
 * one that is not there, because it invites the belief that it worked.
 */
export function PictureControls({
  banner,
  onChange,
}: {
  banner: Banner;
  onChange: (patch: Partial<Banner>) => void;
}) {
  const crops = fitCrops(banner.fit);

  return (
    <div className="space-y-3 rounded-md border border-border bg-background/60 p-3">
      <div>
        <Label>Picture</Label>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
          {BANNER_FITS.map((fit) => (
            <Button
              key={fit}
              variant={banner.fit === fit ? "default" : "outline"}
              size="sm"
              onClick={() => onChange({ fit })}
              aria-pressed={banner.fit === fit}
              title={BANNER_FIT_META[fit].description}
            >
              {BANNER_FIT_META[fit].name}
            </Button>
          ))}
        </div>
        <Hint className="mt-1">{BANNER_FIT_META[banner.fit].description}</Hint>
      </div>

      {crops ? (
        <div>
          <Label>Keep</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {BANNER_FOCUS.map((focus) => (
              <Button
                key={focus}
                variant={banner.focus === focus ? "default" : "outline"}
                size="sm"
                onClick={() => onChange({ focus })}
                aria-pressed={banner.focus === focus}
              >
                {BANNER_FOCUS_LABELS[focus]}
              </Button>
            ))}
          </div>
          <Hint className="mt-1">
            Which part of the photograph survives the crop. Use it when the thing that matters —
            a face, the horizon — is near an edge.
          </Hint>
        </div>
      ) : null}

      <div>
        <Label>Darkening</Label>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {BANNER_OVERLAYS.map((overlay) => (
            <Button
              key={overlay}
              variant={banner.overlay === overlay ? "default" : "outline"}
              size="sm"
              onClick={() => onChange({ overlay })}
              aria-pressed={banner.overlay === overlay}
              title={BANNER_OVERLAY_META[overlay].description}
            >
              {BANNER_OVERLAY_META[overlay].name}
            </Button>
          ))}
        </div>
        <Hint className="mt-1">{BANNER_OVERLAY_META[banner.overlay].description}</Hint>
      </div>

      {banner.overlay === "none" ? (
        <Note className={cn("text-destructive")}>
          The headline, the button and the site&rsquo;s own header all sit over this photograph in
          white. With no darkening they are only readable if the picture is dark where they land —
          check the top of the preview, not just the middle.
        </Note>
      ) : null}

      {banner.fit === "stretch" ? (
        <Note className={cn("text-destructive")}>
          Stretch distorts the picture to fit the box. On anything with a person or a car in it
          this is visible immediately — Fill crops instead, which is almost always what is wanted.
        </Note>
      ) : null}
    </div>
  );
}
