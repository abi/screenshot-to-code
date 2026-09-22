/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        neon: {
          pink: '#ff006e',
          blue: '#00f3ff',
          green: '#39ff14',
          purple: '#bc13fe',
          orange: '#ff6b00',
        },
        dark: {
          50: '#1e1e2e',
          100: '#1a1a2a',
          200: '#161624',
          300: '#12121e',
          400: '#0e0e18',
          500: '#0a0a12',
          600: '#08080e',
          700: '#06060a',
          800: '#040407',
          900: '#020204',
          950: '#010102',
        },
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'display': ['Orbitron', 'Rajdhani', 'sans-serif'],
        'sans': ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scanline': 'scanline 8s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'rotate-slow': 'rotate 20s linear infinite',
        'warp': 'warp 1s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(255, 0, 110, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(0, 243, 255, 0.6)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        warp: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.5)', opacity: '0' },
          '100%': { transform: 'scale(0.5)', opacity: '0' },
        },
      },
      backgroundImage: {
        'grid': 'linear-gradient(rgba(255,0,110,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,243,255,0.1) 1px, transparent 1px)',
        'radial-glow': 'radial-gradient(ellipse at center, rgba(255,0,110,0.15) 0%, transparent 70%)',
        'mesh': 'radial-gradient(at 40% 20%, rgba(255,0,110,0.2) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(0,243,255,0.2) 0px, transparent 50%), radial-gradient(at 20% 80%, rgba(188,19,254,0.2) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
}