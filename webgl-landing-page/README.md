# NEURAL LINK - Cyberpunk 3D WebGL Landing Page

Award-winning interactive 3D landing page built with React Three Fiber, Three.js, GSAP, and Tailwind CSS. Designed for Awwwards/FWA recognition with cyberpunk/sci-fi aesthetics.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🛠 Tech Stack

### Core Framework
- **React 18** - Modern React with hooks and concurrent features
- **Vite 5** - Lightning-fast build tool and dev server
- **TypeScript-ready** - JSDoc types for type safety

### 3D & WebGL
- **@react-three/fiber (R3F)** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for R3F
- **@react-three/postprocessing** - Post-processing effects (Bloom, Chromatic Aberration, SMAA, etc.)
- **@react-three/rapier** - Physics engine (optional)
- **Three.js r157** - Core 3D engine

### Animation & Interaction
- **GSAP 3.12 + ScrollTrigger** - Professional animation and scroll-driven interactions
- **Framer Motion** - React animation library for UI transitions

### Styling
- **Tailwind CSS 3.3** - Utility-first CSS with custom design tokens
- **Custom CSS Properties** - Design system with CSS variables
- **PostCSS** - CSS processing pipeline

### State Management
- **Zustand** - Lightweight state management for 3D scene state

## 📁 Project Structure

```
webgl-landing-page/
├── public/
│   ├── models/           # GLTF/GLB 3D models
│   ├── textures/         # Texture files (HDR, PNG, JPG)
│   └── favicon.svg       # App icon
├── src/
│   ├── components/       # React components
│   │   ├── HeroSection.jsx
│   │   ├── FeatureShowcase.jsx
│   │   ├── InteractiveZone.jsx
│   │   ├── CTASection.jsx
│   │   ├── HUDOverlay.jsx
│   │   ├── LoadingScreen.jsx
│   │   ├── ParticleField.jsx
│   │   ├── EnergyCore.jsx
│   │   ├── CameraController.jsx
│   │   ├── HotspotSystem.jsx
│   │   ├── GPUDetector.jsx
│   │   └── ...
│   ├── hooks/
│   │   └── useScrollProgress.js
│   ├── shaders/
│   │   └── index.js       # GLSL shaders
│   ├── store.js           # Zustand store
│   ├── styles/
│   │   ├── globals.css
│   │   ├── utilities.css
│   │   ├── components.css
│   │   └── animations.css
│   ├── App.jsx            # Main app component
│   └── main.jsx           # Entry point
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## 🎨 Design System

### Color Palette
```css
--color-neon-pink:   #ff006e  /* Primary accent */
--color-neon-blue:   #00f3ff  /* Secondary accent */
--color-neon-green:  #39ff14  /* Success/active state */
--color-neon-purple: #bc13fe  /* Tertiary accent */
--color-neon-orange: #ff6b00  /* Warning/energy */

--color-bg:          #0a0a12  /* Primary background */
--color-bg-elevated: #0e0e18  /* Cards/panels */
```

### Typography
- **Display**: Orbitron (headings, numbers)
- **Sans**: Space Grotesk (body text)
- **Mono**: JetBrains Mono (code, data, terminals)

### Custom Tailwind Classes
```css
.btn-neon           /* Cyberpunk button with clip-path */
.hud-panel          /* HUD panel with clipped corners */
.glass / .glass-strong  /* Frosted glass panels */
.neon-border        /* Gradient border */
.text-gradient      /* Gradient text */
.glow-pink/blue/purple  /* Neon glow shadows */
```

## 🎮 Sections Overview

| Section | Route | Description |
|---------|-------|-------------|
| Hero | `#hero` | Title screen with particle field, energy core, CTA |
| Features | `#features` | 3D feature cards with hotspots, exploded views |
| Interactive | `#interactive` | Real-time 3D configurator (materials, colors, explode) |
| CTA | `#cta` | Warp effect, neural link form, success state |

## 🔧 Key Features

### 3D Scene
- **Particle Field** - 15,000 particles with noise-based movement, mouse attraction
- **Energy Core** - Multi-layer core with rings, inner glow, particle system
- **Camera Controller** - Scroll-driven camera paths with smooth transitions
- **Hotspot System** - 3D markers with world-to-screen projection, detail panels

### Post-Processing Pipeline
1. **RenderPass** - Base render
2. **BloomEffect** - Neon glow on bright areas
3. **ChromaticAberrationEffect** - RGB shift for cyberpunk feel
4. **VignetteEffect** - Cinematic darkening
5. **NoiseEffect** - Subtle film grain
6. **SMAAEffect** - Anti-aliasing

### Performance Optimizations
- **Adaptive Canvas** - GPU tier detection (high/medium/low)
- **Dynamic Particle Count** - 15k/8k/3k based on GPU tier
- **Lazy Loading** - Suspense + React.lazy for heavy sections
- **DPR Capping** - `Math.min(devicePixelRatio, 2)`
- **Level of Detail (LOD)** - Geometry simplification at distance
- **Reduced Motion** - Respects `prefers-reduced-motion`

### Accessibility
- `prefers-reduced-motion` support
- Semantic HTML with ARIA labels
- Keyboard navigation support
- Focus-visible styles
- Screen reader compatible
- Color contrast compliance

## 📦 Installation

```bash
# Clone and install
git clone <repo-url>
cd webgl-landing-page
npm install

# Verify GPU detection works
npm run dev
```

### Required Peer Dependencies
All dependencies are listed in `package.json`. Key versions:
- `three@^0.157`
- `@react-three/fiber@^8.14`
- `@react-three/drei@^9.88`
- `@react-three/postprocessing@^2.15`
- `gsap@^3.12`
- `framer-motion@^10+`
- `tailwindcss@^3.3`

## 🎯 Customization

### Adding New Sections
1. Create component in `src/components/`
2. Add to `MainScene` in `App.jsx`
3. Add HTML section in `Html` wrapper
4. Update `CameraController` positions

### Adding Hotspots
```javascript
// In HotspotSystem.jsx
const HOTSPOTS = [
  {
    id: 'my-hotspot',
    position: [x, y, z],
    title: 'MY HOTSPOT',
    description: 'Description text',
    icon: '🎯',
    color: '#ff006e',
  }
];
```

### Custom Shaders
Add GLSL shaders in `src/shaders/index.js`:
```javascript
export const myCustomShader = {
  vertexShader: `...`,
  fragmentShader: `...`,
  uniforms: { uTime: { value: 0 } }
};
```

### Changing Colors
Edit `tailwind.config.js` and `src/styles/globals.css`:
```css
:root {
  --color-neon-pink: #your-color;
  --color-neon-blue: #your-color;
  --hero-gradient: linear-gradient(...);
}
```

## 📱 Responsive Breakpoints
- **Mobile**: < 640px (reduced particles, simplified UI)
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px (full experience)

## 🚀 Deployment

### Build for Production
```bash
npm run build
# Output in /dist folder
```

### Deploy to Vercel/Netlify
```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod --dir=dist
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🎨 Asset Requirements

### 3D Models (place in `/public/models/`)
- `scene.glb` - Main scene/model
- `energy-core.glb` - Energy core model
- `robot.glb` - Robot/character model

### Textures (place in `/public/textures/`)
- `space-bg.jpg` - Space background (4096x2048)
- `particle.png` - Particle sprite (64x64)
- `env/` - HDRI environment maps (6 faces)

### HDR Environment (place in `/public/textures/env/`)
- `px.png, nx.png, py.png, ny.png, pz.png, nz.png` - Cubemap faces

## 🐛 Debugging

### Enable Debug Mode
```javascript
// In browser console
localStorage.setItem('debug', 'true');
// Or add ?debug=true to URL
```

### Performance Monitoring
```javascript
// In browser console
// Shows FPS, draw calls, memory
stats.begin();
// ... render loop ...
stats.end();
```

### GPU Detection
Open DevTools console to see:
```
GPU: NVIDIA GeForce RTX 3080
Tier: high
Extensions: 42
```

## 📄 License

MIT License - Feel free to use for personal and commercial projects.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 🙏 Credits

- **Three.js** - Mr.doob & contributors
- **React Three Fiber** - Poimandres collective
- **Drei** - Poimandres collective
- **GSAP** - GreenSock
- **Tailwind CSS** - Tailwind Labs
- **Framer Motion** - Framer
- **Zustand** - Poimandres

## 📞 Support

- Issues: GitHub Issues
- Discussions: GitHub Discussions
- Email: support@neurallink.example.com

---

**Built with ❤️ for the web creative community**

*Push the boundaries of what's possible in the browser.*