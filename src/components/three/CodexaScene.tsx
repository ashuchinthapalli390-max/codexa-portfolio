"use client";

import React, { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction, ChromaticAberrationEffect } from "postprocessing";
import { scrollStore } from "@/lib/scroll-store";
import {
  coreVertex,
  coreFragment,
  particleVertex,
  particleFragment,
  gridVertex,
  gridFragment,
} from "./shaders";

/* ───────────────────────── constants ───────────────────────── */

const CRIMSON = new THREE.Color("#D90429");
const BRIGHT = new THREE.Color("#FF1E3C");
const FINAL_Z = -122;

/** The camera flight path through the scene (hero → final portal). */
const PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 0, 8.5),
    new THREE.Vector3(4.6, 1.5, 2.0),
    new THREE.Vector3(1.2, -0.6, -8),
    new THREE.Vector3(1.6, 0.9, -21),
    new THREE.Vector3(-1.8, -0.7, -36),
    new THREE.Vector3(1.0, 0.5, -52),
    new THREE.Vector3(-0.8, -0.3, -68),
    new THREE.Vector3(0.6, 0.4, -84),
    new THREE.Vector3(-0.3, 0.0, -98),
    new THREE.Vector3(0, 0, -110),
  ],
  false,
  "catmullrom",
  0.4
);

/** Seeded PRNG so geometry is identical between renders */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ───────────────────────── Core ───────────────────────── */

function Core({
  position = [0, 0, 0] as [number, number, number],
  scale = 1,
  animate = true,
}) {
  const group = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Mesh>(null);
  const rings = useRef<THREE.Group>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.22 },
      uFreq: { value: 1.4 },
      uGlow: { value: 2.6 },
      uColorA: { value: CRIMSON.clone() },
      uColorB: { value: BRIGHT.clone() },
    }),
    []
  );

  useFrame((state, dt) => {
    if (!animate) return;
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    // core "breathes" harder when the user scrolls fast
    const v = Math.min(Math.abs(scrollStore.velocity) / 40, 1);
    uniforms.uAmp.value += (0.22 + v * 0.35 - uniforms.uAmp.value) * 0.08;
    if (group.current) group.current.rotation.y += dt * 0.12;
    if (shell.current) {
      shell.current.rotation.x -= dt * 0.18;
      shell.current.rotation.z += dt * 0.08;
    }
    if (rings.current) {
      rings.current.children.forEach((r, i) => {
        r.rotation.z += dt * (0.25 + i * 0.12) * (i % 2 ? -1 : 1);
      });
    }
  });

  return (
    <group position={position} scale={scale} ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.35, 48]} />
        <shaderMaterial vertexShader={coreVertex} fragmentShader={coreFragment} uniforms={uniforms} />
      </mesh>
      {/* inner hot glow */}
      <mesh scale={0.55}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={new THREE.Color(4, 0.35, 0.6)} toneMapped={false} transparent opacity={0.18} />
      </mesh>
      {/* wire shell */}
      <mesh ref={shell} scale={2.05}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={BRIGHT} wireframe transparent opacity={0.12} />
      </mesh>
      {/* orbit rings */}
      <group ref={rings}>
        {[
          { r: 2.7, rot: [Math.PI / 2.2, 0, 0] },
          { r: 3.1, rot: [Math.PI / 3, Math.PI / 5, 0] },
          { r: 3.55, rot: [Math.PI / 1.7, -Math.PI / 6, 0] },
        ].map((ring, i) => (
          <group key={i} rotation={ring.rot as [number, number, number]}>
            <mesh>
              <torusGeometry args={[ring.r, 0.011, 8, 220]} />
              <meshBasicMaterial color={new THREE.Color(2.2, 0.16, 0.3)} toneMapped={false} />
            </mesh>
            {/* orbiting "electron" */}
            <mesh position={[ring.r, 0, 0]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshBasicMaterial color={new THREE.Color(5, 4, 4)} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/* ───────────────────────── Particles ───────────────────────── */

function ParticleField({ count }: { count: number }) {
  const { gl } = useThree();
  const geo = useMemo(() => {
    const r = rng(7);
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const z = 14 - r() * 150;
      const t = THREE.MathUtils.clamp((8.5 - z) / 118.5, 0, 1);
      const c = PATH.getPointAt(t);
      const a = r() * Math.PI * 2;
      const rad = 2.2 + Math.pow(r(), 0.7) * 16;
      positions[i * 3] = c.x + Math.cos(a) * rad;
      positions[i * 3 + 1] = c.y + Math.sin(a) * rad * 0.75;
      positions[i * 3 + 2] = z;
      scales[i] = 0.4 + r() * 1.6;
      seeds[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 1.5) },
      uSize: { value: 38 },
      uWarp: { value: 0 },
    }),
    [gl]
  );

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    const v = Math.min(Math.abs(scrollStore.velocity) / 50, 1);
    uniforms.uWarp.value += (v - uniforms.uWarp.value) * 0.1;
  });

  return (
    <points geometry={geo}>
      <shaderMaterial
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ───────────────────────── Neural web network ───────────────────────── */

function WebNetwork({ center, seed, nodes = 70, spread = 7 }: { center: THREE.Vector3; seed: number; nodes?: number; spread?: number }) {
  const ref = useRef<THREE.Group>(null);
  const { lines, points } = useMemo(() => {
    const r = rng(seed);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < nodes; i++) {
      // hollow shell distribution so the camera can pass through the middle
      const dir = new THREE.Vector3(r() - 0.5, (r() - 0.5) * 0.8, r() - 0.5).normalize();
      pts.push(dir.multiplyScalar(spread * (0.45 + r() * 0.55)));
    }
    const seg: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (pts[i].distanceTo(pts[j]) < spread * 0.42) {
          seg.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
        }
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
    const pg = new THREE.BufferGeometry().setFromPoints(pts);
    return { lines: lg, points: pg };
  }, [nodes, seed, spread]);

  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.05;
      ref.current.rotation.x += dt * 0.02;
    }
  });

  return (
    <group ref={ref} position={center}>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color={CRIMSON} transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
      <points geometry={points}>
        <pointsMaterial color={new THREE.Color(3, 0.4, 0.5)} size={0.09} sizeAttenuation toneMapped={false} />
      </points>
    </group>
  );
}

/* ───────────────────────── Portal gates ───────────────────────── */

function Gates() {
  const group = useRef<THREE.Group>(null);
  const gates = useMemo(() => {
    const out: { pos: THREE.Vector3; quat: THREE.Quaternion; hot: boolean }[] = [];
    const ts = [0.36, 0.43, 0.5, 0.57, 0.64, 0.71, 0.78];
    ts.forEach((t, i) => {
      const pos = PATH.getPointAt(t);
      const tan = PATH.getTangentAt(t);
      const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), tan, new THREE.Vector3(0, 1, 0));
      out.push({ pos, quat: new THREE.Quaternion().setFromRotationMatrix(m), hot: i % 2 === 0 });
    });
    return out;
  }, []);

  useFrame((_, dt) => {
    group.current?.children.forEach((g, i) => {
      const inner = g.children[0];
      if (inner) inner.rotation.z += dt * (i % 2 ? 0.3 : -0.22);
    });
  });

  return (
    <group ref={group}>
      {gates.map((g, i) => (
        <group key={i} position={g.pos} quaternion={g.quat}>
          <group>
            <mesh>
              <torusGeometry args={[3.4, 0.018, 8, 160]} />
              <meshBasicMaterial
                color={g.hot ? new THREE.Color(3.5, 0.2, 0.4) : new THREE.Color(1.6, 1.2, 1.2)}
                toneMapped={false}
              />
            </mesh>
            {/* HUD ticks around gate */}
            {Array.from({ length: 12 }).map((_, k) => {
              const a = (k / 12) * Math.PI * 2;
              return (
                <mesh key={k} position={[Math.cos(a) * 3.75, Math.sin(a) * 3.75, 0]} rotation={[0, 0, a]}>
                  <boxGeometry args={[0.32, 0.03, 0.03]} />
                  <meshBasicMaterial color={new THREE.Color(2.4, 0.15, 0.3)} toneMapped={false} />
                </mesh>
              );
            })}
          </group>
        </group>
      ))}
    </group>
  );
}

/* ───────────────────────── Metallic shards ───────────────────────── */

function Shards({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: count }, () => {
      const t = r();
      const c = PATH.getPointAt(t);
      const a = r() * Math.PI * 2;
      const rad = 3 + r() * 9;
      return {
        pos: new THREE.Vector3(c.x + Math.cos(a) * rad, c.y + Math.sin(a) * rad * 0.7, c.z + (r() - 0.5) * 6),
        rot: new THREE.Euler(r() * 6, r() * 6, r() * 6),
        spin: new THREE.Vector3((r() - 0.5) * 0.8, (r() - 0.5) * 0.8, (r() - 0.5) * 0.4),
        scale: 0.08 + Math.pow(r(), 2) * 0.45,
      };
    });
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    data.forEach((d, i) => {
      d.rot.x += d.spin.x * dt;
      d.rot.y += d.spin.y * dt;
      d.rot.z += d.spin.z * dt;
      dummy.position.copy(d.pos);
      dummy.position.y += Math.sin(t * 0.5 + i) * 0.15;
      dummy.rotation.copy(d.rot);
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#1a0205" metalness={0.92} roughness={0.22} emissive="#3a0008" emissiveIntensity={0.4} flatShading />
    </instancedMesh>
  );
}

/* ───────────────────────── Cyber floor ───────────────────────── */

function CyberFloor() {
  const { camera } = useThree();
  const uniforms = useMemo(() => ({ uCam: { value: new THREE.Vector3() }, uTime: { value: 0 } }), []);
  useFrame((state) => {
    uniforms.uCam.value.copy(camera.position);
    uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.2, -55]}>
      <planeGeometry args={[80, 180, 1, 1]} />
      <shaderMaterial
        vertexShader={gridVertex}
        fragmentShader={gridFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        extensions={{ derivatives: true } as never}
      />
    </mesh>
  );
}

/* ───────────────────────── Camera rig ───────────────────────── */

function CameraRig({ mobile, frozen }: { mobile: boolean; frozen: boolean }) {
  const { camera } = useThree();
  const light = useRef<THREE.PointLight>(null);
  const state = useRef({ p: 0, px: 0, py: 0 });
  const tmp = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      ahead: new THREE.Vector3(),
      look: new THREE.Vector3(),
      hero: mobile ? new THREE.Vector3(0, -1.6, 0) : new THREE.Vector3(-2.3, 0.1, 0),
      final: new THREE.Vector3(0, 0, FINAL_Z),
    }),
    [mobile]
  );

  useFrame(() => {
    const s = state.current;
    const target = frozen ? 0 : scrollStore.progress;
    s.p += (target - s.p) * 0.075;
    s.px += (scrollStore.pointerX - s.px) * 0.05;
    s.py += (scrollStore.pointerY - s.py) * 0.05;

    const t = THREE.MathUtils.clamp(s.p, 0, 1);
    PATH.getPointAt(t, tmp.pos);
    PATH.getPointAt(Math.min(t + 0.035, 1), tmp.ahead);

    tmp.pos.x += s.px * 0.45;
    tmp.pos.y += s.py * 0.3;
    camera.position.copy(tmp.pos);

    const wHero = 1 - THREE.MathUtils.smoothstep(t, 0.0, 0.07);
    const wFinal = THREE.MathUtils.smoothstep(t, 0.9, 1.0);
    tmp.look.copy(tmp.ahead).lerp(tmp.hero, wHero).lerp(tmp.final, wFinal);
    camera.lookAt(tmp.look);

    // banking roll + FOV kick from scroll velocity
    const v = THREE.MathUtils.clamp(scrollStore.velocity, -60, 60);
    camera.rotation.z += (-v * 0.0018 - s.px * 0.04);
    const cam = camera as THREE.PerspectiveCamera;
    const fovTarget = (mobile ? 68 : 52) + Math.min(Math.abs(v) * 0.22, 12);
    cam.fov += (fovTarget - cam.fov) * 0.08;
    cam.updateProjectionMatrix();

    if (light.current) {
      light.current.position.copy(camera.position).add(new THREE.Vector3(0, 1.5, -3));
    }
  });

  return <pointLight ref={light} color="#FF1E3C" intensity={60} distance={30} decay={2} />;
}

/* ───────────────────────── Post FX ───────────────────────── */

function Effects({ mobile }: { mobile: boolean }) {
  // the wrapper's ref typing is off (typeof Effect), so cast on use
  const ca = useRef<typeof ChromaticAberrationEffect>(null);
  useFrame(() => {
    const effect = ca.current as unknown as ChromaticAberrationEffect | null;
    if (!effect) return;
    const v = Math.min(Math.abs(scrollStore.velocity) / 60, 1);
    const o = 0.0004 + v * 0.0035;
    effect.offset.set(o, o * 0.6);
  });
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={mobile ? 0.75 : 0.95} luminanceThreshold={0.42} luminanceSmoothing={0.25} radius={0.62} />
      <ChromaticAberration
        ref={ca}
        offset={new THREE.Vector2(0.0004, 0.0003)}
        radialModulation={false}
        modulationOffset={0}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise opacity={0.045} premultiply blendFunction={BlendFunction.SCREEN} />
      <Vignette eskil={false} offset={0.22} darkness={0.88} />
    </EffectComposer>
  );
}

/* ───────────────────────── Scene root ───────────────────────── */

function SceneContents({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const networks = useMemo(
    () => [
      { c: PATH.getPointAt(0.17), s: 11 },
      { c: PATH.getPointAt(0.27), s: 23 },
      { c: PATH.getPointAt(0.86), s: 37 },
    ],
    []
  );
  return (
    <>
      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 12, 60]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 8, 4]} intensity={1.4} color="#ffffff" />
      <directionalLight position={[-6, -3, -10]} intensity={2} color="#D90429" />

      <CameraRig mobile={mobile} frozen={reduced} />

      <Core animate={!reduced} />
      <Core position={[0, 0, FINAL_Z]} scale={1.9} animate={!reduced} />

      <ParticleField count={mobile ? 2200 : 6000} />
      {networks.map((n, i) => (
        <WebNetwork key={i} center={n.c} seed={n.s} nodes={mobile ? 45 : 80} />
      ))}
      <Gates />
      <Shards count={mobile ? 45 : 130} />
      <CyberFloor />

      {!reduced && <Effects mobile={mobile} />}
    </>
  );
}

class SceneErrorBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <StaticBackdrop />;
    return this.props.children;
  }
}

function StaticBackdrop() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(60% 50% at 70% 40%, rgba(217,4,41,0.22), transparent 70%), radial-gradient(40% 40% at 20% 80%, rgba(99,0,15,0.35), transparent 70%), #050505",
      }}
    />
  );
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function CodexaScene() {
  const [env, setEnv] = useState<{ ready: boolean; mobile: boolean; reduced: boolean; webgl: boolean }>({
    ready: false,
    mobile: false,
    reduced: false,
    webgl: true,
  });

  useEffect(() => {
    setEnv({
      ready: true,
      mobile: window.innerWidth < 768,
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      webgl: hasWebGL(),
    });
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      {!env.ready || !env.webgl ? (
        <StaticBackdrop />
      ) : (
        <SceneErrorBoundary>
          <Canvas
            dpr={env.mobile ? [1, 1.25] : [1, 1.6]}
            gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
            camera={{ position: [0, 0, 8.5], fov: env.mobile ? 68 : 52, near: 0.1, far: 140 }}
          >
            <Suspense fallback={null}>
              <SceneContents mobile={env.mobile} reduced={env.reduced} />
            </Suspense>
          </Canvas>
        </SceneErrorBoundary>
      )}
    </div>
  );
}
