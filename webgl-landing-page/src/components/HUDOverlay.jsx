import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

export function HUDOverlay({ section = 0, progress = 0, time = 0, gpuTier = 'unknown', velocity = 0 }) {
  const sectionLabels = [
    { id: 0, label: 'INITIALIZATION', short: 'INIT' },
    { id: 1, label: 'FEATURE MATRIX', short: 'FEAT' },
    { id: 2, label: 'CONFIGURATOR', short: 'CONF' },
    { id: 3, label: 'TRANSMISSION', short: 'TX' },
  ];
  
  const currentSection = sectionLabels[section] || sectionLabels[0];
  
  const stats = useMemo(() => ({
    fps: Math.round(60 - Math.abs(velocity) * 100),
    latency: Math.round(Math.random() * 2 + 0.5),
    bandwidth: (Math.random() * 100 + 900).toFixed(1),
    nodes: Math.floor(Math.random() * 1000 + 9000),
  }), [velocity]);
  
  return (
    <>
      {/* Top HUD Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Left - System Status */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 glass-strong neon-border px-4 py-2" style={{ borderColor: '#ff006e' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--color-neon-green)] animate-pulse-slow" />
                <span className="font-display font-semibold text-sm text-[var(--color-neon-green)]">ONLINE</span>
              </div>
              <div className="w-px h-6 bg-[var(--color-border)] mx-2" />
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="font-mono">GPU:</span>
                <span className="font-mono font-semibold text-[var(--color-neon-pink)]">{gpuTier.toUpperCase()}</span>
              </div>
            </div>
            
            {/* Section indicator */}
            <div className="glass-strong neon-border px-4 py-2" style={{ borderColor: '#00f3ff' }}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[var(--color-neon-blue)] uppercase tracking-widest">SECTOR</span>
                <span className="font-display font-bold text-sm text-gradient">{currentSection.short}</span>
                <div className="w-16 h-1 bg-[var(--color-bg)] rounded-full overflow-hidden ml-2">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-blue)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${((section / 3) * 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Right - Performance Stats */}
          <div className="flex items-center gap-4">
            <div className="glass-strong neon-border px-4 py-2 text-center min-w-[100px]" style={{ borderColor: '#39ff14' }}>
              <div className="stat-value text-[var(--color-neon-green)]">{stats.fps}</div>
              <div className="stat-label">FPS</div>
            </div>
            <div className="glass-strong neon-border px-4 py-2 text-center min-w-[100px]" style={{ borderColor: '#ff006e' }}>
              <div className="stat-value text-[var(--color-neon-pink)]">{stats.latency}ms</div>
              <div className="stat-label">LATENCY</div>
            </div>
            <div className="glass-strong neon-border px-4 py-2 text-center min-w-[100px]" style={{ borderColor: '#00f3ff' }}>
              <div className="stat-value text-[var(--color-neon-blue)]">{stats.bandwidth}</div>
              <div className="stat-label">GB/s</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Side HUD - Left */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-4 pointer-events-none">
        {/* Compass */}
        <motion.div
          className="glass-strong neon-border p-4" style={{ borderColor: '#ff006e', width: '120px' }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <div className="text-center">
            <p className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest mb-2">COMPASS</p>
            <div className="relative w-20 h-20 mx-auto">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-border)" strokeWidth="1" />
                <line x1="50" y1="50" x2="50" y2="10" stroke="var(--color-neon-pink)" strokeWidth="2" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="10s" repeatCount="indefinite" />
                </line>
                <text x="50" y="15" textAnchor="middle" fill="var(--color-neon-pink)" fontSize="8" fontFamily="monospace">N</text>
                <text x="50" y="95" textAnchor="middle" fill="var(--color-muted)" fontSize="8" fontFamily="monospace">S</text>
                <text x="15" y="55" textAnchor="middle" fill="var(--color-muted)" fontSize="8" fontFamily="monospace">W</text>
                <text x="85" y="55" textAnchor="middle" fill="var(--color-muted)" fontSize="8" fontFamily="monospace">E</text>
              </svg>
            </div>
          </div>
        </motion.div>
        
        {/* Signal Strength */}
        <div className="glass-strong neon-border p-4" style={{ borderColor: '#39ff14', width: '120px' }}>
          <p className="font-mono text-xs text-[var(--color-neon-green)] uppercase tracking-widest mb-3">SIGNAL</p>
          <div className="flex items-end gap-1 h-12 justify-center">
            {[1,2,3,4,5].map(i => (
              <motion.div
                key={i}
                className="w-4 bg-gradient-to-t from-[var(--color-neon-green)] to-[var(--color-neon-green)]/30 rounded-t"
                style={{ height: `${20 + i * 10}%` }}
                animate={{ height: [`${20 + i * 10}%`, `${40 + i * 10}%`, `${20 + i * 10}%`] }}
                transition={{ duration: 1, delay: i * 0.1, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Side HUD - Right */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-4 pointer-events-none">
        {/* System Health */}
        <div className="glass-strong neon-border p-4" style={{ borderColor: '#bc13fe', width: '140px' }}>
          <p className="font-mono text-xs text-[var(--color-neon-purple)] uppercase tracking-widest mb-3">SYSTEM HEALTH</p>
          <div className="space-y-2">
            {['CORE TEMP', 'POWER LEVEL', 'MEMORY', 'NETWORK'].map((label, i) => (
              <div key={label} className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted">{label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-[var(--color-bg)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: ['#ff006e', '#00f3ff', '#39ff14', '#bc13fe'][i] }}
                      animate={{ width: ['80%', '95%', '85%'] }}
                      transition={{ duration: 2, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold" style={{ color: ['#ff006e', '#00f3ff', '#39ff14', '#bc13fe'][i] }}>
                    {['87%', '94%', '82%', '99%'][i]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Data Stream */}
        <div className="glass-strong neon-border p-4" style={{ borderColor: '#00f3ff', width: '140px' }}>
          <p className="font-mono text-xs text-[var(--color-neon-blue)] uppercase tracking-widest mb-3">DATA STREAM</p>
          <div className="font-mono text-xs text-[var(--color-neon-blue)] h-24 overflow-hidden">
            <motion.div
              animate={{ y: [-100, 100] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            >
              {[...Array(20)].map((_, i) => (
                <div key={i} className="h-4 flex items-center gap-2 border-b border-[var(--color-border)]/50">
                  <span className="w-16 text-right">0x{Math.random().toString(16).substr(2, 4).toUpperCase()}</span>
                  <span>{Math.random().toString(16).substr(2, 8).toUpperCase()}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Bottom HUD - Mini Map / Progress */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <div className="glass-strong neon-border px-6 py-3 flex items-center gap-6" style={{ borderColor: '#ff006e', minWidth: '400px' }}>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest">MISSION</span>
            <div className="relative w-48 h-2 bg-[var(--color-bg)] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[var(--color-neon-pink)] via-[var(--color-neon-blue)] to-[var(--color-neon-purple)] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'easeInOut' }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 ml-8">
            <span className="font-mono text-xs text-[var(--color-neon-blue)] uppercase tracking-widest">WARP</span>
            <motion.div
              className="w-4 h-4 rounded-full bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-neon-purple)]"
              animate={{ scale: [1, 1.5, 1], boxShadow: ['0 0 10px #00f3ff', '0 0 30px #bc13fe', '0 0 10px #00f3ff'] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          
          <div className="flex items-center gap-4 ml-8">
            <span className="font-mono text-xs text-[var(--color-neon-green)] uppercase tracking-widest">NODES</span>
            <motion.span
              className="font-display font-bold text-lg text-[var(--color-neon-green)] tabular-nums"
              animate={{ textContent: [9000, 10000] }}
              transition={{ duration: 5, repeat: Infinity }}
            >
              9,847
            </motion.span>
          </div>
        </div>
      </div>
    </>
  );
}