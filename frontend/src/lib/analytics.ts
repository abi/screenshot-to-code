export function addEvent(eventName: string, props = {}) {
  try {
    window.plausible(eventName, { props });
  } catch (e) {
    // silently fail in non-production environments
  }
}
