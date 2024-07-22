import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { useStore } from "../../../store/store";
import PricingPlans from "./PricingPlans";

const LOGOS = ["microsoft", "amazon", "mit", "stanford", "bytedance", "baidu"];

const PricingDialog: React.FC = () => {
  const subscriberTier = useStore((state) => state.subscriberTier);
  const [showDialog, setShowDialog] = useStore((state) => [
    state.isPricingDialogOpen,
    state.setPricingDialogOpen,
  ]);

  return (
    <Dialog open={showDialog} onOpenChange={(isOpen) => setShowDialog(isOpen)}>
      {subscriberTier === "free" && (
        <DialogTrigger
          className="fixed z-50 bottom-28 right-5 rounded-md shadow-lg bg-black
          text-white  px-4 text-xs py-3 cursor-pointer"
        >
          get 100 code generations for $15
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center">
            Ship Code Faster
          </DialogTitle>
        </DialogHeader>

        <PricingPlans />

        <DialogFooter></DialogFooter>

        {/* Logos */}
        <div className="max-w-lg mx-auto">
          <div
            className="mx-auto grid max-w-lg items-center gap-x-2 
          gap-y-10 sm:max-w-xl grid-cols-6 lg:mx-0 lg:max-w-none mt-4"
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
          <div className="text-gray-600 leading-tight text-sm mt-4 text-center">
            Designers and engineers from these organizations use Screenshot to
            Code to build interfaces faster.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PricingDialog;
