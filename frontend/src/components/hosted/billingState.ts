import { SAAS_BACKEND_URL } from "../../config";
import { useStore } from "../../store/store";
import { UserResponse } from "./types";

type AuthenticatedFetch = (
  url: string,
  method?: "GET" | "POST" | "PUT" | "DELETE",
  body?: object | null | undefined,
) => Promise<UserResponse | undefined>;

export async function fetchHostedUser(
  authenticatedFetch: AuthenticatedFetch,
): Promise<UserResponse | undefined> {
  return authenticatedFetch(SAAS_BACKEND_URL + "/users/create", "POST");
}

export function applyHostedUserToStore(user: UserResponse) {
  useStore.getState().setHostedBillingState({
    subscriberTier: user.subscriber_tier || "free",
    billingInterval: user.billing_interval,
    currentPriceLookupKey: user.stripe_price_lookup_key,
    subscriptionStatus: user.subscription_status,
    currentPeriodEnd: user.current_period_end,
    cancelAtPeriodEnd: user.cancel_at_period_end,
  });
}
