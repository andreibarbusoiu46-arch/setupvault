"use client";

import dynamic from "next/dynamic";

/**
 * A client boundary whose only job is to hold the `ssr: false` import.
 *
 * `next/dynamic` with `ssr: false` is rejected inside a Server Component, and
 * the hero is one. WebGL genuinely cannot server-render, and skipping it
 * costs nothing here: the section underneath is already painted the colour
 * the shader starts from, so the canvas fades in over itself.
 */
const AmbientBackdrop = dynamic(
  () =>
    import("@/features/marketing/components/ambient-backdrop").then(
      (m) => m.AmbientBackdrop,
    ),
  { ssr: false },
);

export function AmbientBackdropMount({ className }: { className?: string }) {
  return <AmbientBackdrop className={className} />;
}
