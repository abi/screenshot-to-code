import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [section, setSection] = useState(0);
  const [direction, setDirection] = useState(1);
  const [velocity, setVelocity] = useState(0);
  const prevProgress = useRef(0);

  useEffect(() => {
    let lastTime = performance.now();
    
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const currentProgress = self.progress;
        const currentTime = performance.now();
        const deltaTime = currentTime - lastTime;
        
        setVelocity((currentProgress - prevProgress.current) / (deltaTime || 1) * 1000);
        setDirection(self.direction);
        prevProgress.current = currentProgress;
        setProgress(currentProgress);
        
        // Determine section based on progress
        const newSection = Math.floor(currentProgress * 4);
        setSection(Math.min(newSection, 3));
        
        lastTime = currentTime;
      },
    });

    return () => {
      st.kill();
    };
  }, []);

  return { progress, section, direction, velocity };
}

export function useFrame() {
  const [time, setTime] = useState(0);
  const frameRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const animate = (timestamp) => {
      frameRef.current = requestAnimationFrame(animate);
      const deltaTime = (timestamp - timeRef.current) * 0.001;
      timeRef.current = timestamp;
      setTime(prev => prev + deltaTime);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return time;
}

export function useMouse() {
  const [mouse, setMouse] = useState({ x: 0, y: 0, ndc: typeof THREE !== 'undefined' ? new THREE.Vector2() : { x: 0, y: 0 } });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      
      setMouse({
        x,
        y,
        ndc: typeof THREE !== 'undefined' ? new THREE.Vector2(
          (x / window.innerWidth) * 2 - 1,
          -(y / window.innerHeight) * 2 + 1
        ) : { x: (x / window.innerWidth) * 2 - 1, y: -(y / window.innerHeight) * 2 + 1 }
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return mouse;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mediaQuery.matches);
    
    const handler = (e) => setReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reduced;
}

export function useGPUDetect() {
  const [tier, setTier] = useState('unknown');

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      setTier('none');
      return;
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo 
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) 
      : gl.getParameter(gl.RENDERER);

    // Simple GPU tier detection
    const rendererLower = renderer.toLowerCase();
    let detectedTier = 'low';
    
    if (rendererLower.includes('rtx') || rendererLower.includes('rx 6') || rendererLower.includes('rx 7') || 
        rendererLower.includes('m1') || rendererLower.includes('m2') || rendererLower.includes('m3') ||
        rendererLower.includes('radeon') && !rendererLower.includes('vega') ||
        rendererLower.includes('geforce') && !rendererLower.includes('gtx 10') && !rendererLower.includes('gtx 16')) {
      detectedTier = 'high';
    } else if (rendererLower.includes('gtx 10') || rendererLower.includes('gtx 16') || 
               rendererLower.includes('rx 5') || rendererLower.includes('vega') ||
               rendererLower.includes('intel') && (rendererLower.includes('iris') || rendererLower.includes('arc'))) {
      detectedTier = 'medium';
    }

    setTier(detectedTier);
  }, []);

  return tier;
}