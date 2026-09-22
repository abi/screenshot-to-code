import { create } from 'zustand';

export const useStore = create((set) => ({
  // Camera state
  cameraState: {
    position: [0, 0, 50],
    target: [0, 0, 0],
    fov: 50,
  },
  setCameraState: (state) => set((prev) => ({
    cameraState: { ...prev.cameraState, ...state }
  })),
  
  // Section management
  currentSection: 0,
  setSection: (section) => set({ currentSection: section }),
  
  // GPU tier
  gpuTier: 'unknown',
  setGPUTier: (tier) => set({ gpuTier: tier }),
  
  // UI State
  hudVisible: true,
  setHUDVisible: (visible) => set({ hudVisible: visible }),
  
  audioEnabled: true,
  setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),
  
  // Interaction state
  hoveredHotspot: null,
  setHoveredHotspot: (hotspot) => set({ hoveredHotspot: hotspot }),
  
  selectedConfig: 'default',
  setSelectedConfig: (config) => set({ selectedConfig: config }),
  
  // Performance
  fps: 60,
  setFPS: (fps) => set({ fps }),
  
  // Loading state
  assetsLoaded: false,
  setAssetsLoaded: (loaded) => set({ assetsLoaded: loaded }),
  
  // Mouse interaction
  mousePosition: { x: 0, y: 0 },
  setMousePosition: (pos) => set({ mousePosition: pos }),
  
  // Scroll progress
  scrollProgress: 0,
  setScrollProgress: (progress) => set({ scrollProgress: progress }),
  
  // Camera animation
  cameraAnimating: false,
  setCameraAnimating: (animating) => set({ cameraAnimating: animating }),
  
  // Configurator state
  currentMaterial: 'metal',
  currentColor: '#ff006e',
  setCurrentMaterial: (material) => set({ currentMaterial: material }),
  setCurrentColor: (color) => set({ currentColor: color }),
  
  // Audio
  masterVolume: 0.5,
  setMasterVolume: (volume) => set({ masterVolume: volume }),
  
  // Reset to defaults
  reset: () => set({
    currentSection: 0,
    hudVisible: true,
    audioEnabled: true,
    hoveredHotspot: null,
    selectedConfig: 'default',
    currentMaterial: 'metal',
    currentColor: '#ff006e',
  }),
}));