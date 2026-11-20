"use client";

import React, { Component, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { scrollStore } from "@/lib/scroll-store";

type AnchorMap = React.MutableRefObject<Map<string, THREE.Object3D>>;
type LabelMap = React.MutableRefObject<Map<string, HTMLDivElement>>;

/* ───────────────────────── blueprint model ───────────────────────── */

export type BuildKind = "web" | "platform" | "mobile" | "ai";
export type ModuleShape = "ring" | "db" | "card" | "cart" | "calendar" | "chat" | "ai" | "layers" | "box" | "search" | "panel" | "satellite" | "shield";

export interface BuildModule {
  id: string;
  label: string;
  shape: ModuleShape;
}

export interface Blueprint {
  kind: BuildKind;
  pages: number; // 1..6 stacked layers
  accent: string; // hex
  motion: number; // 0..3 (Minimal..Cinematic)
  modules: BuildModule[];
  step: number; // 1..6
  ready: boolean; // review step — assembled state
}

/* ───────────────────────── helpers ───────────────────────── */

const RED = new THREE.Color("#FF1E3C");
const glow = (hex: string, k = 2.4) => new THREE.Color(hex).multiplyScalar(k);

function useSpringScale(target: number, speed = 0.12) {
  const ref = useRef<THREE.Group>(null);
  const v = useRef(0);
  useFrame(() => {
    v.current += (target - v.current) * speed;
    if (ref.current) ref.current.scale.setScalar(Math.max(0.0001, v.current));
  });
  return ref;
}

/* ───────────────────────── platform base ───────────────────────── */

function Platform({ accent, motion }: { accent: string; motion: number }) {
  const ring = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.y += dt * (0.15 + motion * 0.08);
  });
  return (
    <group position={[0, -1.9, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.4, 64]} />
        <meshStandardMaterial color="#0d0d10" metalness={0.8} roughness={0.35} />
      </mesh>
      <group ref={ring}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[3.3, 3.36, 96]} />
          <meshBasicMaterial color={glow(accent, 2)} toneMapped={false} />
        </mesh>
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 3.05, 0.02, Math.sin(a) * 3.05]} rotation={[-Math.PI / 2, 0, -a]}>
              <planeGeometry args={[0.22, 0.04]} />
              <meshBasicMaterial color={glow(accent, i % 3 === 0 ? 2.2 : 0.8)} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
      <gridHelper args={[6.4, 16, "#3a0a12", "#1a1a1e"]} position={[0, 0.005, 0]} />
    </group>
  );
}

/* ───────────────────────── main artifact ───────────────────────── */

function Screen({ w, h, accent, rows = 4, z = 0, opacity = 1 }: { w: number; h: number; accent: string; rows?: number; z?: number; opacity?: number }) {
  return (
    <group position={[0, 0, z]}>
      <mesh>
        <boxGeometry args={[w, h, 0.06]} />
        <meshStandardMaterial color="#111116" metalness={0.6} roughness={0.3} transparent opacity={opacity} />
      </mesh>
      {/* bezel glow */}
      <mesh position={[0, 0, 0.032]}>
        <planeGeometry args={[w - 0.08, h - 0.08]} />
        <meshBasicMaterial color="#07070a" transparent opacity={opacity} />
      </mesh>
      {/* top bar */}
      <mesh position={[0, h / 2 - 0.16, 0.036]}>
        <planeGeometry args={[w - 0.16, 0.12]} />
        <meshBasicMaterial color={glow(accent, 1.2)} toneMapped={false} transparent opacity={0.9 * opacity} />
      </mesh>
      {/* content rows */}
      {Array.from({ length: rows }).map((_, i) => {
        const y = h / 2 - 0.42 - i * ((h - 0.6) / rows);
        return (
          <group key={i}>
            <mesh position={[-w / 2 + 0.2 + (w * 0.35) / 2, y, 0.037]}>
              <planeGeometry args={[w * 0.35, 0.09]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.35 * opacity} />
            </mesh>
            <mesh position={[w * 0.12, y - 0.02, 0.037]}>
              <planeGeometry args={[w * 0.38, (h - 0.6) / rows - 0.12]} />
              <meshBasicMaterial color={i % 2 ? "#1d1d24" : glow(accent, 0.5)} transparent opacity={0.85 * opacity} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Artifact({ bp }: { bp: Blueprint }) {
  const group = useRef<THREE.Group>(null);
  const floatRef = useRef(0);
  useFrame((state, dt) => {
    floatRef.current += dt;
    if (group.current) {
      group.current.position.y = 0.1 + Math.sin(floatRef.current * 1.2) * 0.06;
      const targetY = bp.ready ? group.current.rotation.y + dt * 0.25 : Math.sin(state.clock.elapsedTime * 0.3) * 0.35;
      group.current.rotation.y += (targetY - group.current.rotation.y) * (bp.ready ? 1 : 0.05);
    }
  });

  // stacked "pages" behind the main screen
  const layers = Array.from({ length: Math.max(0, bp.pages - 1) });

  return (
    <group ref={group}>
      {bp.kind === "mobile" ? (
        <group>
          <mesh>
            <boxGeometry args={[1.25, 2.5, 0.14]} />
            <meshStandardMaterial color="#141418" metalness={0.85} roughness={0.25} />
          </mesh>
          <group position={[0, 0, 0.04]}>
            <Screen w={1.12} h={2.34} accent={bp.accent} rows={5} />
          </group>
          {layers.map((_, i) => (
            <group key={i} position={[(i + 1) * 0.35, 0, -(i + 1) * 0.3]} rotation={[0, -0.25, 0]}>
              <Screen w={1.0} h={2.1} accent={bp.accent} rows={4} opacity={0.5 - i * 0.07} />
            </group>
          ))}
        </group>
      ) : (
        <group>
          <Screen w={3.0} h={1.85} accent={bp.accent} rows={bp.kind === "web" ? 3 : 4} />
          {layers.map((_, i) => (
            <group key={i} position={[0.18 * (i + 1), 0.12 * (i + 1), -0.28 * (i + 1)]}>
              <Screen w={3.0} h={1.85} accent={bp.accent} rows={3} opacity={0.45 - i * 0.06} />
            </group>
          ))}
          {/* stand */}
          <mesh position={[0, -1.25, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 0.6, 12]} />
            <meshStandardMaterial color="#1c1c22" metalness={0.9} roughness={0.2} />
          </mesh>
          {(bp.kind === "platform" || bp.kind === "ai") && <ServerTower accent={bp.accent} />}
          {bp.kind === "ai" && <AiOrb />}
        </group>
      )}
    </group>
  );
}

function ServerTower({ accent }: { accent: string }) {
  const ref = useSpringScale(1, 0.08);
  const leds = useRef<THREE.MeshBasicMaterial[]>([]);
  useFrame((state) => {
    leds.current.forEach((m, i) => {
      const on = Math.sin(state.clock.elapsedTime * 6 + i * 1.7) > 0.2;
      m.color.copy(on ? glow(accent, 3) : new THREE.Color("#2a0a10"));
    });
  });
  return (
    <group ref={ref} position={[-2.25, -0.75, -0.4]}>
      {[0, 1, 2].map((k) => (
        <group key={k} position={[0, k * 0.42, 0]}>
          <mesh>
            <boxGeometry args={[0.7, 0.36, 0.7]} />
            <meshStandardMaterial color="#121216" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0.2, 0, 0.352]}>
            <planeGeometry args={[0.08, 0.06]} />
            <meshBasicMaterial ref={(m) => { if (m) leds.current[k] = m; }} color={glow(accent, 3)} toneMapped={false} />
          </mesh>
          <mesh position={[-0.12, 0, 0.352]}>
            <planeGeometry args={[0.3, 0.03]} />
            <meshBasicMaterial color="#2a2a33" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function AiOrb() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state, dt) => {
    if (!ref.current) return;
    ref.current.rotation.x += dt * 0.6;
    ref.current.rotation.y += dt * 0.9;
    ref.current.position.y = 1.55 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
  });
  return (
    <mesh ref={ref} position={[0, 1.55, 0.2]}>
      <icosahedronGeometry args={[0.28, 1]} />
      <meshBasicMaterial color={new THREE.Color(3, 0.4, 2.2)} wireframe toneMapped={false} />
    </mesh>
  );
}

/* ───────────────────────── modules ───────────────────────── */

function ModuleShapeMesh({ shape, accent }: { shape: ModuleShape; accent: string }) {
  const metal = <meshStandardMaterial color="#17171c" metalness={0.85} roughness={0.25} />;
  const hot = <meshBasicMaterial color={glow(accent, 2.6)} toneMapped={false} />;
  switch (shape) {
    case "ring":
    case "shield":
      return (
        <group>
          <mesh>
            <torusGeometry args={[0.2, 0.05, 12, 32]} />
            {hot}
          </mesh>
          <mesh position={[0, -0.22, 0]}>
            <boxGeometry args={[0.36, 0.26, 0.1]} />
            {metal}
          </mesh>
        </group>
      );
    case "db":
      return (
        <group>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[0, k * 0.13 - 0.13, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.1, 24]} />
              {k === 2 ? hot : metal}
            </mesh>
          ))}
        </group>
      );
    case "card":
      return (
        <group rotation={[0.3, 0, 0.2]}>
          <mesh>
            <boxGeometry args={[0.5, 0.32, 0.03]} />
            {metal}
          </mesh>
          <mesh position={[0, 0.07, 0.02]}>
            <planeGeometry args={[0.5, 0.06]} />
            {hot}
          </mesh>
        </group>
      );
    case "cart":
      return (
        <group>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.42, 0.24, 0.28]} />
            {metal}
          </mesh>
          {[-0.14, 0.14].map((x) => (
            <mesh key={x} position={[x, -0.12, 0.1]}>
              <sphereGeometry args={[0.05, 12, 12]} />
              {hot}
            </mesh>
          ))}
        </group>
      );
    case "calendar":
      return (
        <group>
          <mesh>
            <boxGeometry args={[0.42, 0.42, 0.06]} />
            {metal}
          </mesh>
          <mesh position={[0, 0.16, 0.035]}>
            <planeGeometry args={[0.42, 0.1]} />
            {hot}
          </mesh>
        </group>
      );
    case "chat":
      return (
        <group>
          <mesh>
            <sphereGeometry args={[0.2, 20, 20]} />
            {metal}
          </mesh>
          <mesh position={[0.18, -0.16, 0]}>
            <coneGeometry args={[0.07, 0.14, 12]} />
            {hot}
          </mesh>
        </group>
      );
    case "ai":
      return (
        <mesh>
          <icosahedronGeometry args={[0.24, 0]} />
          <meshBasicMaterial color={new THREE.Color(3, 0.5, 2.4)} wireframe toneMapped={false} />
        </mesh>
      );
    case "layers":
      return (
        <group>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[0, k * 0.1 - 0.1, -k * 0.05]}>
              <boxGeometry args={[0.44, 0.03, 0.32]} />
              {k === 2 ? hot : metal}
            </mesh>
          ))}
        </group>
      );
    case "search":
      return (
        <group rotation={[0, 0, -0.6]}>
          <mesh>
            <torusGeometry args={[0.15, 0.045, 12, 28]} />
            {hot}
          </mesh>
          <mesh position={[0, -0.26, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.22, 10]} />
            {metal}
          </mesh>
        </group>
      );
    case "panel":
      return (
        <group>
          <mesh>
            <boxGeometry args={[0.56, 0.38, 0.04]} />
            {metal}
          </mesh>
          {[-0.15, -0.03, 0.09, 0.21].map((x, i) => (
            <mesh key={x} position={[x - 0.03, -0.1 + (i + 1) * 0.035, 0.025]}>
              <planeGeometry args={[0.06, 0.08 + i * 0.05]} />
              {hot}
            </mesh>
          ))}
        </group>
      );
    case "satellite":
      return (
        <mesh>
          <octahedronGeometry args={[0.14, 0]} />
          {hot}
        </mesh>
      );
    case "box":
    default:
      return (
        <group>
          <mesh>
            <boxGeometry args={[0.32, 0.32, 0.32]} />
            {metal}
          </mesh>
          <mesh position={[0, 0, 0.17]}>
            <planeGeometry args={[0.16, 0.16]} />
            {hot}
          </mesh>
        </group>
      );
  }
}

/** One module: flies in from above, docks into its slot and beams to the core. */
function ModuleNode({ module, index, total, accent, motion, anchors }: { module: BuildModule; index: number; total: number; accent: string; motion: number; anchors: AnchorMap }) {
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    const g = group.current;
    const map = anchors.current;
    if (g) map.set(module.id, g);
    return () => {
      map.delete(module.id);
    };
  }, [anchors, module.id]);
  const beam = useRef<THREE.Mesh>(null);
  const beamMat = useRef<THREE.MeshBasicMaterial>(null);
  const born = useRef<number | null>(null);

  // slots on two rings around the artifact
  const target = useMemo(() => {
    const ringIdx = index % 2;
    const perRing = Math.ceil(total / 2) || 1;
    const k = Math.floor(index / 2);
    const a = (k / perRing) * Math.PI * 2 + (ringIdx ? Math.PI / perRing : 0) + 0.4;
    const r = ringIdx ? 3.0 : 2.45;
    return new THREE.Vector3(Math.cos(a) * r, ringIdx ? 0.9 : -0.65, Math.sin(a) * r * 0.75);
  }, [index, total]);

  const beamGeo = useMemo(() => new THREE.CylinderGeometry(0.008, 0.008, 1, 6), []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (born.current === null) born.current = t;
    const age = t - born.current;
    const g = group.current;
    if (!g) return;
    // entrance: drop from above with overshoot
    const p = Math.min(1, age / 0.9);
    const ease = 1 - Math.pow(1 - p, 3);
    const bob = Math.sin(t * (1 + motion * 0.4) + index) * 0.05;
    if (p < 1) {
      g.position.set(target.x * 0.3, 4.5, target.z * 0.3).lerp(target, ease);
      g.position.y += bob;
    } else {
      // glide to the (possibly re-shuffled) slot when other modules are added/removed
      g.position.x += (target.x - g.position.x) * 0.08;
      g.position.z += (target.z - g.position.z) * 0.08;
      g.position.y += (target.y + bob - g.position.y) * 0.08;
    }
    const s = p < 1 ? ease * (1 + Math.sin(p * Math.PI) * 0.35) : 1;
    g.scale.setScalar(Math.max(0.001, s));
    g.rotation.y += dt * (0.4 + motion * 0.25);

    // beam from module to core
    if (beam.current && beamMat.current) {
      const from = g.position;
      const to = new THREE.Vector3(0, 0.1, 0);
      const mid = from.clone().add(to).multiplyScalar(0.5);
      const len = from.distanceTo(to);
      beam.current.position.copy(mid);
      beam.current.scale.set(1, len, 1);
      beam.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      const flash = age < 1.4 ? 1 - age / 1.4 : 0;
      beamMat.current.opacity = 0.18 + flash * 0.8 + Math.sin(t * 3 + index) * 0.05;
    }
  });

  return (
    <>
      <group ref={group}>
        <ModuleShapeMesh shape={module.shape} accent={accent} />
      </group>
      <mesh ref={beam} geometry={beamGeo}>
        <meshBasicMaterial ref={beamMat} color={glow(accent, 2)} transparent opacity={0.3} toneMapped={false} depthWrite={false} />
      </mesh>
    </>
  );
}

/* ───────────────────────── sparks & camera ───────────────────────── */

function Sparks({ count, accent }: { count: number; accent: string }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2 + Math.random() * 5;
      const a = Math.random() * Math.PI * 2;
      p[i * 3] = Math.cos(a) * r;
      p[i * 3 + 1] = Math.random() * 5 - 2;
      p[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [count]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.05;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color={glow(accent, 1.6)} size={0.035} sizeAttenuation transparent opacity={0.7} toneMapped={false} depthWrite={false} />
    </points>
  );
}

// each step frames the build from a new angle so progress feels physical
const CAMERA_BY_STEP: Record<number, [number, number, number]> = {
  1: [0, 2.2, 9.6],
  2: [3.6, 2.6, 8.4],
  3: [-4.2, 2.8, 7.8],
  4: [1.2, 1.8, 8.2],
  5: [4.4, 3.4, 7.4],
  6: [0, 3.2, 9.6],
};

function CameraRig({ step, ready }: { step: number; ready: boolean }) {
  const { camera, pointer } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const yaw = useRef(0);
  useFrame((state) => {
    const base = CAMERA_BY_STEP[step] || CAMERA_BY_STEP[1];
    target.set(base[0] + pointer.x * 0.6, base[1] + pointer.y * 0.4, base[2]);
    // scrolling the page slowly orbits the build — the scene feels scroll-driven
    yaw.current += ((scrollStore.progress - 0.5) * 1.1 - yaw.current) * 0.05;
    target.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
    if (ready) {
      const a = state.clock.elapsedTime * 0.15;
      target.set(Math.sin(a) * 9, 3 + pointer.y * 0.4, Math.cos(a) * 9);
    }
    camera.position.lerp(target, 0.04);
    camera.lookAt(0, -0.2, 0);
  });
  return null;
}

/** Projects every module's 3D position to screen space and moves its DOM label there. */
function LabelProjector({ anchors, labels }: { anchors: AnchorMap; labels: LabelMap }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  const seen = useRef(new Map<string, number>());
  useFrame((state) => {
    const now = state.clock.elapsedTime;
    labels.current.forEach((el, id) => {
      const obj = anchors.current.get(id);
      if (!obj) {
        el.style.opacity = "0";
        return;
      }
      if (!seen.current.has(id)) seen.current.set(id, now);
      const age = now - (seen.current.get(id) ?? now);
      obj.getWorldPosition(v);
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      const visible = v.z < 1 && x > 8 && x < size.width - 8 && y > 40 && y < size.height - 70;
      // put the label on the open side; flip when it would run off the panel edge
      let right = x >= size.width / 2;
      if (!right && x < 150) right = true;
      if (right && x > size.width - 150) right = false;
      el.style.transform = `translate(${x}px, ${y}px) translate(${right ? "0" : "-100%"}, -50%)`;
      el.style.flexDirection = right ? "row" : "row-reverse";
      el.style.opacity = visible && age > 0.85 ? "1" : "0";
    });
    // forget modules that were removed so they animate in again if re-added
    seen.current.forEach((_, id) => {
      if (!anchors.current.has(id)) seen.current.delete(id);
    });
  });
  return null;
}

/* ───────────────────────── root ───────────────────────── */

function SceneRoot({ bp, mobile, reduced, anchors, labels }: { bp: Blueprint; mobile: boolean; reduced: boolean; anchors: AnchorMap; labels: LabelMap }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} />
      <pointLight position={[-3, 2, 3]} color={bp.accent} intensity={30} distance={14} />
      <pointLight position={[0, -1.2, 2.5]} color={RED} intensity={12} distance={8} />

      <CameraRig step={bp.step} ready={bp.ready} />
      <Platform accent={bp.accent} motion={bp.motion} />
      <Artifact bp={bp} />
      {bp.modules.map((m, i) => (
        <ModuleNode key={m.id} module={m} index={i} total={bp.modules.length} accent={bp.accent} motion={bp.motion} anchors={anchors} />
      ))}
      {!mobile && <LabelProjector anchors={anchors} labels={labels} />}
      <Sparks count={mobile ? 120 : 160 + bp.motion * 120} accent={bp.accent} />

      {!reduced && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={bp.ready ? 1.3 : 0.9} luminanceThreshold={0.45} luminanceSmoothing={0.25} radius={0.6} />
        </EffectComposer>
      )}
    </>
  );
}

class Boundary extends Component<{ children: React.ReactNode; fallback: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Live 3D preview that assembles the client's project as they configure it. */
export default function ProjectBuilderScene({ blueprint }: { blueprint: Blueprint }) {
  const [env, setEnv] = useState({ ready: false, webgl: true, mobile: false, reduced: false });
  const anchors = useRef(new Map<string, THREE.Object3D>());
  const labels = useRef(new Map<string, HTMLDivElement>());
  useEffect(() => {
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webgl = false;
    }
    setEnv({ ready: true, webgl, mobile: window.innerWidth < 768, reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches });
  }, []);

  const fallback = (
    <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">3D preview unavailable on this device</div>
  );

  if (!env.ready) return null;
  if (!env.webgl) return fallback;

  return (
    <Boundary fallback={fallback}>
      <Canvas dpr={env.mobile ? [1, 1.25] : [1, 1.75]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} camera={{ position: [0, 2.2, 9.6], fov: 40 }}>
        <SceneRoot bp={blueprint} mobile={env.mobile} reduced={env.reduced} anchors={anchors} labels={labels} />
      </Canvas>

      {/* labels that ride next to each 3D module */}
      {!env.mobile && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {blueprint.modules
            .filter((m) => m.shape !== "satellite")
            .map((m) => (
              <div
                key={m.id}
                ref={(el) => {
                  if (el) labels.current.set(m.id, el);
                  else labels.current.delete(m.id);
                }}
                className="absolute left-0 top-0 flex items-center gap-1.5 opacity-0 transition-opacity duration-500 will-change-transform"
              >
                <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
                <span className="w-6 h-px bg-white/40" />
                <span className="whitespace-nowrap rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
                  {m.label}
                </span>
              </div>
            ))}
        </div>
      )}
    </Boundary>
  );
}
