import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

const termAcceptedCacheKey = 'term_of_service_accepted';

function TermsOfServiceDialog() {
  const [isOpen, setIsOpen] = useState(() => !localStorage.getItem(termAcceptedCacheKey));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="mb-4">Terms of Service</DialogTitle>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <span>
            By using this website, you agree to the{" "}
            <a
              href="https://a.picoapps.xyz/camera-write"
              target="_blank"
              className="underline"
            >
              terms of service
            </a>
            . This project is MIT licensed.{" "}
            <a
              href="https://github.com/abi/screenshot-to-code"
              target="_blank"
              className="underline"
            >
              You can run this app locally by downloading the source code from
              Github.
            </a>
          </span>
        </div>

        <DialogFooter>
          <DialogClose onClick={() => {
            localStorage.setItem(termAcceptedCacheKey, 'true');
          }}>Agree</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TermsOfServiceDialog;
