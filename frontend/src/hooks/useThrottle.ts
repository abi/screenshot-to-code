import React from "react";

// Updates take effect immediately if the last update was more than {interval} ago.
// Otherwise, updates are throttled to {interval}. The latest value is always sent.
// The last update always gets executed, with potentially a {interval} delay.
export function useThrottle(value: string, interval = 500) {
  const [throttledValue, setThrottledValue] = React.useState(value);
  const lastUpdated = React.useRef<number | null>(null);

  React.useEffect(() => {
    const now = performance.now();

    if (!lastUpdated.current || now >= lastUpdated.current + interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const id = window.setTimeout(() => {
        lastUpdated.current = now;
        setThrottledValue(value);
      }, interval);

      return () => window.clearTimeout(id);
    }
  }, [value, interval]);

  return throttledValue;
}
export default useThrottle;
