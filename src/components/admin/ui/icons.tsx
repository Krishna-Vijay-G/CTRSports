/**
 * Every icon the admin uses, in one file.
 *
 * Hand-drawn on a 20px grid in the manner of Phosphor's regular weight — one
 * stroke width, round caps, no fills. Inline rather than a dependency: there are
 * about twenty of them, and an icon package would ship a thousand.
 *
 * They take their size from the button or text around them (`size-4` by
 * default, set by the Button component) and their colour from `currentColor`,
 * so an icon never needs a class of its own.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

/* ── Sections ── */

export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 2.5 3.6 5.2v4.5c0 3.4 2.6 6.4 6.4 7.6 3.8-1.2 6.4-4.2 6.4-7.6V5.2Z" />
    <path d="m7.7 10 1.7 1.7 3.3-3.4" />
  </Icon>
);

export const MonitorIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.6" y="4" width="14.8" height="9.8" rx="1.6" />
    <path d="M7 17h6M10 13.8V17" />
  </Icon>
);

export const ListIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.6 6h12.8M3.6 10h12.8M3.6 14h8" />
  </Icon>
);

export const ImagesIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.4" y="5.2" width="12" height="9.6" rx="1.6" />
    <path d="m2.4 12 2.9-2.6 2.7 2.4 2.2-1.9 4.2 3.6" />
    <path d="M6.6 3h9a2 2 0 0 1 2 2v7.4" />
  </Icon>
);

export const TextIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.6 4.6h12.8M3.6 8h12.8M3.6 11.4h9M3.6 14.8h6" />
  </Icon>
);

export const TrophyIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.2 3.2h7.6v3.6a3.8 3.8 0 0 1-7.6 0Z" />
    <path d="M6.2 4.3H3.7v1.4a2.5 2.5 0 0 0 2.5 2.5M13.8 4.3h2.5v1.4a2.5 2.5 0 0 1-2.5 2.5" />
    <path d="M10 10.6v2.7M7 17h6l-.7-3.1H7.7Z" />
  </Icon>
);

export const BoltIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.8 2.5 4.6 11h4.1l-.5 6.4 6.8-8.5h-4.1Z" />
  </Icon>
);

export const GlobeIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10" cy="10" r="7.2" />
    <path d="M2.9 10h14.2M10 2.9c1.9 2 2.9 4.4 2.9 7.1s-1 5.1-2.9 7.1c-1.9-2-2.9-4.4-2.9-7.1s1-5.1 2.9-7.1Z" />
  </Icon>
);

/* ── Actions ── */

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 4.2v11.6M4.2 10h11.6" />
  </Icon>
);

export const XIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 5l10 10M15 5 5 15" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m4.5 10.5 3.6 3.6L15.5 6.7" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.6 5.4h12.8M8.1 5.4V3.8h3.8v1.6M4.9 5.4l.8 10a1.4 1.4 0 0 0 1.4 1.3h5.8a1.4 1.4 0 0 0 1.4-1.3l.8-10" />
    <path d="M8.4 8.4v5.2M11.6 8.4v5.2" />
  </Icon>
);

export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 12.8V3.6M6.6 7 10 3.6 13.4 7" />
    <path d="M3.6 12.4v2.6a1.4 1.4 0 0 0 1.4 1.4h10a1.4 1.4 0 0 0 1.4-1.4v-2.6" />
  </Icon>
);

export const FolderIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.8 6a1.4 1.4 0 0 1 1.4-1.4h3l1.8 2h6.8A1.4 1.4 0 0 1 17.2 8v6.6a1.4 1.4 0 0 1-1.4 1.4H4.2a1.4 1.4 0 0 1-1.4-1.4Z" />
  </Icon>
);

export const EyeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M1.9 10S5 4.8 10 4.8 18.1 10 18.1 10 15 15.2 10 15.2 1.9 10 1.9 10Z" />
    <circle cx="10" cy="10" r="2.4" />
  </Icon>
);

export const EyeSlashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.4 5.6C2.8 7 1.9 10 1.9 10s3.1 5.2 8.1 5.2c1.5 0 2.8-.5 3.9-1.1M16 12.4c1.4-1.3 2.1-2.4 2.1-2.4S15 4.8 10 4.8c-.6 0-1.2.1-1.7.2" />
    <path d="m3.4 3.4 13.2 13.2" />
  </Icon>
);

export const SignOutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 6.2V4.4A1.4 1.4 0 0 0 11.6 3H4.9a1.4 1.4 0 0 0-1.4 1.4v11.2A1.4 1.4 0 0 0 4.9 17h6.7a1.4 1.4 0 0 0 1.4-1.4v-1.8" />
    <path d="M8.6 10h8.2M14.2 7.4 16.8 10l-2.6 2.6" />
  </Icon>
);

export const ExternalIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11.4 3.4h5.2v5.2M16.6 3.4 9.4 10.6" />
    <path d="M14.4 11.6v4a1.4 1.4 0 0 1-1.4 1.4H4.4A1.4 1.4 0 0 1 3 15.6V7a1.4 1.4 0 0 1 1.4-1.4h4" />
  </Icon>
);

/* ── Movement ── */

export const CaretDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 7.5 5 5 5-5" />
  </Icon>
);

/** The drag handle. Filled, not stroked — six dots read better solid. */
export const DragIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...p}>
    <circle cx="7.5" cy="5" r="1.4" />
    <circle cx="12.5" cy="5" r="1.4" />
    <circle cx="7.5" cy="10" r="1.4" />
    <circle cx="12.5" cy="10" r="1.4" />
    <circle cx="7.5" cy="15" r="1.4" />
    <circle cx="12.5" cy="15" r="1.4" />
  </svg>
);
