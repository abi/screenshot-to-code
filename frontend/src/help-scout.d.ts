// help-scout.d.ts
type Beacon = (eventName: string, options?: any) => void;

// Extend the Window interface to include the `plausible` function
declare global {
  interface Window {
    Beacon: Beacon;
  }
}

export {};
