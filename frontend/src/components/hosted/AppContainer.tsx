import { SignUp, UserButton, useUser } from "@clerk/clerk-react";
import App from "../../App";
import { useEffect, useRef, useState } from "react";
import { AlertDialog } from "@radix-ui/react-alert-dialog";
import { AlertDialogContent } from "../ui/alert-dialog";
import FullPageSpinner from "../custom-ui/FullPageSpinner";
import { useAuthenticatedFetch } from "./useAuthenticatedFetch";

function AppContainer() {
  const [showPopup, setShowPopup] = useState(false);
  const { isSignedIn, isLoaded } = useUser();

  // For fetching user
  const authenticatedFetch = useAuthenticatedFetch();
  const isInitRequestInProgress = useRef(false);

  // If Clerk is loaded and the user is not signed in, show the sign up popup
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setShowPopup(true);
    }
  }, [isSignedIn, isLoaded]);

  // Get the current user
  useEffect(() => {
    const init = async () => {
      // Make sure there's only one request in progress
      // so that we don't create multiple users
      if (isInitRequestInProgress.current) return;
      isInitRequestInProgress.current = true;

      const user = await authenticatedFetch(
        // "https://screenshot-to-code-saas.onrender.com/users/create",
        "http://localhost:8001/users/create",
        "POST"
      );
      console.log(user);

      isInitRequestInProgress.current = false;
    };

    init();
  }, []);

  // If Clerk is still loading, show a spinner
  if (!isLoaded) return <FullPageSpinner />;

  return (
    <>
      <App
        navbarComponent={
          <div className="flex justify-end items-center gap-x-2 px-10 mt-0 mb-4">
            <UserButton afterSignOutUrl="/" />
          </div>
        }
      />
      <AlertDialog open={showPopup}>
        <AlertDialogContent className="flex justify-center">
          <SignUp
            appearance={{
              elements: {
                card: {
                  boxShadow: "none",
                  borderRadius: "0",
                  border: "none",
                  backgroundColor: "transparent",
                },
              },
            }}
          />
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AppContainer;
