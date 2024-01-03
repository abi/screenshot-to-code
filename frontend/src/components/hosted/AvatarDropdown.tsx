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

export default function AvatarDropdown() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const subscriberTier = useStore((state) => state.subscriberTier);
  const setPricingDialogOpen = useStore((state) => state.setPricingDialogOpen);
  const isFreeUser = subscriberTier === "free";

  // If Clerk is still loading or user is logged out, don't show anything
  if (!isLoaded || !isSignedIn) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="w-8 h-8 cursor-pointer">
            <AvatarImage src={user?.imageUrl} alt="Profile image" />
            <AvatarFallback>{user?.firstName}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          {/* Free users */}
          {isFreeUser && (
            <DropdownMenuItem asChild={true}>
              <a onClick={() => setPricingDialogOpen(true)}>Get pro</a>
            </DropdownMenuItem>
          )}
          {/* Paying user */}
          {!isFreeUser && (
            <>
              <DropdownMenuLabel>
                {capitalize(subscriberTier) + " Subscriber"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild={true}>
                <a href="mailto:support@picoapps.xyz" target="_blank">
                  Email support
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild={true}>
                <a href="mailto:support@picoapps.xyz" target="_blank">
                  Upgrade plan
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild={true}>
                <a
                  href="https://billing.stripe.com/p/login/dR65nxfkLgvldyg9AA"
                  target="_blank"
                >
                  Cancel subscription
                </a>
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
