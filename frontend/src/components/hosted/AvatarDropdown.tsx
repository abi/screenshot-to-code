import { useClerk, useUser } from "@clerk/clerk-react";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/dropdown-menu";
import { useStore } from "../../store/store";
import { capitalize } from "./utils";
import StripeCustomerPortalLink from "./StripeCustomerPortalLink";
import { Progress } from "../ui/progress";
import { useAuthenticatedFetch } from "./useAuthenticatedFetch";
import { SAAS_BACKEND_URL } from "../../config";
import { CreditsUsage } from "./types";
import { useState } from "react";
import toast from "react-hot-toast";
import { showNewMessage } from "@intercom/messenger-js-sdk";

export default function AvatarDropdown() {
  const [isOpen, setIsOpen] = useState(false);
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

  async function open(isOpen: boolean) {
    setIsOpen(isOpen);

    // Do not fetch usage if the user is a free user
    // or that information hasn't loaded yet
    // or the dropdown is closed
    if (isFreeUser || !subscriberTier || !isOpen) return;

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
  }

  // If Clerk is still loading or user is logged out, don't show anything
  if (!isLoaded || !isSignedIn) return null;

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={open}>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center space-x-2 cursor-pointer">
            <span className="text-sm">Your account</span>
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.imageUrl} alt="Profile image" />
              <AvatarFallback>{user?.firstName}</AvatarFallback>
            </Avatar>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          {/* Free users */}
          {isFreeUser && (
            <DropdownMenuItem asChild={true}>
              <a onClick={openPricingDialog}>Get pro</a>
            </DropdownMenuItem>
          )}
          {/* Paying user */}
          {!isFreeUser && (
            <>
              <DropdownMenuLabel onClick={openPricingDialog}>
                {capitalize(subscriberTier) + " Subscriber"}
              </DropdownMenuLabel>

              {/* Loading credit usage */}
              {isLoadingUsage && (
                <DropdownMenuItem className="text-xs text-gray-700">
                  Loading credit usage...
                </DropdownMenuItem>
              )}

              {/* Credits usage */}
              {!isLoadingUsage && (
                <>
                  <DropdownMenuItem onClick={openPricingDialog}>
                    <Progress value={(usedCredits / totalCredits) * 100} />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs text-gray-700"
                    onClick={openPricingDialog}
                  >
                    {usedCredits} out of {totalCredits} credits used for{" "}
                    {new Date().toLocaleString("default", { month: "long" })}.
                    {subscriberTier !== "pro" && (
                      <> Upgrade to Pro to get more credits.</>
                    )}
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem asChild={true}>
                <a onClick={() => showNewMessage("")}>Contact support</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild={true}>
                <a
                  href="https://screenshot-to-code.canny.io/feature-requests"
                  target="_blank"
                >
                  Feature requests
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild={true}>
                <StripeCustomerPortalLink label="Manage billing" />
              </DropdownMenuItem>
              <DropdownMenuItem asChild={true}>
                <StripeCustomerPortalLink label="Cancel subscription" />
              </DropdownMenuItem>
            </>
          )}
          {/* All users */}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
