"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The hero globe: a sphere described entirely in particles, lit from one side.
 *
 * Three decisions carry most of the look.
 *
 * First, the points are lit rather than uniform. A vertex shader takes the
 * dot of each point's normal against a fixed light direction and uses it to
 * set both brightness and size, so the sphere has a lit cap, a terminator and
 * a dim far side. Without that it reads as a flat disc of dots — which is the
 * generic spinning-globe illustration the brief rules out.
 *
 * Second, nothing here re-renders. The geometry is built once, and the only
 * per-frame work is a rotation on a group and a write into one small typed
 * array for the travelling pulses. No setState runs inside the loop.
 *
 * Third, the globe is scaled from the measured viewport rather than hidden
 * below a breakpoint. The diameter is solved against the camera frustum each
 * time the canvas resizes, so the same scene fits a 375px phone and a 1920px
 * display. There is no `display: none`, no static image and no conditional
 * that removes it on small screens; the only thing that changes on a phone is
 * how many particles there are and how high the pixel ratio goes.
 */

const RADIUS = 1;
/**
 * Where the light comes from, in view space: up and to the right of the
 * camera, tilted forward. The shaders assume it is already unit length.
 */
const LIGHT = new THREE.Vector3(0.42, 0.38, 0.84).normalize();

/* ── Geometry ────────────────────────────────────────────────────────────── */

/**
 * Points spread over a sphere by the golden angle.
 *
 * An evenly spaced lattice is what makes the surface read as one object
 * rather than as scattered noise, but a perfect lattice moirés as it turns.
 * A small random push along each normal breaks the regularity without
 * loosening the shape.
 */
function sphereField(count: number) {
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const seed = new Float32Array(count);

  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;

    // Pushed off the lattice along the surface, not just in and out.
    //
    // A radial jitter alone left the golden-angle spiral plainly visible as
    // curved rows once the points were small enough to resolve individually.
    // The arms are an artefact of the construction, not a feature of a
    // sphere, so the offset has to be tangential to hide them. A third of the
    // mean spacing is enough to break the pattern and not enough to loosen
    // the shape.
    const spacing = (2.2 / Math.sqrt(count)) * 0.34;
    const nx = Math.cos(theta) * ring + (Math.random() - 0.5) * spacing;
    const ny = y + (Math.random() - 0.5) * spacing;
    const nz = Math.sin(theta) * ring + (Math.random() - 0.5) * spacing;

    const length = Math.hypot(nx, ny, nz) || 1;
    const ux = nx / length;
    const uy = ny / length;
    const uz = nz / length;

    const jitter = RADIUS * (1 + (Math.random() - 0.5) * 0.01);

    position[i * 3] = ux * jitter;
    position[i * 3 + 1] = uy * jitter;
    position[i * 3 + 2] = uz * jitter;

    normal[i * 3] = ux;
    normal[i * 3 + 1] = uy;
    normal[i * 3 + 2] = uz;

    seed[i] = Math.random();
  }

  return { position, normal, seed };
}

/** A great-circle arc lifted off the surface, sampled into points. */
function arc(a: THREE.Vector3, b: THREE.Vector3, samples: number) {
  const lift = 1 + a.distanceTo(b) * 0.22;
  const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(RADIUS * lift);
  const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
  return curve.getPoints(samples - 1);
}

/**
 * A handful of connections between points that are far enough apart to read
 * as a route and close enough not to wrap behind the globe.
 */
function arcField(count: number, samples: number) {
  const curves: THREE.Vector3[][] = [];
  let guard = 0;

  while (curves.length < count && guard++ < count * 40) {
    const a = new THREE.Vector3().randomDirection().multiplyScalar(RADIUS);
    const b = new THREE.Vector3().randomDirection().multiplyScalar(RADIUS);
    const spread = a.angleTo(b);
    if (spread < 0.7 || spread > 2.1) continue;
    curves.push(arc(a, b, samples));
  }

  // Lines as segment pairs, with an alpha that fades towards both ends so an
  // arc arrives and leaves rather than being switched on.
  const segments = curves.length * (samples - 1) * 2;
  const position = new Float32Array(segments * 3);
  const alpha = new Float32Array(segments);

  let s = 0;
  for (const points of curves) {
    for (let i = 0; i < points.length - 1; i++) {
      for (const [p, at] of [
        [points[i], i],
        [points[i + 1], i + 1],
      ] as const) {
        position[s * 3] = p.x;
        position[s * 3 + 1] = p.y;
        position[s * 3 + 2] = p.z;
        // 0 at the ends, 1 in the middle.
        alpha[s] = Math.sin((at / (samples - 1)) * Math.PI) ** 0.7;
        s++;
      }
    }
  }

  return { curves, position, alpha };
}

/* ── Shaders ─────────────────────────────────────────────────────────────── */

const POINT_VERT = /* glsl */ `
  attribute vec3 aNormal;
  attribute float aSeed;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uLight;
  uniform float uTime;
  // 1 for the travelling pulses, which are their own light source and must
  // not dim as they cross the terminator.
  uniform float uFlat;
  varying float vLit;
  varying float vSeed;

  void main() {
    // The light is in VIEW space, not model space.
    //
    // Fixing it to the globe looked correct in a still frame and wrong in
    // motion: the lit cap rotated away within a few seconds and left the
    // camera looking at the terminator, so the sphere read as a dark disc
    // with a bright rim. A view-space light keeps the lit shoulder towards
    // the viewer while the surface turns underneath it, which is how a lit
    // body actually behaves when the light is not attached to it.
    vec3 n = normalize(normalMatrix * aNormal);
    float lit = mix(clamp(dot(n, uLight), 0.0, 1.0), 1.0, uFlat);
    vLit = lit;
    vSeed = aSeed;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);

    // A slow breath, offset per point, so the field is never completely
    // still without anything visibly moving.
    float breath = 0.9 + 0.1 * sin(uTime * 0.6 + aSeed * 6.283);

    // uSize is in world units and divided by depth, so this resolves to a
    // few device pixels. It was two orders of magnitude larger at first —
    // 62 over a depth of 3.2, doubled for the pixel ratio, is a 38px sprite,
    // and nine thousand of those additively blended is not a sphere, it is a
    // white disc. Perspective attenuation is the point: near points are a
    // little larger than far ones, and that alone carries most of the depth.
    float size = uSize * (0.55 + lit * 0.85) * breath * (0.75 + aSeed * 0.5);

    gl_PointSize = max(1.0, size * uPixelRatio / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uDeep;
  uniform vec3 uBright;
  uniform float uOpacity;
  varying float vLit;
  varying float vSeed;

  void main() {
    // A soft round sprite with a core, rather than a linear fade, which
    // leaves a grey halo once thousands of them overlap.
    vec2 d = gl_PointCoord - 0.5;
    float r = dot(d, d) * 4.0;
    float mask = 1.0 - smoothstep(0.25, 1.0, r);
    if (mask < 0.01) discard;

    // Cyan is reserved for the lit shoulder and for a scattered few, so the
    // surface cools towards the light rather than being two-tone.
    float warmth = smoothstep(0.62, 1.0, vLit) * 0.85 + step(0.985, vSeed) * 0.6;
    vec3 colour = mix(uDeep, uBright, clamp(warmth, 0.0, 1.0));

    // The floor is what keeps the unlit side present rather than absent: a
    // sphere whose dark half vanishes completely reads as a crescent.
    float alpha = mask * uOpacity * (0.2 + vLit * 0.8);
    gl_FragColor = vec4(colour, alpha);
  }
`;

const LINE_VERT = /* glsl */ `
  attribute float aAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const LINE_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColour;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColour, vAlpha * uOpacity);
  }
`;

/** A fresnel shell: transparent head-on, luminous at the limb. */
const GLOW_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const GLOW_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColour;
  uniform float uStrength;
  uniform vec3 uLight;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 n = normalize(vNormal);
    float rim = 1.0 - abs(dot(n, normalize(vView)));
    float f = pow(rim, 5.0);

    // The limb is only lit where the light reaches it. An even ring all the
    // way round is the giveaway of a shader glow rather than a lit body —
    // it outlines the sphere instead of describing which way it is facing.
    float lit = clamp(dot(n, uLight), 0.0, 1.0);
    f *= 0.18 + 0.82 * lit;

    gl_FragColor = vec4(uColour, f * uStrength);
  }
`;

/* ── Scene ───────────────────────────────────────────────────────────────── */

interface SceneProps {
  particles: number;
  arcs: number;
  deep: THREE.Color;
  bright: THREE.Color;
  still: boolean;
}

const ARC_SAMPLES = 42;
const PULSES_PER_ARC = 1;

function Globe({ particles, arcs, deep, bright, still }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const { size, viewport, camera } = useThree();

  const field = useMemo(() => sphereField(particles), [particles]);
  const lines = useMemo(() => arcField(arcs, ARC_SAMPLES), [arcs]);

  /* Geometry, built once and disposed by hand. R3F disposes what it creates;
     anything made here is ours to clean up or it survives a route change. */
  const pointGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(field.position, 3));
    g.setAttribute("aNormal", new THREE.BufferAttribute(field.normal, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(field.seed, 1));
    return g;
  }, [field]);

  const lineGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(lines.position, 3));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(lines.alpha, 1));
    return g;
  }, [lines]);

  const pulseCount = lines.curves.length * PULSES_PER_ARC;
  const pulseGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pulseCount * 3), 3));
    // Facing the camera, not zero: the vertex shader normalises this, and
    // normalising a zero vector is a division by zero that takes the whole
    // point out of the frame.
    const facing = new Float32Array(pulseCount * 3);
    for (let i = 0; i < pulseCount; i++) facing[i * 3 + 2] = 1;
    g.setAttribute("aNormal", new THREE.BufferAttribute(facing, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(pulseCount).fill(0.5), 1));
    return g;
  }, [pulseCount]);

  const pointMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: POINT_VERT,
        fragmentShader: POINT_FRAG,
        transparent: true,
        depthWrite: false,
        // Normal, not additive. Additive was tried and is what turned the
        // surface into a green moiré: thousands of overlapping cyan sprites
        // sum past saturation long before they describe a shape, and the
        // limb — where the field is densest in screen space — blows out to a
        // white ring. Additive is kept for the pulses, where there are a
        // dozen sprites and glowing is the point.
        blending: THREE.NormalBlending,
        uniforms: {
          uSize: { value: 9 },
          uPixelRatio: { value: 1 },
          uLight: { value: LIGHT.clone() },
          uTime: { value: 0 },
          uFlat: { value: 0 },
          uDeep: { value: deep.clone() },
          uBright: { value: bright.clone() },
          uOpacity: { value: 1 },
        },
      }),
    [deep, bright],
  );

  const pulseMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: POINT_VERT,
        fragmentShader: POINT_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uSize: { value: 26 },
          uPixelRatio: { value: 1 },
          uLight: { value: LIGHT.clone() },
          uTime: { value: 0 },
          // Unlit, so a pulse never fades out halfway along its arc.
          uFlat: { value: 1 },
          uDeep: { value: bright.clone() },
          uBright: { value: new THREE.Color("#ffffff") },
          uOpacity: { value: 0.85 },
        },
      }),
    [bright],
  );

  const lineMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: LINE_VERT,
        fragmentShader: LINE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColour: { value: bright.clone() },
          uOpacity: { value: 0.42 },
        },
      }),
    [bright],
  );

  const glowMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColour: { value: deep.clone() },
          // Strong, because it is now only a few pixels wide. The broad,
          // weak version read as haze; a narrow bright one reads as a lit
          // edge, which is what gives the globe its roundness.
          uStrength: { value: 1.15 },
          uLight: { value: LIGHT.clone() },
        },
      }),
    [deep],
  );

  useEffect(
    () => () => {
      for (const o of [
        pointGeometry,
        lineGeometry,
        pulseGeometry,
        pointMaterial,
        pulseMaterial,
        lineMaterial,
        glowMaterial,
      ]) {
        o.dispose();
      }
    },
    [
      pointGeometry,
      lineGeometry,
      pulseGeometry,
      pointMaterial,
      pulseMaterial,
      lineMaterial,
      glowMaterial,
    ],
  );

  /* Fit.
     The globe is scaled so its diameter is a fixed share of the smaller
     frustum dimension. That is what lets one scene serve a 375px phone and a
     1920px display without a breakpoint deciding whether it appears at all. */
  const fit = useMemo(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    const h = 2 * Math.tan((perspective.fov * Math.PI) / 180 / 2) * perspective.position.z;
    const w = h * (size.width / Math.max(1, size.height));
    // A touch more of the frame on a phone, where the globe is the whole
    // composition rather than one half of it.
    const share = size.width < 640 ? 0.84 : 0.78;
    return (share * Math.min(w, h)) / (RADIUS * 2);
  }, [camera, size.width, size.height]);

  /* The loop. One rotation, one eased pointer offset, one typed-array write.

     Everything below writes straight into GPU objects on purpose: that is
     what keeps a running animation at zero React renders. The compiler's
     immutability rule models memoised values as frozen, which is right for
     application state and wrong for a scene graph, so it is turned off for
     this function rather than for the file. */
  /* eslint-disable react-hooks/immutability */
  const pointer = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    // Sized here rather than in an effect. Points are measured in screen
    // space, so a small canvas needs smaller dots or the sphere becomes a
    // solid ball of light — and four assignments a frame is cheaper than a
    // resize effect that re-runs the render.
    const ratio = Math.min(viewport.dpr ?? 1, 2);
    const narrow = size.width < 640;
    pointMaterial.uniforms.uPixelRatio.value = ratio;
    pulseMaterial.uniforms.uPixelRatio.value = ratio;
    pointMaterial.uniforms.uSize.value = narrow ? 7 : 9;
    pulseMaterial.uniforms.uSize.value = narrow ? 20 : 26;

    const g = group.current;
    if (!g) return;

    const t = state.clock.elapsedTime;
    pointMaterial.uniforms.uTime.value = t;

    if (!still) {
      // Clamped because a backgrounded tab hands back one enormous delta,
      // which would otherwise snap the globe round on return.
      const step = Math.min(delta, 0.05);
      g.rotation.y += step * 0.085;

      // Pointer parallax, eased rather than tied directly to the cursor:
      // a value that tracks exactly reads as a mechanism, not as weight.
      pointer.current.x += (state.pointer.x - pointer.current.x) * Math.min(1, step * 2.4);
      pointer.current.y += (state.pointer.y - pointer.current.y) * Math.min(1, step * 2.4);
      g.rotation.x = -0.18 + pointer.current.y * 0.17;
      g.rotation.z = pointer.current.x * 0.05;

      // Pulses, written straight into the attribute.
      const attr = pulseGeometry.getAttribute("position") as THREE.BufferAttribute;
      const array = attr.array as Float32Array;
      let i = 0;
      for (let c = 0; c < lines.curves.length; c++) {
        const points = lines.curves[c];
        for (let p = 0; p < PULSES_PER_ARC; p++) {
          // Each arc runs at its own speed and phase, so they never pulse
          // in unison.
          const phase = (t * (0.11 + (c % 5) * 0.025) + c * 0.37 + p * 0.5) % 1;
          const at = points[Math.min(points.length - 1, Math.floor(phase * points.length))];
          array[i * 3] = at.x;
          array[i * 3 + 1] = at.y;
          array[i * 3 + 2] = at.z;
          i++;
        }
      }
      attr.needsUpdate = true;
    }
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group ref={group} scale={fit} rotation={[-0.18, 0, 0]}>
      {/* The atmosphere, tight to the limb.
          At 1.16 this was a 580px circle around a 500px globe, which does not
          read as atmosphere — it reads as a second object, a faint disc with
          its own hard edge sitting behind the first. An atmosphere has to be
          a few percent of the radius, not sixteen. */}
      <mesh scale={1.045}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <primitive object={glowMaterial} attach="material" />
      </mesh>

      {/* The body.
          Opaque on purpose, so it lands in the opaque pass, writes depth
          first, and the far hemisphere of points fails the depth test. That
          is what gives the globe a clean silhouette instead of the mush of
          front and back fields reading through each other. Semi-transparent
          was tried first and put both hemispheres on screen at once. */}
      <mesh scale={0.975}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshBasicMaterial color="#040a16" />
      </mesh>

      <lineSegments geometry={lineGeometry}>
        <primitive object={lineMaterial} attach="material" />
      </lineSegments>

      <points geometry={pointGeometry}>
        <primitive object={pointMaterial} attach="material" />
      </points>

      <points geometry={pulseGeometry}>
        <primitive object={pulseMaterial} attach="material" />
      </points>
    </group>
  );
}

/* ── Canvas ──────────────────────────────────────────────────────────────── */

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const q = window.matchMedia(MOTION_QUERY);
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
}

/**
 * Subscribed, not read-then-stored.
 *
 * The first version set state inside an effect, which is a cascading render
 * and the lint rule is right to reject it. `useSyncExternalStore` is what
 * this is for: the browser owns the value, React subscribes to it, and the
 * server snapshot is explicit rather than an initial `false` that happens to
 * be corrected a tick later.
 */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  );
}

/** Particle budget from the real canvas width, never from a user-agent guess. */
function budget(width: number) {
  if (width < 480) return { particles: 3600, arcs: 7, dpr: [1, 1.6] as [number, number] };
  if (width < 900) return { particles: 6000, arcs: 9, dpr: [1, 1.8] as [number, number] };
  return { particles: 9000, arcs: 12, dpr: [1, 2] as [number, number] };
}

export function ParticleGlobe({
  className,
  deep = "#3478F6",
  bright = "#51D8FF",
  onStatus,
}: {
  className?: string;
  deep?: string;
  bright?: string;
  /** Lets the host hide its still fallback once WebGL is actually up. */
  onStatus?: (status: "ready" | "lost") => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [width, setWidth] = useState<number | null>(null);
  const [lost, setLost] = useState(false);

  // The budget is set from the measured element, so it is right inside a
  // half-width hero column as well as on a full-bleed phone.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setWidth((current) => {
        if (current === null) return w;
        // Re-bucketing rebuilds the geometry, so only cross a threshold.
        return budget(current).particles === budget(w).particles ? current : w;
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const colours = useMemo(
    () => ({ deep: new THREE.Color(deep), bright: new THREE.Color(bright) }),
    [deep, bright],
  );

  const b = budget(width ?? 1024);

  return (
    <div ref={host} className={className} aria-hidden="true">
      {width !== null && !lost ? (
        <Canvas
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
          dpr={b.dpr}
          camera={{ position: [0, 0, 3.2], fov: 35 }}
          frameloop={reduced ? "demand" : "always"}
          onCreated={({ gl }) => {
            const canvas = gl.domElement;
            onStatus?.("ready");
            // A lost context otherwise leaves a transparent hole with no
            // indication anything went wrong. Prevent the default so the
            // browser will restore it, and fall back to the CSS globe if it
            // does not come back.
            canvas.addEventListener("webglcontextlost", (event) => {
              event.preventDefault();
              setLost(true);
              onStatus?.("lost");
            });
            canvas.addEventListener("webglcontextrestored", () => {
              setLost(false);
              onStatus?.("ready");
            });
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <Globe
            particles={b.particles}
            arcs={b.arcs}
            deep={colours.deep}
            bright={colours.bright}
            still={reduced}
          />
        </Canvas>
      ) : null}
    </div>
  );
}
