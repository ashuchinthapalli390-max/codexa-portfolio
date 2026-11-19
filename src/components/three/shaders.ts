// Ashima 3D simplex noise (MIT) — compact form
export const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

export const coreVertex = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;
varying float vDisp;
${NOISE_GLSL}
void main(){
  float n = snoise(normal * uFreq + vec3(uTime * 0.28, uTime * 0.21, uTime * 0.17));
  float n2 = snoise(normal * uFreq * 3.0 - uTime * 0.4) * 0.25;
  float d = (n + n2) * uAmp;
  vDisp = n + n2;
  vec3 pos = position + normal * d;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vView = normalize(-mv.xyz);
  vPos = mv.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`;

export const coreFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uGlow;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;
varying float vDisp;
void main(){
  // true surface normal of the displaced mesh (screen-space derivatives)
  vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
  vec3 v = normalize(-vPos);
  float ndv = max(dot(n, v), 0.0);

  // key light (cool white) + crimson back light
  vec3 L1 = normalize(vec3(0.55, 0.75, 0.45));
  vec3 L2 = normalize(vec3(-0.7, -0.35, -0.3));
  float diff = max(dot(n, L1), 0.0);
  float spec = pow(max(dot(n, normalize(L1 + v)), 0.0), 70.0);
  float back = pow(max(dot(n, L2), 0.0), 1.5);
  float fres = pow(1.0 - ndv, 4.5);

  // glossy obsidian body with molten crimson veins in the crevices
  vec3 obsidian = vec3(0.022, 0.008, 0.01) * (0.35 + diff * 1.6);
  float vein = smoothstep(0.5, 0.95, -vDisp);
  float pulse = 0.75 + 0.25 * sin(uTime * 2.0 + vDisp * 6.0);
  vec3 molten = uColorB * vein * 1.4 * pulse;
  float bands = smoothstep(0.97, 1.0, sin(vDisp * 22.0 + uTime * 1.4)) * 0.4;

  vec3 col = obsidian
    + vec3(1.0, 0.86, 0.86) * spec * 1.1
    + uColorA * back * 0.55
    + uColorB * fres * uGlow * 0.55
    + molten
    + uColorB * bands * (0.3 + fres);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const particleVertex = /* glsl */ `
attribute float aScale;
attribute float aSeed;
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform float uWarp;
varying float vAlpha;
varying float vSeed;
void main(){
  vec3 p = position;
  p.x += sin(uTime * 0.25 + aSeed * 6.2831) * 0.35;
  p.y += cos(uTime * 0.18 + aSeed * 6.2831) * 0.35;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  gl_PointSize = uSize * aScale * uPixelRatio * (1.0 + uWarp * 2.5) / max(depth, 0.5);
  float twinkle = 0.55 + 0.45 * sin(uTime * 1.7 + aSeed * 50.0);
  vAlpha = smoothstep(70.0, 6.0, depth) * smoothstep(0.2, 1.6, depth) * twinkle;
  vSeed = aSeed;
}
`;

export const particleFragment = /* glsl */ `
varying float vAlpha;
varying float vSeed;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  vec3 red = vec3(1.0, 0.1, 0.22);
  vec3 col = mix(red, vec3(1.0, 0.85, 0.85), step(0.86, vSeed));
  gl_FragColor = vec4(col * 1.6, a * vAlpha);
}
`;

export const gridVertex = /* glsl */ `
varying vec3 vWorld;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const gridFragment = /* glsl */ `
uniform vec3 uCam;
uniform float uTime;
varying vec3 vWorld;
void main(){
  vec2 c = vWorld.xz * 0.5;
  vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  float dist = distance(vWorld.xz, uCam.xz);
  float fade = smoothstep(38.0, 2.0, dist);
  float pulse = 0.6 + 0.4 * sin(vWorld.z * 0.35 + uTime * 1.5);
  vec3 col = vec3(0.85, 0.02, 0.16) * line * fade * pulse;
  gl_FragColor = vec4(col, line * fade * 0.55);
}
`;
