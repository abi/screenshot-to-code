import * as Sentry from "@sentry/react";

type BillingContext = Record<string, string | number | boolean | null | undefined>;

const BILLING_TAG_KEYS: Record<string, string> = {
  action: "billing_action",
  target_tier: "billing_target_tier",
  subscriber_tier: "billing_subscriber_tier",
  billing_interval: "billing_interval",
  price_lookup_key: "price_lookup_key",
};

function getSanitizedContext(context: BillingContext): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== null && value !== undefined),
  ) as Record<string, string | number | boolean>;
}

export function captureBillingException(
  error: unknown,
  {
    flow,
    stage,
    context,
  }: {
    flow: "portal" | "checkout";
    stage: string;
    context: BillingContext;
  },
) {
  const sanitizedContext = getSanitizedContext(context);

  Sentry.withScope((scope) => {
    scope.setTag("area", "billing");
    scope.setTag("billing_flow", flow);
    scope.setTag("billing_stage", stage);
    Object.entries(BILLING_TAG_KEYS).forEach(([contextKey, tagName]) => {
      const value = sanitizedContext[contextKey];
      if (value !== undefined) {
        scope.setTag(tagName, String(value));
      }
    });
    scope.setContext("billing", sanitizedContext);

    if (error instanceof Error) {
      Sentry.captureException(error);
      return;
    }

    Sentry.captureException(new Error(typeof error === "string" ? error : "Unknown billing error"));
  });
}
