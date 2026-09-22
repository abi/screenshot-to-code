import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export function ParticleField({ 
  count = 10000, 
  progress = 0, 
  mouse, 
  time = 0, 
  reduced = false 
}) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const randoms = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Spherical distribution with noise
      const radius = 20 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      arr[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = radius * Math.cos(phi);
      
      // Color based on position
      const colorChoice = Math.random();
      if (colorChoice < 0.33) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.0;
        colors[i * 3 + 2] = 0.4;
      } else if (colorChoice < 0.66) {
        colors[i * 3] = 0.0;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 1.0;
      } else {
        colors[i * 3] = 0.7;
        colors[i * 3 + 1] = 0.05;
        colors[i * 3 + 2] = 1.0;
      }
      
      sizes[i] = 0.5 + Math.random() * 2.5;
      randoms[i] = Math.random();
    }
    
    return { arr, colors, sizes, randoms };
  }, [count]);
  
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions.arr, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(positions.colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(positions.sizes, 1));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(positions.randoms, 1));
    return geo;
  }, [positions]);
  
  const material = useMemo(() => {
    return new THREE.RawShaderMaterial({
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        uniform vec3 uMouse;
        uniform float uProgress;
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aRandom;
        varying vec3 vColor;
        varying float vAlpha;
        
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 1.0/7.0;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        
        void main() {
          vec3 pos = position;
          float noise = snoise(pos * 0.5 + uTime * 0.1);
          float noise2 = snoise(pos * 2.0 - uTime * 0.05);
          vec3 toMouse = uMouse - pos;
          float mouseDist = length(toMouse);
          float mouseInfluence = smoothstep(0.0, 50.0, 50.0 - mouseDist);
          pos += normalize(toMouse) * mouseInfluence * 2.0;
          pos += vec3(
            sin(uTime * 0.5 + aRandom * 10.0) * 0.5,
            cos(uTime * 0.3 + aRandom * 20.0) * 0.5,
            sin(uTime * 0.7 + aRandom * 30.0) * 0.5
          ) * noise;
          pos = mix(pos, normalize(pos) * 3.0, uProgress * 0.5);
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * (300.0 / -mvPosition.z) * uPixelRatio;
          gl_Position = projectionMatrix * mvPosition;
          vColor = aColor;
          vAlpha = 1.0 - smoothstep(0.0, 100.0, -mvPosition.z);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float dist = length(uv);
          float alpha = smoothstep(0.5, 0.0, dist);
          alpha = pow(alpha, 2.0);
          float pulse = 0.5 + 0.5 * sin(uTime * 3.0 + vColor.x * 10.0);
          alpha *= 0.5 + 0.5 * pulse;
          vec3 color = vColor * (0.5 + 0.5 * pulse);
          if (dist > 0.4) {
            color.r *= 1.2;
            color.b *= 0.8;
          }
          gl_FragColor = vec4(color, alpha * vAlpha);
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uMouse: { value: new THREE.Vector3() },
        uProgress: { value: 0 },
      },
    });
  }, []);
  
  const pointsRef = useRef();
  
  useFrame((state, delta) => {
    if (pointsRef.current && material) {
      material.uniforms.uTime.value = state.clock.getElapsedTime();
      material.uniforms.uMouse.value.set(mouse?.x || 0, mouse?.y || 0, 0);
      material.uniforms.uProgress.value = progress;
    }
  });
  
  return (
    <points ref={pointsRef} geometry={geometry} material={material}>
    </points>
  );
}