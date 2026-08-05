import Image, { type ImageProps } from "next/image";

/**
 * next/image for the paths we control, plain <img> for the ones we don't.
 *
 * Several image fields (brand logo, hero background, each sport's logo, post
 * media) are free-text in the admin editor. next/image throws at render time
 * when handed a remote host that is not in `images.remotePatterns`, which would
 * turn a typo in the CMS into a blank page. So: anything app-relative — or on a
 * host we configured — goes through the optimizer, and anything else degrades
 * to a normal <img> that still carries the right loading hints.
 */

function isOptimizable(src: string): boolean {
  // App-relative asset: always ours, always safe.
  if (src.startsWith("/") && !src.startsWith("//")) return true;

  // Data/blob URLs must never go to the optimizer.
  if (/^(data|blob):/i.test(src)) return false;

  // Remote: only when it matches a host the build was told about.
  try {
    const { hostname } = new URL(src);
    const bucket = process.env.NEXT_PUBLIC_S3_HOSTNAME;
    return Boolean(bucket) && hostname === bucket;
  } catch {
    return false;
  }
}

type SmartImageProps = Omit<ImageProps, "src"> & {
  src: string | null | undefined;
  /** Rendered when there is no src at all, so callers can stay declarative. */
  fallback?: React.ReactNode;
};

export function SmartImage({
  src,
  alt,
  fallback = null,
  className,
  fill,
  width,
  height,
  sizes,
  priority,
  quality,
  style,
  ...rest
}: SmartImageProps) {
  if (!src) return <>{fallback}</>;

  if (isOptimizable(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        className={className}
        sizes={sizes}
        priority={priority}
        quality={quality}
        style={style}
        {...(fill ? { fill: true } : { width: width!, height: height! })}
        {...rest}
      />
    );
  }

  // Unoptimizable source. Keep the same visual contract as the next/image
  // branch: `fill` means "cover the positioned parent".
  const { loading, decoding, ...imgRest } = rest as Record<string, unknown>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={typeof alt === "string" ? alt : ""}
      className={className}
      style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style}
      width={fill ? undefined : (width as number | undefined)}
      height={fill ? undefined : (height as number | undefined)}
      loading={(loading as "lazy" | "eager") ?? (priority ? "eager" : "lazy")}
      decoding={(decoding as "async" | "sync" | "auto") ?? "async"}
      {...(priority ? { fetchPriority: "high" as const } : {})}
      {...(imgRest as Record<string, unknown>)}
    />
  );
}
