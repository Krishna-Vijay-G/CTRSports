/** @type {import('next').NextConfig} */

// Post media is uploaded to S3 (optionally fronted by CloudFront via
// S3_PUBLIC_BASE_URL), so next/image has to be told those hosts are allowed.
// Derived from the same env vars s3.ts uses, so there is one source of truth.
const remotePatterns = [];

if (process.env.S3_PUBLIC_BASE_URL) {
  try {
    const { protocol, hostname } = new URL(process.env.S3_PUBLIC_BASE_URL);
    remotePatterns.push({ protocol: protocol.replace(":", ""), hostname });
  } catch {
    // A malformed override should not take the build down.
  }
}

if (process.env.S3_BUCKET && process.env.S3_REGION) {
  remotePatterns.push({
    protocol: "https",
    hostname: `${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com`,
  });
}

const nextConfig = {
  reactStrictMode: true,

  // SmartImage needs to know, in the browser, which remote host is safe to send
  // through the optimizer. Mirrors the first configured remote pattern.
  env: {
    NEXT_PUBLIC_S3_HOSTNAME: remotePatterns[0]?.hostname ?? "",
  },

  images: {
    // Previously `unoptimized: true` — a leftover from an earlier static export
    // (there is no `output: "export"` any more). It meant every original shipped
    // at full size: a 6000x4000 hero, 1343px logos drawn at 36px.
    formats: ["image/avif", "image/webp"],
    remotePatterns,
    // Matches the real breakpoints in the layouts rather than the defaults, so
    // fewer variants get generated and cached.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2560],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  async headers() {
    return [
      {
        // Art under these roots is replaced by name when it changes, so the
        // bytes at a given path are stable and can be cached hard.
        source: "/:dir(images|media|video)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

module.exports = nextConfig;
