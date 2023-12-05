import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Input } from "./ui/input";
import toast from "react-hot-toast";
import { PICO_BACKEND_FORM_SECRET } from "../config";

const LOGOS = ["microsoft", "amazon", "mit", "stanford", "bytedance", "baidu"];

const TermsOfServiceDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  const [email, setEmail] = React.useState("");

  const onSubscribe = async () => {
    await fetch("https://backend.buildpicoapps.com/form", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, secret: PICO_BACKEND_FORM_SECRET }),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="mb-2 text-xl">
            Enter your email to get started
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="mb-2">
          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
        </div>
        <div className="flex flex-col space-y-3 text-sm">
          <p>
            By providing your email, you consent to receiving occasional product
            updates, and you accept the{" "}
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
            onClick={(e) => {
              if (!email.trim() || !email.trim().includes("@")) {
                e.preventDefault();
                toast.error("Please enter your email");
              } else {
                onSubscribe();
              }
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
