import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { Html, Box, RoundedBox, Text, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { motion } from 'framer-motion';

const MATERIALS = [
  { id: 'metal', name: 'TITANIUM ALLOY', color: '#8a8a9a', roughness: 0.2, metalness: 0.9, clearcoat: 0.5 },
  { id: 'carbon', name: 'CARBON FIBER', color: '#1a1a1a', roughness: 0.4, metalness: 0.1, clearcoat: 0.8 },
  { id: 'ceramic', name: 'CERAMIC COMPOSITE', color: '#e8e8e8', roughness: 0.1, metalness: 0.0, clearcoat: 1.0 },
  { id: 'liquid', name: 'LIQUID METAL', color: '#ff006e', roughness: 0.0, metalness: 1.0, clearcoat: 1.0, transmission: 0.3 },
  { id: 'glass', name: 'GORILLA GLASS', color: '#00f3ff', roughness: 0.05, metalness: 0.0, clearcoat: 1.0, transmission: 0.9, thickness: 1.5, ior: 1.52 },
  { id: 'carbon-nano', name: 'CARBON NANOTUBE', color: '#39ff14', roughness: 0.15, metalness: 0.3, clearcoat: 0.3 },
];

const COLORS = [
  { id: 'neon-pink', name: 'NEURAL PINK', value: '#ff006e' },
  { id: 'neon-blue', name: 'CYBER BLUE', value: '#00f3ff' },
  { id: 'neon-green', name: 'MATRIX GREEN', value: '#39ff14' },
  { id: 'neon-purple', name: 'VOID PURPLE', value: '#bc13fe' },
  { id: 'neon-orange', name: 'PLASMA ORANGE', value: '#ff6b00' },
  { id: 'neon-gold', name: 'QUANTUM GOLD', value: '#ffd700' },
];

export function InteractiveZone({ progress = 0, time = 0, reduced = false }) {
  const [selectedMaterial, setSelectedMaterial] = useState('metal');
  const [selectedColor, setSelectedColor] = useState('#ff006e');
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [exploded, setExploded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  
  const sectionProgress = Math.max(0, Math.min(1, (progress - 0.5) * 4));
  const visible = sectionProgress > 0.1;
  
  const modelRef = useRef();
  const partsRef = useRef({});
  const explodedPositions = useMemo(() => {
    const positions = {};
    const parts = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    parts.forEach((part, i) => {
      const angle = (i / 6) * Math.PI * 2;
      positions[part] = [
        Math.cos(angle) * 3,
        Math.sin(i * 0.5) * 2,
        Math.sin(angle) * 3
      ];
    });
    return positions;
  }, []);
  
  if (!visible) return null;
  
  return (
    <section className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-mesh opacity-50" style={{
        transform: `scale(${1 + progress * 0.2})`
      }} />
      
      <div className="absolute inset-0 scanline-overlay pointer-events-none" />
      
      {/* 3D Canvas Area */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {/* Header */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center z-20">
          <span className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest mb-4 block">
            INTERACTIVE ZONE
          </span>
          <h2 className="font-display text-5xl md:text-7xl font-extrabold tracking-tighter text-gradient">
            NEURAL <span className="text-[var(--color-neon-pink)]">CONFIGURATOR</span>
          </h2>
          <p className="mt-4 text-muted max-w-2xl mx-auto text-lg">
            Real-time material & color configuration. Drag to rotate. Click to explode.
          </p>
        </div>
        
        {/* 3D Model Viewport */}
        <div className="relative w-full h-[70vh] max-w-5xl flex items-center justify-center">
          <div className="relative w-full h-full" style={{ touchAction: 'none' }}>
            {/* Canvas would be here in full implementation */}
            <ModelViewport 
              selectedMaterial={selectedMaterial}
              selectedColor={selectedColor}
              exploded={exploded}
              autoRotate={autoRotate}
              time={time}
              reduced={reduced}
            />
            
            {/* Explode button */}
            <motion.button
              className="absolute bottom-8 right-8 btn-neon z-10"
              onClick={() => setExploded(!exploded)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {exploded ? 'ASSEMBLE' : 'EXPLODE'}
            </motion.button>
            
            {/* Auto-rotate toggle */}
            <motion.button
              className="absolute bottom-8 left-8 btn-neon z-10"
              onClick={() => setAutoRotate(!autoRotate)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {autoRotate ? 'PAUSE ROTATION' : 'AUTO ROTATE'}
            </motion.button>
          </div>
        </div>
        
        {/* Controls Panel */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-6xl z-20"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <div className="glass-strong neon-border p-6 md:p-8" style={{ 
            clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
            borderColor: '#ff006e',
          }}>
            {/* Material Selector */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest">
                  MATERIAL CONFIG
                </span>
                <span className="font-mono text-xs text-muted">
                  {MATERIALS.find(m => m.id === selectedMaterial)?.name}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {MATERIALS.map((material) => (
                  <motion.button
                    key={material.id}
                    className={`px-4 py-3 rounded-xl font-mono text-sm font-medium transition-all duration-300 ${
                      selectedMaterial === material.id
                        ? `text-white glow-pink`
                        : 'text-muted hover:text-white'
                    }`}
                    style={{
                      background: selectedMaterial === material.id 
                        ? `linear-gradient(135deg, ${material.color}, ${material.color}cc)`
                        : 'rgba(14, 14, 24, 0.8)',
                      border: `1px solid ${selectedMaterial === material.id ? material.color : 'rgba(255, 0, 110, 0.2)'}`,
                    }}
                    onClick={() => setSelectedMaterial(material.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {material.name}
                  </motion.button>
                ))}
              </div>
            </div>
            
            {/* Color Selector */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest">
                  COLOR SCHEME
                </span>
                <span className="font-mono text-xs text-muted">
                  {COLORS.find(c => c.value === selectedColor)?.name}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {COLORS.map((color) => (
                  <motion.button
                    key={color.id}
                    className="w-12 h-12 rounded-xl transition-all duration-300"
                    style={{
                      background: color.value,
                      border: `3px solid ${selectedColor === color.value ? '#fff' : 'transparent'}`,
                      boxShadow: selectedColor === color.value 
                        ? `0 0 20px ${color.value}, 0 0 40px ${color.value}80`
                        : '0 0 10px rgba(0,0,0,0.3)',
                    }}
                    onClick={() => setSelectedColor(color.value)}
                    whileHover={{ scale: 1.15, zIndex: 10 }}
                    whileTap={{ scale: 0.95 }}
                    title={color.name}
                  >
                    {selectedColor === color.value && (
                      <svg className="w-6 h-6 mx-auto my-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center">
              <motion.button
                className="btn-neon flex-1 min-w-[200px]"
                onClick={() => setExploded(!exploded)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {exploded ? 'ASSEMBLE UNIT' : 'EXPLODE VIEW'}
              </motion.button>
              
              <motion.button
                className="btn-neon flex-1 min-w-[200px]"
                style={{ background: 'linear-gradient(135deg, #00f3ff, #39ff14)' }}
                onClick={() => setAutoRotate(!autoRotate)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {autoRotate ? 'PAUSE ROTATION' : 'AUTO ROTATE'}
              </motion.button>
              
              <motion.button
                className="btn-neon flex-1 min-w-[200px]"
                style={{ background: 'linear-gradient(135deg, #bc13fe, #ff6b00)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                SAVE CONFIGURATION
              </motion.button>
            </div>
            
            {/* Specs Display */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'MASS', value: '2.3 KG', color: '#ff006e' },
                { label: 'POWER', value: '45 W', color: '#00f3ff' },
                { label: 'TEMP', value: '22°C', color: '#39ff14' },
                { label: 'STATUS', value: 'NOMINAL', color: '#39ff14' },
              ].map((spec, i) => (
                <motion.div
                  key={spec.label}
                  className="glass p-4 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.4 }}
                >
                  <p className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest mb-1">
                    {spec.label}
                  </p>
                  <p className="font-display text-xl font-bold" style={{ color: spec.color }}>
                    {spec.value}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ delay: 1 }}
      >
        <motion.div
          className="w-1 h-12 bg-gradient-to-t from-[var(--color-neon-pink)] via-[var(--color-neon-blue)] to-transparent rounded-full"
          animate={{ scaleY: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <p className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest mt-4">
          FINAL TRANSMISSION
        </p>
      </motion.div>
    </section>
  );
}

function ModelViewport({ selectedMaterial, selectedColor, exploded, autoRotate, time, reduced }) {
  // This would render the actual 3D model in the canvas
  // For now, return a placeholder that integrates with the Three.js canvas
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-dark-900/50 to-dark-950/50 rounded-2xl border border-[var(--color-border)] overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-muted">
          <svg className="w-32 h-32 mx-auto mb-4 opacity-20 animate-float" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <p className="font-mono text-lg">3D MODEL VIEWPORT</p>
          <p className="text-sm mt-2">WebGL Canvas Integration Point</p>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted">
            <span>Material: <span className="font-display text-[var(--color-neon-pink)]">{MATERIALS.find(m => m.id === 'metal').name}</span></span>
            <span>Color: <span className="font-display" style={{ color: '#ff006e' }}>NEURAL PINK</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}