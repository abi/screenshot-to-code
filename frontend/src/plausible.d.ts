// plausible.d.ts

// Define the Plausible function type
type Plausible = (eventName: string, options?: PlausibleOptions) => void;

// Define the Plausible options type
interface PlausibleOptions {
  callback?: () => void;
  props?: Record<string, any>;
}

// Extend the Window interface to include the `plausible` function
declare global {
  interface Window {
    plausible: Plausible;
  }
}

export {};
