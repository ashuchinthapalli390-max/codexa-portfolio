"use client";

import React, { Component, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { coreVertex, coreFragment, particleVertex, particleFragment } from "@/components/three/shaders";

export type AuthMood = "idle" | "verifying" | "success" | "error";

const MOOD = {
  idle: { a: new THREE.Color("#D90429"), b: new THREE.Color("#FF1E3C"), spin: 0.25, amp: 0.2 },
  verifying: { a: new THREE.Color("#D90429"), b: new THREE.Color("#FF4D6D"), spin: 1.6, amp: 0.42 },
  success: { a: new THREE.Color("#059669"), b: new THREE.Color("#34D399"), spin: 0.6, amp: 0.16 },
  error: { a: new THREE.Color("#7f0012"), b: new THREE.Color("#FF1E3C"), spin: 0.25, amp: 0.55 },
};

function Core({ mood }: { mood: AuthMood }) {
  const group = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const ringMats = useRef<THREE.MeshBasicMaterial[]>([]);
  const { pointer } = useThree();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.2 },
      uFreq: { value: 1.4 },
      uGlow: { value: 2.4 },
      uColorA: { value: new THREE.Color("#D90429") },
      uColorB: { value: new THREE.Color("#FF1E3C") },
    }),
    []
  );
  const errorKick = useRef(0);
  useEffect(() => {
    if (mood === "error") errorKick.current = 1;
  }, [mood]);

  useFrame((state, dt) => {
    const m = MOOD[mood];
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uColorA.value.lerp(m.a, 0.06);
    uniforms.uColorB.value.lerp(m.b, 0.06);
    errorKick.current *= 0.93;
    uniforms.uAmp.value += (m.amp + errorKick.current * 0.4 - uniforms.uAmp.value) * 0.08;
    if (group.current) {
      group.current.rotation.y += dt * m.spin;
      // follow the pointer a little — feels like the core is "looking" at you
      group.current.rotation.x += (pointer.y * 0.35 - group.current.rotation.x) * 0.05;
      group.current.position.x = Math.sin(state.clock.elapsedTime * 40) * errorKick.current * 0.12;
    }
    rings.current?.children.forEach((r, i) => {
      r.rotation.z += dt * (0.3 + i * 0.15) * (i % 2 ? -1 : 1) * (mood === "verifying" ? 3 : 1);
    });
    ringMats.current.forEach((mat) => mat.color.lerp(m.b.clone().multiplyScalar(2.4), 0.06));
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.35, 48]} />
        <shaderMaterial vertexShader={coreVertex} fragmentShader={coreFragment} uniforms={uniforms} />
      </mesh>
      <mesh scale={2.05}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#FF1E3C" wireframe transparent opacity={0.12} />
      </mesh>
      <group ref={rings}>
        {[
          { r: 2.6, rot: [Math.PI / 2.2, 0, 0] },
          { r: 3.0, rot: [Math.PI / 3, Math.PI / 5, 0] },
          { r: 3.4, rot: [Math.PI / 1.7, -Math.PI / 6, 0] },
        ].map((ring, i) => (
          <group key={i} rotation={ring.rot as [number, number, number]}>
            <mesh>
              <torusGeometry args={[ring.r, 0.012, 8, 200]} />
              <meshBasicMaterial
                ref={(m) => {
                  if (m) ringMats.current[i] = m;
                }}
                color={new THREE.Color(2.2, 0.16, 0.3)}
                toneMapped={false}
              />
            </mesh>
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

function Dust({ count }: { count: number }) {
  const { gl } = useThree();
  const geo = useMemo(() => {
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 14;
      const t = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1;
      p[i * 3] = r * Math.sqrt(1 - u * u) * Math.cos(t);
      p[i * 3 + 1] = r * u * 0.7;
      p[i * 3 + 2] = r * Math.sqrt(1 - u * u) * Math.sin(t) - 4;
      s[i] = 0.4 + Math.random() * 1.4;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aScale", new THREE.BufferAttribute(s, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count]);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: Math.min(gl.getPixelRatio(), 1.5) }, uSize: { value: 34 }, uWarp: { value: 0 } }),
    [gl]
  );
  const ref = useRef<THREE.Points>(null);
  useFrame((state, dt) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    if (ref.current) ref.current.rotation.y += dt * 0.02;
  });
  return (
    <points ref={ref} geometry={geo}>
      <shaderMaterial vertexShader={particleVertex} fragmentShader={particleFragment} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function Rig({ lift }: { lift: number }) {
  const { camera, pointer } = useThree();
  useFrame(() => {
    camera.position.x += (pointer.x * 1.2 - camera.position.x) * 0.04;
    camera.position.y += (pointer.y * 0.8 - lift - camera.position.y) * 0.04;
    camera.lookAt(0, -lift, 0);
  });
  return null;
}

class Boundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Interactive 3D "security core" for the login screen. Reacts to the auth state. */
export default function LoginScene({ mood }: { mood: AuthMood }) {
  const [ok, setOk] = useState<{ ready: boolean; mobile: boolean; reduced: boolean; wide: boolean }>({ ready: false, mobile: false, reduced: false, wide: false });
  useEffect(() => {
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webgl = false;
    }
    setOk({
      ready: webgl,
      mobile: window.innerWidth < 768,
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      wide: window.innerWidth >= 1024,
    });
  }, []);

  if (!ok.ready) return null;
  // on the desktop split layout the headline sits at the bottom, so lift the core into the upper half
  const lift = ok.wide ? 1.8 : 0;
  return (
    <Boundary>
      <Canvas dpr={ok.mobile ? [1, 1.25] : [1, 1.6]} gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }} camera={{ position: [0, 0, ok.wide ? 13 : 8.5], fov: ok.mobile ? 60 : 45 }}>
        <Rig lift={lift} />
        <Core mood={mood} />
        <Dust count={ok.mobile ? 600 : 1600} />
        {!ok.reduced && (
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <Bloom mipmapBlur intensity={0.95} luminanceThreshold={0.4} luminanceSmoothing={0.25} radius={0.62} />
            <Vignette eskil={false} offset={0.25} darkness={0.7} />
          </EffectComposer>
        )}
      </Canvas>
    </Boundary>
  );
}
