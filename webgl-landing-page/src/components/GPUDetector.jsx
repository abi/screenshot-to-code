import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function GPUDetector() {
  const [gpuInfo, setGpuInfo] = useState(null);
  const [tier, setTier] = useState('unknown');
  const [webgl2Supported, setWebgl2Supported] = useState(false);
  const [extensions, setExtensions] = useState([]);
  
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    
    if (!gl) {
      setWebgl2Supported(false);
      setTier('none');
      return;
    }
    
    setWebgl2Supported(true);
    
    const supportedExtensions = gl.getSupportedExtensions() || [];
    setExtensions(supportedExtensions);
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let renderer = 'Unknown';
    let vendor = 'Unknown';
    
    if (debugInfo) {
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
    }
    
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    
    const info = {
      renderer,
      vendor,
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      maxTextureSize,
      maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      maxVaryings: gl.getParameter(gl.MAX_VARYING_VECTORS),
      maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
    };
    
    setGpuInfo(info);
    
    const rendererLower = renderer.toLowerCase();
    let detectedTier = 'low';
    
    if (
      rendererLower.includes('rtx') || 
      rendererLower.includes('rx 6') || 
      rendererLower.includes('rx 7') || 
      rendererLower.includes('rx 79') ||
      rendererLower.includes('m1') || 
      rendererLower.includes('m2') || 
      rendererLower.includes('m3') ||
      (rendererLower.includes('radeon') && !rendererLower.includes('vega') && !rendererLower.includes('hd')) ||
      (rendererLower.includes('geforce') && !rendererLower.includes('gtx 10') && !rendererLower.includes('gtx 16') && !rendererLower.includes('gtx 9')) ||
      rendererLower.includes('arc') ||
      (rendererLower.includes('apple') && (rendererLower.includes('m1') || rendererLower.includes('m2') || rendererLower.includes('m3')))
    ) {
      detectedTier = 'high';
    } else if (
      rendererLower.includes('gtx 10') || 
      rendererLower.includes('gtx 16') || 
      rendererLower.includes('gtx 9') ||
      rendererLower.includes('rx 5') || 
      rendererLower.includes('rx 4') ||
      rendererLower.includes('vega') ||
      (rendererLower.includes('intel') && (rendererLower.includes('iris') || rendererLower.includes('uhd') || rendererLower.includes('arc'))) ||
      rendererLower.includes('integrated')
    ) {
      detectedTier = 'medium';
    }
    
    setTier(detectedTier);
    console.log('GPU Detection:', { info, tier: detectedTier, extensions: supportedExtensions.length });
  }, []);
  
  if (tier === 'none' || !webgl2Supported) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900">
        <motion.div
          className="text-center max-w-2xl mx-4 p-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="animate-pulse-slow mb-8">
            <svg className="w-24 h-24 mx-auto text-gradient animate-float" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h1 className="font-display text-4xl font-bold text-gradient mb-4">
            WEBGL2 NOT SUPPORTED
          </h1>
          <p className="text-muted mb-8 text-lg">
            This experience requires WebGL2 support with advanced GPU capabilities.
            Your current browser/device does not meet the minimum requirements.
          </p>
          <div className="glass p-4 mb-8 max-w-md mx-auto text-left">
            <p className="font-display text-lg font-bold text-neon-pink mb-2">REQUIREMENTS</p>
            <ul className="text-sm text-muted space-y-1">
              <li>• WebGL2 Support (Chrome 56+, Firefox 51+, Safari 15+, Edge 79+)</li>
              <li>• 2GB+ GPU Memory</li>
              <li>• Modern GPU (2018+)</li>
              <li>• Updated Graphics Drivers</li>
            </ul>
          </div>
          <motion.button 
            onClick={() => window.location.reload()}
            className="btn-neon"
          >
            RETRY DETECTION
          </motion.button>
          <p className="text-xs text-muted mt-6">
            Or <a href="#" className="text-neon-blue hover:text-neon-pink underline">view static fallback</a>
          </p>
        </motion.div>
      </div>
    );
  }
  
  if (process.env.NODE_ENV === 'development') {
    const borderColor = tier === 'high' ? '#39ff14' : tier === 'medium' ? '#ff6b00' : '#ff006e';
    const textColor = tier === 'high' ? '#39ff14' : tier === 'medium' ? '#ff6b00' : '#ff006e';
    
    return (
      <motion.div
        className="fixed bottom-4 right-4 z-50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="glass-strong neon-border p-4 max-w-xs" style={{ borderColor }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-display font-bold text-xs" style={{ color: textColor }}>
              GPU: {tier.toUpperCase()}
            </span>
            <span className="font-mono text-[10px] text-muted">WebGL2: {webgl2Supported ? 'YES' : 'NO'}</span>
          </div>
          <div className="font-mono text-[10px] text-muted space-y-1">
            <div>Renderer: {gpuInfo?.renderer?.substring(0, 30)}...</div>
            <div>Vendor: {gpuInfo?.vendor}</div>
            <div>Max Texture: {gpuInfo?.maxTextureSize}px</div>
            <div>Extensions: {extensions.length}</div>
          </div>
        </div>
      </motion.div>
    );
  }
  
  return null;
}

export function GPUStatusBadge({ tier }) {
  const config = {
    high: { label: 'HIGH PERFORMANCE', color: '#39ff14', icon: '🚀' },
    medium: { label: 'STANDARD', color: '#ff6b00', icon: '⚡' },
    low: { label: 'BASIC', color: '#ff006e', icon: '⚠️' },
    unknown: { label: 'DETECTING...', color: '#888', icon: '🔍' },
    none: { label: 'UNSUPPORTED', color: '#ff006e', icon: '❌' },
  };
  
  const { label, color, icon } = config[tier] || config.unknown;
  
  const badgeStyle = {
    background: `${color}20`,
    color,
    border: `1px solid ${color}40`
  };
  
  const boxShadowStart = '0 0 0';
  const boxShadowEnd = `0 0 10px ${color}50`;
  
  const animateStyle = {
    boxShadow: [boxShadowStart, boxShadowEnd]
  };
  
  return (
    <motion.span
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-mono text-xs font-semibold"
      style={badgeStyle}
      animate={animateStyle}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </motion.span>
  );
}
