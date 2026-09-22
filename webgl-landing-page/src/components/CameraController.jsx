import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import * as THREE from 'three';

const CAMERA_POSITIONS = {
  0: { position: [0, 0, 50], target: [0, 0, 0], fov: 50 },      // Hero - wide view
  1: { position: [10, 5, 15], target: [0, 0, 0], fov: 35 },     // Features - close to core
  2: { position: [0, 3, 8], target: [0, 0, 0], fov: 45 },       // Interactive - close inspection
  3: { position: [0, 0, 60], target: [0, 0, 0], fov: 60 },      // CTA - warp out
};

const SECTION_DURATIONS = [1, 1, 1, 1]; // Normalized scroll sections

export function CameraController({ 
  section = 0, 
  progress = 0, 
  velocity = 0, 
  direction = 1, 
  reduced = false 
}) {
  const { camera } = useThree();
  const cameraRef = useRef(camera);
  const animatingRef = useRef(false);
  const currentSectionRef = useRef(section);
  
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  
  // Smooth camera transitions on section change
  useEffect(() => {
    if (section !== currentSectionRef.current && !reduced) {
      currentSectionRef.current = section;
      animatingRef.current = true;
      
      const target = CAMERA_POSITIONS[section] || CAMERA_POSITIONS[0];
      const startPos = new THREE.Vector3().copy(camera.position);
      const startTarget = new THREE.Vector3().copy(new THREE.Vector3());
      
      gsap.to(camera.position, {
        x: target.position[0],
        y: target.position[1],
        z: target.position[2],
        duration: 1.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          camera.lookAt(target.target[0], target.target[1], target.target[2]);
        },
        onComplete: () => {
          animatingRef.current = false;
        }
      });
      
      gsap.to(camera, {
        fov: target.fov,
        duration: 1.5,
        ease: 'power2.inOut',
      });
    }
    currentSectionRef.current = section;
  }, [section, reduced]);
  
  // Per-frame micro-adjustments based on scroll progress within section
  useFrame((state, delta) => {
    if (reduced || animatingRef.current) return;
    
    const sectionProgress = (progress % 1) || 0;
    const target = CAMERA_POSITIONS[section] || CAMERA_POSITIONS[0];
    const nextTarget = CAMERA_POSITIONS[section + 1] || CAMERA_POSITIONS[3];
    
    // Parallax mouse movement
    const mouseIntensity = 0.5;
    
    // Subtle camera breathing
    const breathe = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.5;
    
    // Velocity-based camera shake
    const shakeIntensity = Math.min(Math.abs(velocity) * 0.1, 0.5);
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;
    
    // Smooth interpolation between section cameras during transition
    const sectionProgressNormalized = progress - Math.floor(progress);
    const isTransitioning = sectionProgressNormalized > 0.8 || sectionProgressNormalized < 0.2;
    
    if (!isTransitioning) {
      // Subtle parallax within section
      camera.position.x += (target.position[0] - camera.position.x) * 0.02;
      camera.position.y += (target.position[1] - camera.position.y) * 0.02;
      camera.position.z += (target.position[2] - camera.position[2]) * 0.02;
      
      // Subtle breathing
      camera.position.y += breathe * 0.1;
      
      // Velocity shake
      camera.position.x += shakeX;
      camera.position.y += shakeY;
    }
    
    // Always look at center
    camera.lookAt(0, 0, 0);
  });
  
  return null;
}