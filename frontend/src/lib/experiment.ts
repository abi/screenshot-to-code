const FREE_TRIAL_GENERATION_LIMIT = 1;
const FREE_TRIAL_STORAGE_KEY = "freeTrialGenerationsUsed";

export type ExperimentGroup = "control" | "delayed_paywall";

/**
 * Deterministically assign a user to an experiment group based on their user ID.
 * Uses a simple hash to split users ~50/50.
 *
 * A/B test: "delayed_paywall" grants 1 free generation before the paywall;
 * "control" shows the paywall immediately.
 */
export function getExperimentGroup(userId: string): ExperimentGroup {
  void userId;
  // Experiment concluded: keep the group/data types around for historical
  // analysis, but stop assigning users to the delayed paywall.
  return "control";
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
