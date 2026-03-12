import { getPricingPlansState } from "./pricingPlansState";

describe("getPricingPlansState", () => {
  test("keeps free users on checkout CTAs", () => {
    expect(
      getPricingPlansState({
        subscriberTier: null,
        billingInterval: null,
        selectedInterval: "monthly",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      }),
    ).toEqual({
      isFreeUser: true,
      isCancellationScheduled: false,
      isViewingDifferentInterval: false,
      cancellationNotice: null,
      hobbyButton: {
        label: "Get Started",
        disabled: false,
      },
      proButton: {
        label: "Get Started",
        disabled: false,
      },
    });
  });

  test("keeps active hobby subscribers upgradeable", () => {
    expect(
      getPricingPlansState({
        subscriberTier: "hobby",
        billingInterval: "monthly",
        selectedInterval: "monthly",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      }),
    ).toEqual({
      isFreeUser: false,
      isCancellationScheduled: false,
      isViewingDifferentInterval: false,
      cancellationNotice: null,
      hobbyButton: {
        label: "Current plan",
        disabled: true,
      },
      proButton: {
        label: "Upgrade to Pro",
        disabled: false,
      },
    });
  });

  test("keeps active pro subscribers downgradeable", () => {
    expect(
      getPricingPlansState({
        subscriberTier: "pro",
        billingInterval: "monthly",
        selectedInterval: "monthly",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      }),
    ).toEqual({
      isFreeUser: false,
      isCancellationScheduled: false,
      isViewingDifferentInterval: false,
      cancellationNotice: null,
      hobbyButton: {
        label: "Switch to Hobby now",
        disabled: false,
      },
      proButton: {
        label: "Current plan",
        disabled: true,
      },
    });
  });

  test("disables tier changes for hobby subscribers scheduled to cancel", () => {
    const state = getPricingPlansState({
      subscriberTier: "hobby",
      billingInterval: "monthly",
      selectedInterval: "monthly",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2026-04-12T14:07:41+00:00",
    });

    expect(state.isCancellationScheduled).toBe(true);
    expect(state.isViewingDifferentInterval).toBe(false);
    expect(state.cancellationNotice).toContain("Your Hobby plan is scheduled to cancel on");
    expect(state.hobbyButton).toEqual({
      label: "Current plan",
      disabled: true,
    });
    expect(state.proButton).toEqual({
      label: "Manage billing to change",
      disabled: true,
    });
  });

  test("disables tier changes for pro subscribers scheduled to cancel", () => {
    const state = getPricingPlansState({
      subscriberTier: "pro",
      billingInterval: "monthly",
      selectedInterval: "monthly",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2026-04-12T14:07:41+00:00",
    });

    expect(state.isCancellationScheduled).toBe(true);
    expect(state.isViewingDifferentInterval).toBe(false);
    expect(state.cancellationNotice).toContain("Your Pro plan is scheduled to cancel on");
    expect(state.hobbyButton).toEqual({
      label: "Manage billing to change",
      disabled: true,
    });
    expect(state.proButton).toEqual({
      label: "Current plan",
      disabled: true,
    });
  });

  test("disables plan switching when a paid user is only viewing a different interval", () => {
    const state = getPricingPlansState({
      subscriberTier: "hobby",
      billingInterval: "monthly",
      selectedInterval: "yearly",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    });

    expect(state.isFreeUser).toBe(false);
    expect(state.isCancellationScheduled).toBe(false);
    expect(state.isViewingDifferentInterval).toBe(true);
    expect(state.cancellationNotice).toBeNull();
    expect(state.hobbyButton).toEqual({
      label: "Current monthly plan",
      disabled: true,
    });
    expect(state.proButton).toEqual({
      label: "Switch via support",
      disabled: true,
    });
  });
});
