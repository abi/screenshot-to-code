// plausible.d.ts

// Define the Plausible function type
type Plausible = (eventName: string, options?: PlausibleOptions) => void;

// Define the Plausible options type
interface PlausibleOptions {
  callback?: () => void;
  props?: Record<string, unknown>;
}

// Extend the Window interface to include the `plausible` function
declare global {
  interface Window {
    plausible: Plausible;
    ttq?: {
      track: (eventName: string, payload?: Record<string, unknown>) => void;
    };
  }
}

export {};
