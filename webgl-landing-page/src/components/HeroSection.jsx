import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function HeroSection({ progress = 0, time = 0, reduced = false }) {
  const [visible, setVisible] = useState(false);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef = useRef(null);
  const statsRef = useRef(null);
  
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
        onUpdate: (self) => {
          const prog = self.progress;
          // Title reveal
          if (prog < 0.1) {
            const opacity = 1 - prog * 10;
            if (titleRef.current) {
              titleRef.current.style.opacity = opacity;
              titleRef.current.style.transform = `translateY(${prog * 100}px)`;
            }
          }
        }
      }
    });
    
    // Wait for refs to be mounted before animating
    const refsReady = titleRef.current && subtitleRef.current && ctaRef.current && statsRef.current;
    
    // Initial reveal animation
    const initTl = refsReady ? gsap.timeline() : null;
    if (initTl) {
      initTl
        .to(titleRef.current, { 
        opacity: 1, 
        y: 0, 
        duration: 1.2, 
        ease: 'power3.out' 
      })
      .to(subtitleRef.current, { 
        opacity: 1, 
        y: 0, 
        duration: 0.8, 
        ease: 'power3.out' 
      }, '-=0.6')
      .to(ctaRef.current, { 
        opacity: 1, 
        y: 0, 
        duration: 0.8, 
        ease: 'power3.out' 
      }, '-=0.4')
      .to(statsRef.current, { 
        opacity: 1, 
        y: 0, 
        duration: 0.8, 
        ease: 'power3.out' 
      }, '-=0.4');
    }
    
    setVisible(true);
    
    return () => {
      tl.kill();
      if (initTl) initTl.kill();
    };
  }, []);
  

  
  if (!visible) return null;
  
  return (
    <section id="hero" className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid opacity-30" style={{
        transform: `translateZ(-100px) scale(1.2) translateY(${progress * 20}px)`
      }} />
      
      {/* Radial glow background */}
      <div className="absolute inset-0 bg-mesh" style={{
        opacity: 0.5,
        transform: `scale(${1 + progress * 0.5})`
      }} />
      
      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none" />
      
      {/* Floating geometric shapes */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 border-[var(--color-neon-pink)]/20 rounded-full animate-float pointer-events-none" style={{ animationDelay: '0s' }} />
      <div className="absolute top-1/3 right-1/3 w-48 h-48 border-[var(--color-neon-blue)]/20 rounded-[50%_50%_50%_50%/60%_40%_60%_40%] animate-morph pointer-events-none" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-1/3 left-1/3 w-32 h-32 border-[var(--color-neon-purple)]/20 rotate-45 animate-float pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 border-[var(--color-neon-green)]/20 rounded-[50%_50%_50%_50%/60%_40%_60%_40%] animate-morph pointer-events-none" style={{ animationDelay: '1.5s' }} />
      
      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full px-6">
        {/* Top accent bar */}
        <div className="mb-12 flex items-center gap-4">
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-[var(--color-neon-pink)] to-transparent" />
          <span className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest">NEURAL LINK v3.7</span>
          <div className="w-24 h-px bg-gradient-to-r from-[var(--color-neon-pink)] via-transparent to-transparent" />
        </div>
        
        {/* Main Title */}
        <motion.h1
          ref={titleRef}
          className="font-display text-6xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter text-center leading-[1.05] text-balance"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #ff006e 30%, #00f3ff 60%, #bc13fe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 40px rgba(255,0,110,0.3))'
          }}
        >
          NEURAL<span className="text-[var(--color-neon-pink)]">LINK</span>
        </motion.h1>
        
        {/* Subtitle */}
        <motion.p
          ref={subtitleRef}
          className="mt-6 text-lg md:text-xl lg:text-2xl text-center max-w-3xl mx-auto font-light tracking-wide"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            color: '#a0a0b8',
            background: 'linear-gradient(135deg, #8888a8 0%, #00f3ff 50%, #bc13fe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Next-Generation Neural Interface<br />
          <span className="font-display font-semibold text-gradient">WebGL 3D Experience</span>
        </motion.p>
        
        {/* Scroll indicator */}
        <motion.div
          className="mt-16 flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <div className="relative w-8 h-40">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-20 bg-gradient-to-t from-[var(--color-neon-pink)] via-[var(--color-neon-blue)] to-transparent rounded-full" />
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[var(--color-neon-pink)] glow-pink"
              animate={{ y: [0, 300, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <p className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest">
            SCROLL TO INITIALIZE
          </p>
        </motion.div>
        
        {/* Stats bar */}
        <motion.div
          ref={statsRef}
          className="mt-20 w-full max-w-4xl flex justify-around gap-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <StatItem 
            value="NEURAL LINK" 
            label="SYSTEM ONLINE" 
            color="var(--color-neon-pink)"
            delay={0}
          />
          <StatItem 
            value="v3.7.2" 
            label="FIRMWARE" 
            color="var(--color-neon-blue)"
            delay={0.1}
          />
          <StatItem 
            value="0.00ms" 
            label="LATENCY" 
            color="var(--color-neon-green)"
            delay={0.2}
          />
          <StatItem 
            value="99.99%" 
            label="UPTIME" 
            color="var(--color-neon-purple)"
            delay={0.3}
          />
        </motion.div>
        
        {/* CTA Button */}
        <motion.div
          ref={ctaRef}
          className="mt-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <button className="btn-neon group relative z-10">
            <span className="relative z-10">INITIALIZE NEURAL LINK</span>
            <span className="absolute inset-0 bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-neon-green)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <svg className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </motion.div>
      </div>
      
      {/* Bottom terminal */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
      >
        <TerminalLines />
      </motion.div>
    </section>
  );
}

function StatItem({ value, label, color, delay = 0 }) {
  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 + delay, duration: 0.6 }}
    >
      <div className="stat-value" style={{ color }}>
        {value}
      </div>
      <div className="stat-label mt-1">
        {label}
      </div>
    </motion.div>
  );
}

function TerminalLines() {
  const lines = [
    '> INITIALIZING NEURAL INTERFACE v3.7.2...',
    '> CHECKING GPU CAPABILITIES... [OK]',
    '> LOADING SHADER PROGRAMS... [OK]',
    '> INITIALIZING PARTICLE FIELD... [OK]',
    '> CALIBRATING ENERGY CORE... [OK]',
    '> ESTABLISHING NEURAL LINK... [READY]',
    '> SYSTEM ONLINE. AWAITING USER INPUT.',
  ];
  
  return (
    <div className="glass-strong p-6 neon-border font-mono text-sm text-[var(--color-neon-green)] max-w-4xl mx-auto">
      {lines.map((line, i) => (
        <motion.p
          key={i}
          className="terminal-line mb-1 overflow-hidden"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 2.5 + i * 0.15, duration: 0.4 }}
        >
          {line}
        </motion.p>
      ))}
    </div>
  );
}