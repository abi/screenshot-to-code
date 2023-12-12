import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { addEvent } from "../lib/analytics";

const LOGOS = ["microsoft", "amazon", "mit", "stanford", "bytedance", "baidu"];

const TermsOfServiceDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="mb-2 text-xl">
            One last step
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col space-y-3 text-sm">
          <p>
            You consent to receiving occasional product updates via email, and
            you accept the{" "}
            <a
              href="https://a.picoapps.xyz/camera-write"
              target="_blank"
              className="underline"
            >
              terms of service
            </a>
            .{" "}
          </p>

          <p>
            {" "}
            Prefer to run it yourself locally? This project is open source.{" "}
            <a
              href="https://github.com/abi/screenshot-to-code"
              target="_blank"
              className="underline"
            >
              Download the code and get started on Github.
            </a>
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => {
              addEvent("EmailSubmit");
            }}
          >
            Agree & Continue
          </AlertDialogAction>
        </AlertDialogFooter>

        {/* Logos */}
        <div>
          <div
            className="mx-auto grid max-w-lg items-center gap-x-2 
          gap-y-10 sm:max-w-xl grid-cols-6 lg:mx-0 lg:max-w-none mt-10"
          >
            {LOGOS.map((companyName) => (
              <img
                key={companyName}
                className="col-span-1 max-h-12 w-full object-contain grayscale opacity-50 hover:opacity-100"
                src={`https://picoapps.xyz/logos/${companyName}.png`}
                alt={companyName}
                width={120}
                height={48}
              />
            ))}
          </div>
          <div className="text-gray-500 text-xs mt-4 text-center">
            Designers and engineers from these organizations use Screenshot to
            Code to build interfaces faster.
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TermsOfServiceDialog;
