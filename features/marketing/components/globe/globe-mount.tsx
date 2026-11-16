"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The client boundary that holds the `ssr: false` import, and the still
 * sphere underneath it.
 *
 * The fallback is not a device decision. It is painted immediately so the
 * frame is never empty, and it fades out the moment the canvas reports a
 * live context — so what shows through is a missing GPU or a lost context,
 * never a small screen. The 3D globe renders at every width.
 *
 * Fading rather than unmounting: if the context is lost later the sphere is
 * still there to come back to, and there is no layout change either way.
 */
const ParticleGlobe = dynamic(
  () =>
    import("@/features/marketing/components/globe/particle-globe").then(
      (m) => m.ParticleGlobe,
    ),
  { ssr: false },
);

export function GlobeMount({ className }: { className?: string }) {
  const [live, setLive] = useState(false);
  const onStatus = useCallback(
    (status: "ready" | "lost") => setLive(status === "ready"),
    [],
  );

  return (
    <div className={cn("relative", className)}>
      <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
        <div
          className={cn(
            "aspect-square w-[78%] rounded-full transition-opacity duration-700",
            live ? "opacity-0" : "opacity-80",
          )}
          style={{
            // The same light the shader describes: a cool shoulder up and to
            // the right, falling to a terminator and a dark limb.
            background:
              "radial-gradient(circle at 66% 34%, #51D8FF 0%, #3478F6 24%, #123a86 46%, #081b3e 66%, #040a16 86%)",
            boxShadow:
              "inset -16px -16px 56px rgba(4,10,22,0.92), 0 0 80px rgba(52,120,246,0.25)",
          }}
        />
      </div>

      <ParticleGlobe className="absolute inset-0" onStatus={onStatus} />
    </div>
  );
}
