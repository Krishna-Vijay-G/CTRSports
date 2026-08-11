"use client";

import { cn } from "@/lib/utils";

/**
 * The admin's whole form vocabulary. Every editor screen is built from these
 * four, which is what keeps the field sizes and label style identical across
 * screens without any of them restating the classes.
 */

/** A titled box. `span` makes it straddle both columns of the editor grid. */
export function Panel({
  title,
  hint,
  span,
  children,
}: {
  title: string;
  hint?: string;
  span?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.02] p-4",
        span && "lg:col-span-2"
      )}
    >
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white">{title}</h2>
        {hint ? <p className="truncate text-[11px] text-white/35">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Two fields side by side. The editor's default row.
 *
 * Keyed off `lg:` rather than `sm:` because that is exactly where the editor
 * becomes a fixed-width side panel; below it the panel is full width and two
 * columns would be too narrow to read a URL in.
 */
export function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 lg:grid-cols-2", className)}>{children}</div>;
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="admin-label">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="admin-field mt-1.5 py-2 text-sm"
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  hint,
  maxLength,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
  maxLength?: number;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="admin-label">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="admin-field mt-1.5 resize-y py-2 text-sm leading-relaxed"
      />
      {hint ? <span className="mt-1 block text-[10px] text-white/30">{hint}</span> : null}
    </label>
  );
}
