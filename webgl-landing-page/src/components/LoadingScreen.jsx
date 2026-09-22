import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function LoadingScreen({ progress = 0, text = 'LOADING...' }) {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900">
      <div className="text-center max-w-2xl mx-4 p-8">
        {/* Logo/Spinner */}
        <motion.div
          className="mb-8"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <svg className="w-24 h-24 mx-auto text-gradient" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </motion.div>
        
        {/* Title */}
        <motion.h1
          className="font-display text-4xl md:text-5xl font-bold text-gradient mb-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          NEURAL <span className="text-[var(--color-neon-pink)]">LINK</span>
        </motion.h1>
        
        {/* Loading text */}
        <motion.p
          className="font-mono text-lg text-[var(--color-neon-pink)] mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {text}{dots}
        </motion.p>
        
        {/* Progress bar */}
        <motion.div
          className="w-full max-w-md mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div className="glass rounded-full h-3 overflow-hidden mb-2">
            <motion.div
              className="h-full bg-gradient-to-r from-[var(--color-neon-pink)] via-[var(--color-neon-blue)] to-[var(--color-neon-purple)] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <p className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest text-right">
            {Math.round(progress)}%
          </p>
        </motion.div>
        
        {/* Loading steps */}
        <motion.div
          className="w-full max-w-md mx-auto text-left"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          {[
            { label: 'INITIALIZING WEBCONTEXT', done: progress > 10 },
            { label: 'COMPILING SHADERS', done: progress > 25 },
            { label: 'LOADING GEOMETRY', done: progress > 40 },
            { label: 'LOADING TEXTURES', done: progress > 60 },
            { label: 'INITIALIZING PHYSICS', done: progress > 75 },
            { label: 'CALIBRATING SENSORS', done: progress > 90 },
          ].map((step, i) => (
            <motion.div
              key={step.label}
              className="flex items-center gap-3 py-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 + i * 0.1, duration: 0.3 }}
            >
              <motion.div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: step.done ? 'var(--color-neon-green)' : 'var(--color-border)',
                  background: step.done ? 'var(--color-neon-green)' : 'transparent',
                }}
                animate={{ scale: step.done ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.3, delay: 1 + i * 0.1 }}
              >
                {step.done && (
                  <svg className="w-3 h-3 mx-auto my-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </motion.div>
              <span className="font-mono text-xs text-muted" style={{ color: step.done ? 'var(--color-neon-green)' : 'inherit' }}>
                {step.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Version info */}
        <motion.p
          className="mt-8 font-mono text-xs text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.5 }}
        >
          NEURAL LINK v3.7.2 • BUILD 2024.12.19 • WEBGL2
        </motion.p>
      </div>
    </div>
  );
}