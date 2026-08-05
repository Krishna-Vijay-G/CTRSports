/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  // No next/image anywhere — every image is a plain <img> pointing straight at
  // the file. Sources are pre-sized and compressed by `npm run optimize-media`
  // instead, so what ships is already the right resolution for how it is drawn.

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
