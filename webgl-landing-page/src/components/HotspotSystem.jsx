import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';

const HOTSPOTS = [
  {
    id: 'core',
    position: [0, 0, 0],
    title: 'ENERGY CORE',
    description: 'Primary quantum fusion reactor. Generates 45GW continuous output with zero-point energy stabilization.',
    icon: '⚛️',
    color: '#ff006e',
    pulse: true,
  },
  {
    id: 'neural-array',
    position: [5, 3, -2],
    title: 'NEURAL INTERFACE ARRAY',
    description: '10,000+ channel neural interface. Sub-millisecond latency direct cortical connection.',
    icon: '🧠',
    color: '#00f3ff',
    pulse: true,
  },
  {
    id: 'quantum-processor',
    position: [-5, 3, -2],
    title: 'QUANTUM PROCESSOR',
    description: '256-qubit quantum processor. 1000x classical compute for neural network inference.',
    icon: '⚛️',
    color: '#bc13fe',
    pulse: true,
  },
  {
    id: 'haptic-core',
    position: [0, -4, 0],
    title: 'HAPTIC FEEDBACK CORE',
    description: 'Full-body force feedback synthesis. 10,000 actuators with 0.1ms response time.',
    icon: '🤲',
    color: '#39ff14',
    pulse: true,
  },
  {
    id: 'audio-engine',
    position: [5, -4, 0],
    title: 'SPATIAL AUDIO ENGINE',
    description: 'HRTF-based 3D audio. Real-time room acoustics simulation with 64-channel output.',
    icon: '🎧',
    color: '#ff6b00',
    pulse: false,
  },
  {
    id: 'quantum-memory',
    position: [-5, -4, 0],
    title: 'QUANTUM MEMORY BANK',
    description: '100TB quantum storage. Zero-decoherence memory with 1000-year coherence time.',
    icon: '💾',
    color: '#00f3ff',
    pulse: true,
  },
];

export function HotspotSystem({ section = 0, progress = 0, visible = true }) {
  const { camera } = useThree();
  const [hoveredHotspot, setHoveredHotspot] = useState(null);
  const hotspotRefs = useRef({});
  
  const sectionProgress = Math.max(0, Math.min(1, (progress - 0.25) * 4));
  const shouldShow = visible && section === 1 && sectionProgress > 0.3;
  
  if (!shouldShow) return null;
  
  return (
    <>
      {/* 3D Hotspot Markers */}
      {HOTSPOTS.map(hotspot => (
        <HotspotMarker
          key={hotspot.id}
          hotspot={hotspot}
          camera={camera}
          onHover={() => setHoveredHotspot(hotspot)}
          onLeave={() => setHoveredHotspot(null)}
          hovered={hoveredHotspot?.id === hotspot.id}
          visible={shouldShow}
        />
      ))}
      
      {/* Hotspot Detail Panel */}
      {hoveredHotspot && (
        <motion.div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-4xl px-4"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <HotspotDetailPanel 
            hotspot={hoveredHotspot}
            onClose={() => setHoveredHotspot(null)}
          />
        </motion.div>
      )}
      
      {/* Hotspot List Sidebar */}
      <motion.div
        className="fixed right-8 top-1/2 -translate-y-1/2 z-20"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: shouldShow ? 1 : 0, x: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div className="glass-strong neon-border p-4" style={{ borderColor: '#ff006e', width: '200px' }}>
          <p className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest mb-3">
            HOTSPOTS
          </p>
          <div className="space-y-2">
            {HOTSPOTS.map(hotspot => (
              <motion.button
                key={hotspot.id}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  hoveredHotspot?.id === hotspot.id
                    ? 'bg-[var(--color-bg)] border-l-4'
                    : 'hover:bg-[var(--color-bg-elevated)]'
                }`}
                style={{ 
                  borderLeftColor: hotspot.color,
                  borderLeftWidth: hoveredHotspot?.id === hotspot.id ? '4px' : '0',
                }}
                onClick={() => setHoveredHotspot(hotspot)}
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-2xl">{hotspot.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-xs font-bold" style={{ color: hotspot.color }}>
                    {hotspot.title}
                  </p>
                  <p className="font-mono text-[10px] text-muted truncate">
                    {hotspot.description.substring(0, 30)}...
                  </p>
                </div>
                {hotspot.pulse && (
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ background: hotspot.color }}
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
}

function HotspotMarker({ hotspot, camera, onHover, onLeave, hovered, visible }) {
  const markerRef = useRef();
  const canvas = document.querySelector('canvas');
  
  useFrame(() => {
    if (!markerRef.current || !camera || !visible) return;
    
    const vector = new THREE.Vector3().fromArray(hotspot.position).project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    const visible3D = vector.z < 1 && vector.z > -1;
    
    if (markerRef.current) {
      markerRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      markerRef.current.style.opacity = visible3D ? 1 : 0;
      markerRef.current.style.pointerEvents = visible3D ? 'auto' : 'none';
    }
  });
  
  return (
    <div
      ref={markerRef}
      className="fixed pointer-events-none z-30"
      style={{ 
        transform: 'translate(-50%, -50%)',
        opacity: 0,
        transition: 'opacity 0.3s',
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Pulsing ring */}
      <motion.div
        className="absolute -top-4 -left-4 w-16 h-16 rounded-full pointer-events-none"
        style={{ border: `2px solid ${hotspot.color}`, opacity: 0.5 }}
        animate={{ 
          scale: [1, 2], 
          opacity: [0.5, 0] 
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute -top-4 -left-4 w-16 h-16 rounded-full pointer-events-none"
        style={{ border: `2px solid ${hotspot.color}`, opacity: 0.3 }}
        animate={{ 
          scale: [1, 1.5], 
          opacity: [0.3, 0] 
        }}
        transition={{ duration: 3, delay: 1, repeat: Infinity, ease: 'easeOut' }}
      />
      
      {/* Center dot */}
      <motion.div
        className="absolute -top-2 -left-2 w-4 h-4 rounded-full pointer-events-none"
        style={{ background: hotspot.color, boxShadow: `0 0 20px ${hotspot.color}` }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      
      {/* Label */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap pointer-events-none">
        <div className="glass-strong neon-border px-3 py-1.5 text-xs font-mono" style={{ 
          borderColor: hotspot.color,
          whiteSpace: 'nowrap',
        }}>
          {hotspot.icon} {hotspot.title}
        </div>
      </div>
    </div>
  );
}

function HotspotDetailPanel({ hotspot, onClose }) {
  if (!hotspot) return null;
  
  return (
    <div className="glass-strong neon-border p-6 md:p-8" style={{ 
      clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      borderColor: hotspot.color,
    }}>
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center relative">
          <div className="absolute inset-0 rounded-full opacity-30 blur-xl" style={{ background: hotspot.color }} />
          <span className="relative text-4xl z-10">{hotspot.icon}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest">
              HOTSPOT ACTIVE
            </span>
            <motion.button
              onClick={onClose}
              className="p-2 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-bg-elevated)] text-muted hover:text-[var(--color-neon-pink)] transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
          
          <h3 className="font-display text-2xl font-bold text-gradient mb-3">
            {hotspot.title}
          </h3>
          
          <p className="text-muted leading-relaxed mb-6">
            {hotspot.description}
          </p>
          
          {/* Status indicators */}
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1 rounded-full font-mono text-xs font-semibold" style={{ 
              background: `${hotspot.color}20`, 
              color: hotspot.color,
              border: `1px solid ${hotspot.color}40`
            }}>
              STATUS: ACTIVE
            </span>
            <span className="px-3 py-1 rounded-full font-mono text-xs font-semibold" style={{ 
              background: 'rgba(57, 255, 20, 0.2)', 
              color: '#39ff14',
              border: '1px solid rgba(57, 255, 20, 0.4)'
            }}>
              MONITORING
            </span>
            {hotspot.pulse && (
              <span className="px-3 py-1 rounded-full font-mono text-xs font-semibold" style={{ 
                background: `${hotspot.color}20`, 
                color: hotspot.color,
                border: `1px solid ${hotspot.color}40`
              }}>
                PULSE: ACTIVE
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}