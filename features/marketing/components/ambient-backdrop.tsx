"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The hero's backdrop.
 *
 * It replaces a CSS perspective grid — a floor of blue lines in vanishing-
 * point projection — which on a phone drew hard diagonals straight through
 * the headline and the buttons. The fix is not a softer grid. A grid is a
 * ruled surface, and ruled surfaces compete with type for the same attention;
 * what a hero wants behind it is depth without edges.
 *
 * So: one full-screen triangle, one fragment shader, two slow orbiting light
 * sources in deep obsidian. No geometry, no lights, no shadows, no post
 * processing — a single draw call whose cost is a few dozen ALU operations
 * per pixel. That is what makes 60fps on a phone a measurement rather than a
 * hope.
 *
 * Four decisions carry the performance:
 *
 * 1. `dpr` is capped at 1.5. A full-screen shader at the iPhone's native 3x
 *    is nine times the fragments for an effect that is deliberately blurry.
 * 2. `frameloop` flips to "never" when the hero scrolls out of view. A
 *    backdrop nobody can see should not cost a frame.
 * 3. Theme changes move uniforms, never React state. The canvas is never
 *    remounted and never re-renders — a MutationObserver reads the new CSS
 *    variables once and `useFrame` eases the colours across. A WebGL context
 *    is expensive to create; throwing one away to change two colours would be
 *    the single worst thing this component could do.
 * 4. Reduced motion freezes the clock rather than hiding the scene, and the
 *    loop drops to on-demand. The composition stays; only the drift stops.
 *
 * It is a background, so there is no blank-hero risk in loading it late: the
 * element underneath is already painted the same obsidian the shader starts
 * from, and the canvas fades in over it.
 */

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Drawn in clip space directly — the plane always fills the viewport, so
    // there is no camera or projection matrix to multiply through.
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision mediump float;

  uniform float uTime;
  uniform vec2  uRes;
  uniform vec3  uBase;
  uniform vec3  uGlowA;
  uniform vec3  uGlowB;
  uniform float uIntensity;

  varying vec2 vUv;

  // A soft radial falloff. smoothstep rather than 1/d so the edge actually
  // reaches zero instead of trailing off into banding.
  float lobe(vec2 p, vec2 c, float r) {
    float d = length(p - c);
    return smoothstep(r, 0.0, d);
  }

  void main() {
    vec2 p = vUv;

    // Aspect correction, or the lobes render as ellipses on a wide viewport.
    vec2 aspect = vec2(uRes.x / max(uRes.y, 1.0), 1.0);

    float t = uTime * 0.045;

    vec2 c1 = vec2(0.26 + 0.10 * sin(t * 1.30), 0.34 + 0.08 * cos(t * 1.10));
    vec2 c2 = vec2(0.78 + 0.09 * cos(t * 0.90), 0.60 + 0.07 * sin(t * 1.50));

    float g1 = lobe(p * aspect, c1 * aspect, 0.62);
    float g2 = lobe(p * aspect, c2 * aspect, 0.50);

    // The headline occupies the upper half, so the light is held off it. The
    // first version lit the whole frame evenly and the type had to fight a
    // blue wash for contrast — which is the complaint the grid earned.
    // Brightest along the floor, gone by the time it reaches the heading.
    float keepOffTheType = smoothstep(0.95, 0.25, p.y);

    // g1 squared keeps the core bright while the skirt falls away fast, which
    // is what stops two overlapping lobes reading as a flat wash.
    vec3 col = uBase;
    col += uGlowA * g1 * g1 * uIntensity * keepOffTheType;
    col += uGlowB * g2 * g2 * uIntensity * 0.70 * keepOffTheType;

    // An ordered-ish dither. On a near-black vertical gradient an 8-bit
    // framebuffer bands into visible steps; half a level of noise costs
    // nothing and removes them completely.
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (n - 0.5) * 0.010;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Reads a CSS custom property off <html> and returns it as a THREE.Color. */
function readColor(name: string, fallback: string): THREE.Color {
  if (typeof window === "undefined") return new THREE.Color(fallback);
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) return new THREE.Color(fallback);
  try {
    // THREE.Color handles hex and rgb() alike; anything exotic falls through.
    return new THREE.Color(raw);
  } catch {
    return new THREE.Color(fallback);
  }
}

function Field({ reduceMotion }: { reduceMotion: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { size, invalidate } = useThree();

  // Where the colours are heading. Mutated by the observer below, never by
  // React, so a theme change costs no render anywhere in the tree.
  const target = useRef({
    base: new THREE.Color("#050609"),
    glowA: new THREE.Color("#4d8bf8"),
    glowB: new THREE.Color("#19c08a"),
    intensity: 0.15,
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uBase: { value: new THREE.Color("#050609") },
      uGlowA: { value: new THREE.Color("#4d8bf8") },
      uGlowB: { value: new THREE.Color("#19c08a") },
      uIntensity: { value: 0.15 },
    }),
    [],
  );

  useEffect(() => {
    const sync = () => {
      const light = !document.documentElement.classList.contains("dark");
      target.current.base = light
        ? readColor("--canvas", "#fafaf9")
        : // Deeper than --canvas on purpose: the hero is the one place the
          // page is allowed to go darker than its own surface colour.
          new THREE.Color("#050609");
      target.current.glowA = readColor("--accent", "#4d8bf8");
      target.current.glowB = readColor("--positive", "#19c08a");
      // On white, the same intensity would read as two grey smudges.
      target.current.intensity = light ? 0.05 : 0.15;
      invalidate();
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [invalidate]);

  useFrame((state, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;

    if (!reduceMotion) u.uTime.value += delta;
    u.uRes.value.set(size.width, size.height);

    // Ease rather than snap: a hard colour cut on a full-screen element is
    // the one thing that would make the theme switch look broken.
    const k = Math.min(1, delta * 6);
    (u.uBase.value as THREE.Color).lerp(target.current.base, k);
    (u.uGlowA.value as THREE.Color).lerp(target.current.glowA, k);
    (u.uGlowB.value as THREE.Color).lerp(target.current.glowB, k);
    u.uIntensity.value += (target.current.intensity - u.uIntensity.value) * k;
  });

  return (
    <mesh frustumCulled={false}>
      {/* Two triangles covering clip space. The vertex shader ignores the
          camera entirely, so the size here is nominal. */}
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export function AmbientBackdrop({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className={className}
      // The canvas fades in over an already-correct background, so there is
      // never a flash of a different colour.
      style={{ opacity: ready ? 1 : 0, transition: "opacity 600ms ease" }}
    >
      <Canvas
        // "never" while off-screen; on-demand when the user asked for less
        // motion, so it paints once and then sits idle.
        frameloop={!visible ? "never" : reduceMotion ? "demand" : "always"}
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "low-power",
          depth: false,
          stencil: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor("#050609", 1);
          setReady(true);
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Field reduceMotion={reduceMotion} />
      </Canvas>
    </div>
  );
}
