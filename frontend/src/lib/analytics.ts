export function addEvent(eventName: string) {
  try {
    window.plausible(eventName);
  } catch (e) {
    // silently fail in non-production environments
  }
}
