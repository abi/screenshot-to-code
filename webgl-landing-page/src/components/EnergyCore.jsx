import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export function EnergyCore({ progress = 0, section = 0, time = 0, reduced = false }) {
  const coreRef = useRef();
  const innerCoreRef = useRef();
  const particlesRef = useRef();
  const ringsRef = useRef();
  
  const coreGeometry = useMemo(() => new THREE.IcosahedronGeometry(3, 8), []);
  const particleGeometry = useMemo(() => {
    const count = 500;
    const positions = new Float32Array(500 * 3);
    const sizes = new Float32Array(500);
    const alphas = new Float32Array(500);
    
    for (let i = 0; i < 500; i++) {
      const radius = 3.5 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      sizes[i] = 0.1 + Math.random() * 0.3;
      alphas[i] = Math.random();
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, []);
  
  const coreMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0x0a0a1a,
    metalness: 0.9,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transmission: 0.3,
    thickness: 0.5,
    ior: 1.5,
    envMapIntensity: 2.0,
  }), []);
  
  const innerCoreMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xff006e,
    transparent: true,
    opacity: 0.3,
    side: THREE.BackSide,
  }), []);
  
  const particleMaterial = useMemo(() => new THREE.PointsMaterial({
    color: 0xff006e,
    size: 0.15,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  }), []);
  
  const ringMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x00f3ff,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), []);
  
  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();
    
    if (coreRef.current) {
      coreRef.current.rotation.x += delta * 0.1 * (1 - progress * 0.5);
      coreRef.current.rotation.y += delta * 0.2 * (1 - progress * 0.3);
      coreRef.current.scale.setScalar(1 + Math.sin(elapsed * 0.5) * 0.05);
    }
    
    if (innerCoreRef.current) {
      innerCoreRef.current.rotation.x -= delta * 0.15;
      innerCoreRef.current.rotation.y += delta * 0.25;
      innerCoreRef.current.scale.setScalar(0.6 + Math.sin(elapsed) * 0.1);
    }
    
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.05;
      particlesRef.current.rotation.x += delta * 0.02;
    }
    
    if (ringsRef.current) {
      ringsRef.current.children.forEach((ring, i) => {
        ring.rotation.z = Math.sin(elapsed + i) * 0.2;
        ring.rotation.x = Math.cos(elapsed * 0.5 + i) * 0.2;
        ring.material.opacity = 0.1 + Math.sin(elapsed * 2 + i) * 0.05;
      });
    }
  });
  
  return (
    <group ref={coreRef}>
      {/* Outer core shell */}
      <mesh geometry={coreGeometry} material={coreMaterial} castShadow receiveShadow />

      {/* Inner glowing core */}
      <mesh ref={innerCoreRef} geometry={coreGeometry} material={innerCoreMaterial} scale={0.6} />

      {/* Particle field around core */}
      <points ref={particlesRef} geometry={particleGeometry} material={particleMaterial} />

      {/* Pulsing glow rings */}
      <group ref={ringsRef}>
        {[0, 1, 2].map(i => (
          <mesh key={i} geometry={new THREE.RingGeometry(5 + i * 2, 5.5 + i * 2, 64)} material={ringMaterial} rotation-x={-Math.PI / 2} rotation-y={i * Math.PI / 3} />
        ))}
      </group>
    </group>
  );
}