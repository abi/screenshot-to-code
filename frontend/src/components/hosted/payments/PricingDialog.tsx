import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "../../ui/dialog";
import { useStore } from "../../../store/store";
import PricingPlans from "./PricingPlans";
import { FaArrowRight, FaShieldAlt, FaStar } from "react-icons/fa";

const LOGOS = ["microsoft", "amazon", "mit", "stanford", "bytedance", "baidu"];

const TESTIMONIAL = {
  quote:
    "Screenshot to Code saves me hours every week. I can turn any design into production-ready code in minutes instead of days.",
  author: "Sarah Chen",
  role: "Senior Frontend Engineer",
  company: "Fortune 500 Tech Company",
};

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
          className="fixed z-50 bottom-28 right-5 rounded-lg shadow-xl
          bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700
          text-white px-5 py-3 text-sm font-medium cursor-pointer
          transition-all duration-200 hover:scale-105 hover:shadow-2xl
          flex items-center gap-2 group"
        >
          <span>Unlock Unlimited Generations</span>
          <FaArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4 pb-2">
          {/* Hero section */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium">
              <FaStar className="w-3 h-3" />
              <span>Join 50,000+ developers shipping faster</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Turn Any Screenshot Into Code
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Stop wasting hours on repetitive frontend work. Generate
              pixel-perfect, production-ready code in seconds.
            </p>
          </div>
        </DialogHeader>

        <PricingPlans />

        {/* Trust signals */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <FaShieldAlt className="text-green-600" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <FaShieldAlt className="text-green-600" />
            <span>Secure checkout</span>
          </div>
          <div className="flex items-center gap-2">
            <FaShieldAlt className="text-green-600" />
            <span>Instant access</span>
          </div>
        </div>

        {/* Testimonial */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 mt-4">
          <div className="flex flex-col items-center text-center">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <FaStar key={i} className="w-4 h-4 text-yellow-400" />
              ))}
            </div>
            <blockquote className="text-gray-700 dark:text-gray-300 italic mb-4 max-w-xl">
              "{TESTIMONIAL.quote}"
            </blockquote>
            <div className="text-sm">
              <p className="font-semibold text-gray-900 dark:text-white">
                {TESTIMONIAL.author}
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                {TESTIMONIAL.role}, {TESTIMONIAL.company}
              </p>
            </div>
          </div>
        </div>

        {/* Logos */}
        <div className="mt-6">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
            Trusted by teams at
          </p>
          <div className="mx-auto grid max-w-lg items-center gap-x-4 gap-y-4 grid-cols-6">
            {LOGOS.map((companyName) => (
              <img
                key={companyName}
                className="col-span-1 max-h-10 w-full object-contain grayscale opacity-40 hover:opacity-70 transition-opacity"
                src={`https://picoapps.xyz/logos/${companyName}.png`}
                alt={companyName}
                width={120}
                height={48}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PricingDialog;
