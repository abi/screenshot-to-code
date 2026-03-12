import { getPricingPlansState } from "./pricingPlansState";

describe("getPricingPlansState", () => {
  test("keeps free users on checkout CTAs", () => {
    expect(
      getPricingPlansState({
        subscriberTier: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      }),
    ).toEqual({
      isFreeUser: true,
      isCancellationScheduled: false,
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
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      }),
    ).toEqual({
      isFreeUser: false,
      isCancellationScheduled: false,
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
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      }),
    ).toEqual({
      isFreeUser: false,
      isCancellationScheduled: false,
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
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2026-04-12T14:07:41+00:00",
    });

    expect(state.isCancellationScheduled).toBe(true);
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
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2026-04-12T14:07:41+00:00",
    });

    expect(state.isCancellationScheduled).toBe(true);
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
});
