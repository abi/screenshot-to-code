import { useClerk, useUser } from "@clerk/clerk-react";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { useStore } from "../../store/store";
import { capitalize } from "./utils";
import StripeCustomerPortalLink from "./StripeCustomerPortalLink";
import { Progress } from "../ui/progress";
import { useAuthenticatedFetch } from "./useAuthenticatedFetch";
import { SAAS_BACKEND_URL } from "../../config";
import { CreditsUsage } from "./types";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { showNewMessage } from "@intercom/messenger-js-sdk";
import {
  LuExternalLink,
  LuLifeBuoy,
  LuLightbulb,
  LuLogOut,
} from "react-icons/lu";
import Spinner from "../core/Spinner";

export default function AccountView() {
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [usedCredits, setUsedCredits] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);

  const subscriberTier = useStore((state) => state.subscriberTier);
  const setPricingDialogOpen = useStore((state) => state.setPricingDialogOpen);
  const isFreeUser = subscriberTier === "free" || !subscriberTier;

  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const authenticatedFetch = useAuthenticatedFetch();

  const openPricingDialog = () => setPricingDialogOpen(true);

  useEffect(() => {
    if (isFreeUser || !subscriberTier) return;

    const fetchUsage = async () => {
      setIsLoadingUsage(true);
      try {
        const res: CreditsUsage = await authenticatedFetch(
          SAAS_BACKEND_URL + "/credits/usage",
          "POST"
        );
        setUsedCredits(res.used_monthly_credits);
        setTotalCredits(res.total_monthly_credits);
      } catch (e) {
        toast.error(
          "Failed to fetch credit usage. Please contact support to get this issue fixed."
        );
      } finally {
        setIsLoadingUsage(false);
      }
    };

    fetchUsage();
  }, [subscriberTier]);

  if (!isLoaded || !isSignedIn) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-4 lg:px-6 lg:py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Account
          </h1>
        </div>

        <div className="mx-auto max-w-lg space-y-6">
          {/* Profile section */}
          <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user?.imageUrl} alt="Profile image" />
              <AvatarFallback>{user?.firstName}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.fullName}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>

          {/* Subscription section */}
          <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                Subscription
              </h2>
            </div>
            <div className="p-4">
              {isFreeUser ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-zinc-300">
                    You are on the{" "}
                    <span className="font-medium text-gray-900 dark:text-white">
                      Free
                    </span>{" "}
                    plan.
                  </p>
                  <button
                    onClick={openPricingDialog}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
                  >
                    Get Pro
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-zinc-300">
                      Current plan
                    </span>
                    <button
                      onClick={openPricingDialog}
                      className="text-sm font-medium text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                    >
                      {capitalize(subscriberTier)} Subscriber
                    </button>
                  </div>

                  {/* Credit usage */}
                  {isLoadingUsage ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
                      <Spinner />
                      Loading credit usage...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
                        <span>Monthly credits</span>
                        <span>
                          {usedCredits} / {totalCredits}
                        </span>
                      </div>
                      <Progress value={(usedCredits / totalCredits) * 100} />
                      <p className="text-xs text-gray-500 dark:text-zinc-400">
                        {usedCredits} out of {totalCredits} credits used for{" "}
                        {new Date().toLocaleString("default", {
                          month: "long",
                        })}
                        .
                        {subscriberTier !== "pro" && (
                          <>
                            {" "}
                            <button
                              onClick={openPricingDialog}
                              className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                            >
                              Upgrade to Pro
                            </button>{" "}
                            to get more credits.
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions section (for paid users) */}
          {!isFreeUser && (
            <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60">
              <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
                <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                  Billing
                </h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-zinc-700">
                <StripeCustomerPortalLink
                  label="Manage billing"
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50 cursor-pointer"
                />
                <StripeCustomerPortalLink
                  label="Cancel subscription"
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Support section */}
          <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                Support
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-zinc-700">
              {!isFreeUser && (
                <button
                  onClick={() => showNewMessage("")}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
                >
                  <LuLifeBuoy className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                  Contact support
                </button>
              )}
              <a
                href="https://screenshot-to-code.canny.io/feature-requests"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
              >
                <LuLightbulb className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                Feature requests
                <LuExternalLink className="ml-auto h-3.5 w-3.5 text-gray-400 dark:text-zinc-500" />
              </a>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={() => signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
          >
            <LuLogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
