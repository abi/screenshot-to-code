import { useFrame } from '@react-three/fiber';
import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function CTASection({ progress = 0, time = 0, reduced = false }) {
  const [visible, setVisible] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    organization: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('idle');
  
  const formRef = useRef(null);
  const warpRef = useRef(null);
  
  const sectionProgress = Math.max(0, Math.min(1, (progress - 0.75) * 4));
  const isVisible = sectionProgress > 0.1;
  
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#cta',
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
        onUpdate: (self) => {
          const prog = self.progress;
          if (warpRef.current) {
            warpRef.current.style.opacity = prog;
            warpRef.current.style.transform = `scale(${1 + prog * 2})`;
          }
        }
      }
    });
    
    // Initial reveal animation
    const initTl = gsap.timeline();
    initTl
      .to('#cta-title', { 
        opacity: 1, 
        y: 0, 
        duration: 1.2, 
        ease: 'power3.out' 
      })
      .to('#cta-subtitle', { 
        opacity: 1, 
        y: 0, 
        duration: 0.8, 
        ease: 'power3.out' 
      }, '-=0.6')
      .to('#cta-form', { 
        opacity: 1, 
        y: 0, 
        duration: 0.8, 
        ease: 'power3.out' 
      }, '-=0.4')
      .to('#cta-stats', { 
        opacity: 1, 
        y: 0, 
        duration: 0.8, 
        ease: 'power3.out' 
      }, '-=0.4');
    
    setVisible(true);
    
    return () => {
      tl.kill();
      initTl.kill();
    };
  }, []);
  
  // Warp effect based on progress
  useFrame((state) => {
    if (warpRef.current) {
      const warpProgress = Math.max(0, Math.min(1, (progress - 0.75) * 4));
      warpRef.current.style.opacity = warpProgress;
      warpRef.current.style.transform = `scale(${1 + warpProgress * 3})`;
    }
  });
  
  if (!isVisible) return null;
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus('submitting');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSubmitStatus('success');
    setSubmitted(true);
    setFormState({ name: '', email: '', organization: '', message: '' });
    
    setTimeout(() => setSubmitStatus('idle'), 5000);
  };
  
  const handleChange = (e) => {
    setFormState(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };
  
  return (
    <section id="cta" className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden">
      {/* Warp background effect */}
      <motion.div
        ref={warpRef}
        className="absolute inset-0 bg-gradient-to-r from-[var(--color-neon-pink)] via-[var(--color-neon-purple)] to-[var(--color-neon-blue)] opacity-0 pointer-events-none"
        style={{ filter: 'blur(100px)' }}
        animate={{ opacity: [0, 0.15, 0], scale: [1, 3, 5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Warp tunnel effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-neon-pink)]/10 to-transparent" style={{
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)'
        }} />
        {[1, 2, 3, 4, 5].map(i => (
          <motion.div
            key={i}
            className="absolute inset-0 border-2 rounded-full pointer-events-none"
            style={{ 
              borderColor: ['var(--color-neon-pink)', 'var(--color-neon-blue)', 'var(--color-neon-purple)', 'var(--color-neon-green)', 'var(--color-neon-orange)'][i - 1],
              opacity: 0.1,
            }}
            animate={{ scale: [0.2, 1], opacity: [0.15, 0] }}
            transition={{ duration: 4, delay: i * 0.5, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
      </div>
      
      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none" style={{ opacity: 0.5 }} />
      
      {/* Star field */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(100)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{ 
              duration: Math.random() * 3 + 2, 
              delay: Math.random() * 5, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }}
          />
        ))}
      </div>
      
      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full px-6">
        {/* Header */}
        <motion.div
          id="cta-title"
          className="text-center mb-12"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest mb-4 block">
            FINAL TRANSMISSION
          </span>
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter text-center leading-[1.05] text-balance text-gradient">
            ESTABLISH <span className="text-[var(--color-neon-pink)]">NEURAL LINK</span>
          </h1>
        </motion.div>
        
        <motion.p
          id="cta-subtitle"
          className="text-lg md:text-xl lg:text-2xl text-center max-w-3xl mx-auto mb-16 font-light tracking-wide"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ color: '#a0a0b8' }}
        >
          Join the neural network. Connect your consciousness to the collective intelligence.
          <br />
          <span className="font-display font-semibold text-gradient">Zero latency. Infinite bandwidth.</span>
        </motion.p>
        
        {/* Form or Success State */}
        <motion.div
          id="cta-form"
          className="w-full max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: submitted ? 0 : 1, y: submitted ? -30 : 0 }}
          transition={{ duration: 0.5 }}
        >
          {!submitted ? (
            <form onSubmit={handleSubmit} className="glass-strong neon-border p-8 md:p-10" style={{ 
              clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
              borderColor: '#ff006e',
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <InputField
                  name="name"
                  label="DESIGNATION"
                  type="text"
                  placeholder="YOUR NAME"
                  value={formState.name}
                  onChange={handleChange}
                  required
                  icon="👤"
                />
                <InputField
                  name="email"
                  label="TRANSMISSION CHANNEL"
                  type="email"
                  placeholder="EMAIL ADDRESS"
                  value={formState.email}
                  onChange={handleChange}
                  required
                  icon="📡"
                />
              </div>
              
              <div className="mb-6">
                <InputField
                  name="organization"
                  label="COLLECTIVE / ORGANIZATION"
                  type="text"
                  placeholder="COMPANY OR GROUP"
                  value={formState.organization}
                  onChange={handleChange}
                  icon="🏢"
                />
              </div>
              
              <div className="mb-8">
                <label className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest mb-2 block">
                  TRANSMISSION PAYLOAD
                </label>
                <textarea
                  name="message"
                  className="w-full min-h-[120px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 font-mono text-sm text-white placeholder:text-muted-light focus:outline-none focus:border-[var(--color-neon-pink)] focus:ring-2 focus:ring-[var(--color-neon-pink)]/20 resize-none transition-all duration-300"
                  placeholder="YOUR MESSAGE TO THE NETWORK..."
                  value={formState.message}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={submitStatus === 'submitting'}
                className="btn-neon w-full py-4 text-lg"
                style={{ 
                  clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)',
                }}
              >
                {submitStatus === 'submitting' ? (
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                    </svg>
                    <span>TRANSMITTING...</span>
                  </span>
                ) : (
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    ESTABLISH LINK
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </span>
                )}
              </button>
            </form>
          ) : (
            <motion.div
              className="glass-strong neon-border p-8 md:p-12 text-center" style={{ 
                clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                borderColor: '#39ff14',
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="w-20 h-20 mx-auto mb-6 flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 rounded-full bg-[var(--color-neon-green)]/30 blur-xl animate-pulse-slow" />
                  <svg className="w-full h-full text-[var(--color-neon-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </motion.div>
              
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gradient mb-4">
                LINK <span className="text-[var(--color-neon-green)]">ESTABLISHED</span>
              </h2>
              
              <p className="text-muted text-lg mb-8 max-w-xl mx-auto">
                Welcome to the neural collective. Your transmission has been received and integrated into the network.
              </p>
              
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="glass p-4">
                  <p className="font-mono text-xs text-[var(--color-neon-green)] uppercase tracking-widest mb-1">LATENCY</p>
                  <p className="font-display text-2xl font-bold text-[var(--color-neon-green)]">{'< 1ms'}</p>
                </div>
                <div className="glass p-4">
                  <p className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest mb-1">BANDWIDTH</p>
                  <p className="font-display text-2xl font-bold text-[var(--color-neon-pink)]">∞ TB/s</p>
                </div>
                <div className="glass p-4">
                  <p className="font-mono text-xs text-[var(--color-neon-blue)] uppercase tracking-widest mb-1">NODES</p>
                  <p className="font-display text-2xl font-bold text-[var(--color-neon-blue)]">∞</p>
                </div>
              </div>
              
              <motion.button
                className="btn-neon"
                onClick={() => { setSubmitted(false); setFormState({ name: '', email: '', organization: '', message: '' }); }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                SEND ANOTHER TRANSMISSION
              </motion.button>
            </motion.div>
          )}
        </motion.div>
        
        {/* Stats */}
        <motion.div
          id="cta-stats"
          className="w-full max-w-4xl flex justify-around gap-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <StatItem 
            value="10,000+" 
            label="NEURAL NODES" 
            color="var(--color-neon-pink)"
            delay={0}
          />
          <StatItem 
            value="0.001ms" 
            label="AVERAGE LATENCY" 
            color="var(--color-neon-blue)"
            delay={0.1}
          />
          <StatItem 
            value="99.999%" 
            label="UPTIME GUARANTEE" 
            color="var(--color-neon-green)"
            delay={0.2}
          />
          <StatItem 
            value="∞" 
            label="BANDWIDTH" 
            color="var(--color-neon-purple)"
            delay={0.3}
          />
        </motion.div>
        
        {/* Terminal */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
        >
          <CTATerminal />
        </motion.div>
      </div>
    </section>
  );
}

function InputField({ name, label, type, placeholder, value, onChange, required, icon }) {
  return (
    <div>
      <label className="font-mono text-xs text-[var(--color-neon-pink)] uppercase tracking-widest mb-2 block flex items-center gap-2">
        <span>{icon}</span>
        {label}
        {required && <span className="text-[var(--color-neon-pink)]">*</span>}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-3 font-mono text-sm text-white placeholder:text-muted-light focus:outline-none focus:border-[var(--color-neon-pink)] focus:ring-2 focus:ring-[var(--color-neon-pink)]/20 transition-all duration-300"
      />
    </div>
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

function CTATerminal() {
  const lines = [
    '> NEURAL LINK PROTOCOL v3.7.2 INITIALIZED',
    '> ENCRYPTION: QUANTUM-RESISTANT AES-512 [ACTIVE]',
    '> HANDSHAKE COMPLETE. SESSION KEY EXCHANGED.',
    '> BIOMETRIC VERIFICATION: PASSED',
    '> NEURAL INTERFACE CALIBRATED: 0.0003ms LATENCY',
    '> COLLECTIVE CONSCIOUSNESS: SYNCHRONIZED',
    '> AWAITING USER DIRECTIVE...',
  ];
  
  return (
    <div className="glass-strong p-6 neon-border font-mono text-sm text-[var(--color-neon-green)] max-w-4xl mx-auto" style={{ 
      clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      borderColor: '#39ff14',
    }}>
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