import React from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

import {
  Html,
  useGLTF,
  useTexture,
  Environment,
  Stars,
} from '@react-three/drei';
import {
  Suspense,
  lazy,
  useRef,
  useState,
  useEffect,
  useMemo
} from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import {
  useScrollProgress,
  useFrame as useFrameHook,
  useReducedMotion,
  useGPUDetect
} from '@/hooks/useScrollProgress';
import {
  HeroSection,
  FeatureShowcase,
  InteractiveZone,
  CTASection,
  HUDOverlay,
  LoadingScreen,
  ParticleField,
  EnergyCore,
  HotspotSystem,
  CameraController,
  GPUDetector,
} from '@/components';
import { useStore } from './store';
import '@/styles/globals.css';

gsap.registerPlugin(ScrollTrigger);

// Lazy load heavy 3D components
const FeatureShowcaseLazy = lazy(() => import('./components/FeatureShowcase').then(m => ({ default: m.FeatureShowcase })));
const InteractiveZoneLazy = lazy(() => import('./components/InteractiveZone').then(m => ({ default: m.InteractiveZone })));
const CTASectionLazy = lazy(() => import('./components/CTASection').then(m => ({ default: m.CTASection })));

// Post-processing Effects — disabled on this build for compatibility
function PostProcessing({ enabled = true }) {
  return null;
}

// Main App component
function App() {
  const {
    currentSection,
    hudVisible,
    assetsLoaded,
    gpuTier,
    scrollProgress,
    cameraAnimating,
    setCameraAnimating,
    setSection,
    setHUDVisible,
    setAssetsLoaded,
    setGPUTier
  } = useStore();

  const { progress: scrollProgressFromHook } = useScrollProgress();
  // Camera animation handled inside Canvas via CameraAnimation component
  // Mouse interaction handled by useMouse inside Canvas if needed
  const {
    gpuDetect: gpuTierFromHook
  } = useGPUDetect();

  // Update store values from hooks
  useEffect(() => {
    setGPUTier(gpuTierFromHook);
  }, [gpuTierFromHook, setGPUTier]);

  useEffect(() => {
    setAssetsLoaded(true);
  }, []);

  // Camera animation based on scroll — moved inside Canvas via CameraController

  return (
    <>
      {!assetsLoaded && <LoadingScreen />}
      <Canvas
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 50], fov: 50 }}
        style={{ height: '100vh', width: '100vw' }}
      >
        <Html tag="div" className="fixed inset-0 pointer-events-none">
          {!hudVisible && null}
          {hudVisible && (
            <>
              <HUDOverlay />
              <GPUDetector />
            </>
          )}
        </Html>
        <Suspense fallback={null}>
          <CameraController />
          <CameraAnimation scrollProgress={scrollProgress} cameraAnimating={cameraAnimating} />
          <EnergyCore progress={scrollProgress} />
          <HotspotSystem />
          <PostProcessing enabled={true} />
          <Html tag="div" fullscreen className="pointer-events-none">
            <HeroSection section={0} progress={scrollProgress} />
          </Html>
          <FeatureShowcaseLazy section={1} progress={scrollProgress} />
          <InteractiveZoneLazy section={2} progress={scrollProgress} />
          <CTASectionLazy section={3} progress={scrollProgress} />
        </Suspense>
      </Canvas>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
        {currentSection === 0 && (
          <div className="text-center text-white/70 text-sm">
            Scroll to explore the Neural Link experience
          </div>
        )}
      </div>
    </>
  );
}

function CameraAnimation({ scrollProgress, cameraAnimating }) {
  const threeCtx = useThree();
  const camera = threeCtx?.camera;
  useFrame((state, delta) => {
    if (camera && !cameraAnimating) {
      try {
        camera.position.lerp(new THREE.Vector3(
          Math.sin(scrollProgress * Math.PI * 2) * 50,
          20,
          Math.cos(scrollProgress * Math.PI * 2) * 50
        ), 0.05);
        camera.lookAt(0, 0, 0);
      } catch {
        // Ignore animation errors
      }
    }
  });
  return null;
}

export default App;