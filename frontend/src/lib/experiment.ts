const FREE_TRIAL_GENERATION_LIMIT = 5;
const FREE_TRIAL_STORAGE_KEY = "freeTrialGenerationsUsed";

export type ExperimentGroup = "control" | "delayed_paywall";

/**
 * Deterministically assign a user to an experiment group based on their user ID.
 * Uses a simple hash to split users ~50/50.
 */
export function getExperimentGroup(userId: string): ExperimentGroup {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 2 === 0 ? "delayed_paywall" : "control";
}

export function getFreeTrialGenerationsUsed(): number {
  try {
    const stored = localStorage.getItem(FREE_TRIAL_STORAGE_KEY);
    return stored ? parseInt(stored, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function incrementFreeTrialGenerations(): number {
  const current = getFreeTrialGenerationsUsed();
  const next = current + 1;
  try {
    localStorage.setItem(FREE_TRIAL_STORAGE_KEY, String(next));
  } catch {
    // localStorage unavailable
  }
  return next;
}

export function hasRemainingFreeTrialGenerations(): boolean {
  return getFreeTrialGenerationsUsed() < FREE_TRIAL_GENERATION_LIMIT;
}

export { FREE_TRIAL_GENERATION_LIMIT };
