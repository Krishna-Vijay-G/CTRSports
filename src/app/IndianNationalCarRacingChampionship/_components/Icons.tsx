import type { IconKey } from "../_data/biography";

interface IconProps {
  name: IconKey;
  className?: string;
}

/**
 * Line-style motorsport icon set used across chapter cards & timelines.
 * All icons are 24×24, `currentColor` stroked, and decorative by default.
 */
export function Icon({ name, className = "w-6 h-6" }: IconProps) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "people":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="M16 6a3 3 0 0 1 0 5.5" />
          <path d="M17 14.2A6 6 0 0 1 21.5 20" />
        </svg>
      );
    case "route":
      return (
        <svg {...common}>
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="5" r="2" />
          <path d="M7 19h6a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h4" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
          <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
          <path d="M9 20h6M10 16h4l.5 4h-5z" />
        </svg>
      );
    case "flag":
      return (
        <svg {...common}>
          <path d="M5 21V4" />
          <path d="M5 4h13l-2.5 4L18 12H5" />
        </svg>
      );
    case "building":
      return (
        <svg {...common}>
          <rect x="5" y="3" width="14" height="18" rx="1" />
          <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" />
        </svg>
      );
    case "handshake":
      return (
        <svg {...common}>
          <path d="M11 6 8 9a2 2 0 0 0 0 3l1 1 3-3" />
          <path d="m13 6 3-1 5 5-2 2-2-1-3 3a1.6 1.6 0 0 1-2.3 0l-.7-.7" />
          <path d="m3 10 3 3M2 9l4 4" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20V4M4 20h16" />
          <path d="M8 16v-3M12 16V9M16 16v-6M20 16V6" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18" />
        </svg>
      );
    case "wheel":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 3v6M4.5 17l5-3.4M19.5 17l-5-3.4" />
        </svg>
      );
    case "cap":
      return (
        <svg {...common}>
          <path d="M12 4 2 9l10 5 10-5-10-5Z" />
          <path d="M6 11v4c0 1.5 2.7 3 6 3s6-1.5 6-3v-4M22 9v5" />
        </svg>
      );
    case "medal":
      return (
        <svg {...common}>
          <circle cx="12" cy="15" r="5" />
          <path d="M12 13.4 13 15l-1 1-1-1 1-1.6M8.5 3 12 8M15.5 3 12 8" />
        </svg>
      );
    default:
      return null;
  }
}
