import { SignUp, UserButton, useUser } from "@clerk/clerk-react";
import App from "../../App";
import { useEffect, useState } from "react";
import { AlertDialog } from "@radix-ui/react-alert-dialog";
import { AlertDialogContent } from "../ui/alert-dialog";
import FullPageSpinner from "../custom-ui/FullPageSpinner";

function AppContainer() {
  const [showPopup, setShowPopup] = useState(false);
  const { isSignedIn, isLoaded } = useUser();

  // If Clerk is loaded and the user is not signed in, show the sign up popup
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setShowPopup(true);
    }
  }, [isSignedIn, isLoaded]);

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
