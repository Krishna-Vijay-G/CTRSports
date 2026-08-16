import { PLACEHOLDER_PHOTO } from "@/config/images";
import {
  BODY_MAX,
  image,
  isRecord,
  link,
  list,
  optionalText,
  text,
  withIds,
} from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

export type Post = {
  id: string;
  image: string;
  category: string;
  date: string;
  title: string;
  excerpt: string;
  href: string;
};

export type Posts = { label: string; title: string; ctaLabel: string; ctaHref: string; items: Post[] };

export const MAX_POSTS = 9;

export const BLANK_POSTS: Posts = { label: "", title: "", ctaLabel: "", ctaHref: "", items: [] };

export const posts: SectionModule<Posts> = {
  type: "posts",
  label: "Posts",
  hint: "Newsroom cards — photo, date, headline, excerpt.",
  surface: ["home"],
  multiple: true,
  anchor: "posts",
  promoted: "posts",
  blank: () => ({ ...BLANK_POSTS, items: [] }),
  normalise: (raw) => {
    const d = BLANK_POSTS;
    const value = isRecord(raw) ? raw : {};

    return {
      label: text(value.label, d.label),
      title: text(value.title, d.title),
      ctaLabel: text(value.ctaLabel, d.ctaLabel),
      ctaHref: link(value.ctaHref, d.ctaHref),
      items: withIds(
        list(
          value.items,
          MAX_POSTS,
          (entry) => ({
            id: optionalText(entry.id, 64),
            image: image(entry.image, PLACEHOLDER_PHOTO),
            category: optionalText(entry.category, 40),
            date: optionalText(entry.date, 40),
            title: optionalText(entry.title, BODY_MAX),
            excerpt: optionalText(entry.excerpt, BODY_MAX),
            href: link(entry.href, "#"),
          }),
          d.items
        ),
        "post"
      ),
    };
  },
};
