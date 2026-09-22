import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { Html, Text, Box, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { motion } from 'framer-motion';

const FEATURES = [
  {
    id: 'neural-interface',
    title: 'NEURAL INTERFACE',
    description: 'Direct brain-computer interface with sub-millisecond latency. Real-time thought-to-action translation.',
    icon: '🧠',
    color: '#ff006e',
    position: [-8, 5, -5],
    hotspot: { x: -0.3, y: 0.4, z: -0.2 },
  },
  {
    id: 'quantum-processing',
    title: 'QUANTUM PROCESSING',
    description: 'Quantum-accelerated neural networks. 1000x faster inference than traditional silicon.',
    icon: '⚛️',
    color: '#00f3ff',
    position: [8, 5, -5],
    hotspot: { x: 0.3, y: 0.4, z: -0.2 },
  },
  {
    id: 'haptic-feedback',
    title: 'HAPTIC FEEDBACK',
    description: 'Full-body haptic suit integration. Feel every texture, impact, and sensation in VR.',
    icon: '🤲',
    color: '#39ff14',
    position: [-8, -5, -5],
    hotspot: { x: -0.3, y: -0.4, z: -0.2 },
  },
  {
    id: 'spatial-audio',
    title: 'SPATIAL AUDIO',
    description: 'HRTF-based 3D audio engine. True binaural rendering with real-time room acoustics.',
    icon: '🎧',
    color: '#bc13fe',
    position: [8, -5, -5],
    hotspot: { x: 0.3, y: -0.4, z: -0.2 },
  },
];

export function FeatureShowcase({ progress = 0, time = 0, reduced = false }) {
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const { camera } = useThree();
  
  const sectionProgress = Math.max(0, Math.min(1, (progress - 0.25) * 4));
  const visible = sectionProgress > 0.1;
  
  if (!visible) return null;
  
  return (
    <section className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-mesh opacity-50" style={{
        transform: `scale(${1 + sectionProgress * 0.3})`
      }} />
      
      <div className="absolute inset-0 scanline-overlay pointer-events-none" />
      
      {/* Grid floor */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-grid opacity-20 pointer-events-none" />
      
      {/* Feature Cards in 3D Space */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        <Html transform className="w-full h-full pointer-events-none">
          <div className="w-full h-full flex flex-col items-center justify-center">
            {/* Header */}
            <motion.div
              className="mb-16 text-center"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <span className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest mb-4 block">
                SYSTEM MODULES
              </span>
              <h2 className="font-display text-5xl md:text-7xl font-extrabold tracking-tighter text-gradient">
                FEATURE <span className="text-[var(--color-neon-pink)]">MATRIX</span>
              </h2>
              <p className="mt-4 text-muted max-w-2xl mx-auto text-lg">
                Four neural subsystems. Zero latency. Infinite possibilities.
              </p>
            </motion.div>
            
            {/* 3D Feature Grid */}
            <div className="relative w-full max-w-6xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                {FEATURES.map((feature, index) => (
                  <FeatureCard3D
                    key={feature.id}
                    feature={feature}
                    index={index}
                    sectionProgress={sectionProgress}
                    hovered={hoveredFeature === feature.id}
                    onHover={() => setHoveredFeature(feature.id)}
                    onLeave={() => setHoveredFeature(null)}
                    time={time}
                    reduced={reduced}
                  />
                ))}
              </div>
            </div>
            
            {/* Detail Panel */}
            {hoveredFeature && (
              <motion.div
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-4xl px-4"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <FeatureDetailPanel 
                  feature={FEATURES.find(f => f.id === hoveredFeature)}
                  onClose={() => setHoveredFeature(null)}
                />
              </motion.div>
            )}
          </div>
        </Html>
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
          CONTINUE SCROLLING
        </p>
      </motion.div>
    </section>
  );
}

function FeatureCard3D({ feature, index, sectionProgress, hovered, onHover, onLeave, time, reduced }) {
  const cardRef = useRef();
  const [isHovered, setIsHovered] = useState(false);
  
  const delay = index * 0.15;
  const visible = sectionProgress > 0.1 + index * 0.1;
  
  return (
    <motion.article
      ref={cardRef}
      className="group relative glass-strong neon-border p-8 flex flex-col items-center h-full min-h-[400px] cursor-pointer"
      style={{
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        borderColor: hovered ? feature.color : 'rgba(255, 0, 110, 0.2)',
        boxShadow: hovered 
          ? `0 0 40px ${feature.color}40, 0 0 80px ${feature.color}20, inset 0 0 40px ${feature.color}10`
          : 'none',
      }}
      initial={{ opacity: 0, y: 60, scale: 0.9 }}
      animate={{ opacity: visible ? 1 : 0, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02, zIndex: 10 }}
      onMouseEnter={() => { setIsHovered(true); onHover(); }}
      onMouseLeave={() => { setIsHovered(false); onLeave(); }}
      onClick={() => onHover()}
    >
      {/* Corner brackets */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="hud-corner hud-corner-tl" style={{ borderColor: feature.color }} />
        <div className="hud-corner hud-corner-tr" style={{ borderColor: feature.color }} />
        <div className="hud-corner hud-corner-bl" style={{ borderColor: feature.color }} />
        <div className="hud-corner hud-corner-br" style={{ borderColor: feature.color }} />
      </div>
      
      {/* Icon */}
      <motion.div
        className="mb-6 flex items-center justify-center"
        animate={{ 
          scale: hovered ? 1.1 : 1,
          rotate: hovered ? 5 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full opacity-20 blur-xl" style={{ background: feature.color }} />
          <span className="relative text-4xl z-10">{feature.icon}</span>
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: feature.color }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
      
      {/* Title */}
      <h3 className="font-display text-2xl font-bold text-center mb-4 text-gradient">
        {feature.title}
      </h3>
      
      {/* Description */}
      <p className="text-muted text-center mb-6 leading-relaxed flex-1">
        {feature.description}
      </p>
      
      {/* Progress indicator */}
      <div className="mt-auto pt-6 border-t border-[var(--color-border)] w-full">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 bg-[var(--color-bg)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: feature.color }}
              initial={{ width: 0 }}
              animate={{ width: hovered ? '100%' : '30%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest min-w-[60px] text-right">
            {hovered ? 'ACTIVE' : 'STANDBY'}
          </span>
        </div>
      </div>
      
      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at center, ${feature.color}20, transparent 70%)` }}
        animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1.2 : 0.8 }}
        transition={{ duration: 0.3 }}
      />
    </motion.article>
  );
}

function FeatureDetailPanel({ feature, onClose }) {
  if (!feature) return null;
  
  return (
    <div className="glass-strong neon-border p-6 md:p-8" style={{ 
      clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      borderColor: feature.color,
    }}>
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-shrink-0 w-20 h-20 flex items-center justify-center relative">
          <div className="absolute inset-0 rounded-full opacity-30 blur-xl" style={{ background: feature.color }} />
          <span className="relative text-5xl z-10">{feature.icon}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest">
              MODULE ACTIVE
            </span>
            <motion.button
              onClick={onClose}
              className="ml-auto p-2 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-bg-elevated)] text-muted hover:text-[var(--color-neon-pink)] transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
          
          <h3 className="font-display text-3xl font-bold text-gradient mb-3">
            {feature.title}
          </h3>
          
          <p className="text-muted leading-relaxed mb-6">
            {feature.description}
          </p>
          
          {/* Specs */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="glass p-4">
              <p className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest mb-1">LATENCY</p>
              <p className="font-display text-xl font-bold" style={{ color: feature.color }}>{'< 1ms'}</p>
            </div>
            <div className="glass p-4">
              <p className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest mb-1">THROUGHPUT</p>
              <p className="font-display text-xl font-bold" style={{ color: feature.color }}>10 TB/s</p>
            </div>
            <div className="glass p-4">
              <p className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest mb-1">POWER</p>
              <p className="font-display text-xl font-bold" style={{ color: feature.color }}>2.5W</p>
            </div>
            <div className="glass p-4">
              <p className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest mb-1">PRECISION</p>
              <p className="font-display text-xl font-bold" style={{ color: feature.color }}>99.99%</p>
            </div>
          </div>
          
          <button className="btn-neon w-full">
            ACTIVATE MODULE
          </button>
        </div>
      </div>
    </div>
  );
}