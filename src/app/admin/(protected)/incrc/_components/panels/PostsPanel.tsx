"use client";

import { MAX_POSTS, type IncrcContent, type Post } from "@/lib/incrcContent";
import { ButtonFields, Field, Panel, Row, TextArea } from "@/components/admin/Fields";
import { ImageField } from "@/components/admin/ImageField";
import { Repeater } from "@/components/admin/Repeater";

type Posts = IncrcContent["posts"];

export function PostsPanel({ value, onChange }: { value: Posts; onChange: (next: Posts) => void }) {
  const set = (patch: Partial<Posts>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Heading">
        <div className="space-y-3">
          <Field label="Label" value={value.label} onChange={(label) => set({ label })} />
          <Field label="Title" value={value.title} onChange={(title) => set({ title })} />
          <ButtonFields
            hint="beside the heading"
            label={value.ctaLabel}
            href={value.ctaHref}
            onLabel={(ctaLabel) => set({ ctaLabel })}
            onHref={(ctaHref) => set({ ctaHref })}
          />
        </div>
      </Panel>

      <Repeater<Post>
        title="Posts"
        addLabel="Add post"
        items={value.items}
        max={MAX_POSTS}
        onChange={(items) => set({ items })}
        blank={() => ({
          id: crypto.randomUUID(),
          image: "",
          category: "",
          date: "",
          title: "",
          excerpt: "",
          href: "#",
        })}
        keyOf={(item) => item.id}
        summary={(post, index) => ({
          title: post.title || `Post ${index + 1}`,
          hint: [post.category, post.date].filter(Boolean).join(" · "),
          image: post.image,
        })}
        empty="No posts — the whole section is left off the page."
        note="Three across on a laptop, so multiples of three fill the row. The whole card is the link."
      >
        {(post, index, patch) => (
          <>
            <ImageField label="Photo" value={post.image} onChange={(image) => patch({ image })} />
            <Row>
              <Field
                label="Category"
                value={post.category}
                onChange={(category) => patch({ category })}
                maxLength={40}
                hint="The chip on the photo."
              />
              <Field
                label="Date"
                value={post.date}
                onChange={(date) => patch({ date })}
                maxLength={40}
                hint="Written as you want it read."
              />
            </Row>
            <TextArea
              label="Headline"
              value={post.title}
              onChange={(title) => patch({ title })}
              rows={2}
              placeholder={`Post ${index + 1}`}
            />
            <TextArea
              label="Excerpt"
              value={post.excerpt}
              onChange={(excerpt) => patch({ excerpt })}
              rows={3}
            />
            <Field
              label="Links to"
              value={post.href}
              onChange={(href) => patch({ href })}
              placeholder="https://…"
            />
          </>
        )}
      </Repeater>
    </>
  );
}
