"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { MediaPost } from "@/lib/posts";
import { cn } from "@/lib/utils";

/**
 * Renders a post's media, whichever kind it is. Videos autoplay muted and loop
 * (the only form of autoplay browsers allow); the caller owns the mute state so
 * a single control in the banner can unmute the slide that is on screen.
 */
export function PostMedia({
  post,
  fit = "cover",
  className,
  sizing = "fill",
  muted = true,
  reducedMotion = false,
  kenBurns = false,
  priority = false,
}: {
  post: MediaPost;
  fit?: "cover" | "contain";
  className?: string;
  /**
   * `fill` stretches to the parent box. `natural` lets the media keep its own
   * aspect ratio and be bounded by the caller's max-width/height — use it when
   * a frame should hug the media instead of letterboxing it.
   */
  sizing?: "fill" | "natural";
  muted?: boolean;
  reducedMotion?: boolean;
  kenBurns?: boolean;
  priority?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fitClass = fit === "contain" ? "object-contain" : "object-cover";
  const sizeClass = sizing === "natural" ? "block h-auto w-auto" : "h-full w-full";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (!muted) void video.play().catch(() => undefined);
  }, [muted]);

  if (post.media_type === "video") {
    return (
      <video
        ref={videoRef}
        src={post.media_url}
        poster={post.poster_url ?? undefined}
        // `muted` must be on the element for autoplay to be permitted at all.
        muted
        autoPlay={!reducedMotion}
        loop
        playsInline
        preload={priority ? "auto" : "metadata"}
        className={cn(sizeClass, fitClass, className)}
      />
    );
  }

  if (kenBurns && !reducedMotion) {
    return (
      <motion.img
        src={post.media_url}
        alt={post.title}
        initial={{ scale: 1.09 }}
        animate={{ scale: 1 }}
        transition={{ duration: 9, ease: "linear" }}
        className={cn(sizeClass, fitClass, className)}
        loading={priority ? "eager" : "lazy"}
      />
    );
  }

  return (
    <img
      src={post.media_url}
      alt={post.title}
      className={cn(sizeClass, fitClass, className)}
      loading={priority ? "eager" : "lazy"}
    />
  );
}
