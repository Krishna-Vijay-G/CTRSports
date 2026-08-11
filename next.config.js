/** @type {import('next').NextConfig} */

/*
 * No next/image anywhere. Every image is a plain <img> pointing straight at a
 * .webp file that `npm run webp` already sized and compressed, so what ships is
 * what the browser draws. One less moving part, and nothing to resize per
 * request.
 */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        // Assets under /images are replaced by name when they change, so the
        // bytes at a given path are stable and can be cached hard.
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

module.exports = nextConfig;
