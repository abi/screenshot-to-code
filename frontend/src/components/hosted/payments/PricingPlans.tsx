import { FaCheckCircle } from "react-icons/fa";
import Spinner from "../../core/Spinner";
import * as React from "react";
import { Button } from "../../ui/button";
import useStripeCheckout from "./useStripeCheckout";

interface PricingPlansProps {
  shouldShowFAQLink?: boolean;
}

function PricingPlans({ shouldShowFAQLink = true }: PricingPlansProps) {
  const { checkout, isLoadingCheckout } = useStripeCheckout();
  const [paymentInterval, setPaymentInterval] = React.useState<
    "monthly" | "yearly"
  >("monthly");

  return (
    <>
      <div className="flex justify-center gap-x-2 mt-2">
        <Button
          variant={paymentInterval === "monthly" ? "default" : "secondary"}
          onClick={() => setPaymentInterval("monthly")}
        >
          Monthly
        </Button>
        <Button
          variant={paymentInterval === "yearly" ? "default" : "secondary"}
          onClick={() => setPaymentInterval("yearly")}
        >
          Yearly (50% discount!)
        </Button>
      </div>
      <div className="flex justify-center items-center">
        <div className="grid grid-cols-2 gap-6 p-2">
          {/* Hobby Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6 transition-shadow hover:shadow-md">
            <h2 className="font-semibold dark:text-white">Hobby</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Great for getting started
            </p>
            <div className="my-4">
              <span className="text-4xl font-bold dark:text-white">
                {paymentInterval === "monthly" ? "$15" : "$90"}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {paymentInterval === "monthly" ? " / month" : " / year"}
              </span>
              {paymentInterval === "yearly" && (
                <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                  Save $90
                </span>
              )}
            </div>

            <button
              className="bg-black text-white dark:bg-white dark:text-black rounded-lg py-2.5 px-4 w-full text-sm font-medium
                flex justify-center items-center gap-x-2 transition-opacity hover:opacity-90"
              onClick={() =>
                checkout(
                  paymentInterval === "monthly"
                    ? "hobby_monthly"
                    : "hobby_yearly_90"
                )
              }
            >
              Get Started {isLoadingCheckout && <Spinner />}
            </button>

            <ul className="mt-5 space-y-2.5">
              <li className="flex items-center text-sm dark:text-white">
                <FaCheckCircle className="text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
                150 credits / mo
              </li>
              <li className="flex items-center text-sm dark:text-white">
                <FaCheckCircle className="text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
                All supported AI models
              </li>
              <li className="flex items-center text-sm dark:text-white">
                <FaCheckCircle className="text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
                Full code access
              </li>
              <li className="flex items-center text-sm dark:text-white">
                <FaCheckCircle className="text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
                Chat support
              </li>
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="relative bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-500 dark:border-blue-400 p-6 shadow-md shadow-blue-500/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white dark:bg-blue-500">
                Most Popular
              </span>
            </div>
            <h2 className="font-semibold dark:text-white">Pro</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              For power users
            </p>
            <div className="my-4">
              <span className="text-4xl font-bold dark:text-white">
                {paymentInterval === "monthly" ? "$40" : "$240"}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {paymentInterval === "monthly" ? " / month" : " / year"}
              </span>
              {paymentInterval === "yearly" && (
                <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                  Save $240
                </span>
              )}
            </div>

            <button
              className="bg-blue-600 text-white rounded-lg py-2.5 px-4 w-full text-sm font-medium
                flex justify-center items-center gap-x-2 transition-opacity hover:opacity-90"
              onClick={() =>
                checkout(
                  paymentInterval === "monthly"
                    ? "pro_monthly"
                    : "pro_yearly_240"
                )
              }
            >
              Get Started {isLoadingCheckout && <Spinner />}
            </button>

            <ul className="mt-5 space-y-2.5">
              <li className="flex items-center text-sm dark:text-white">
                <FaCheckCircle className="text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
                400 credits / mo
              </li>
              <li className="flex items-center text-sm dark:text-white">
                <FaCheckCircle className="text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
                All supported AI models
              </li>
              <li className="flex items-center text-sm dark:text-white">
                <FaCheckCircle className="text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
                Full code access
              </li>
              <li className="flex items-center text-sm dark:text-white">
                <FaCheckCircle className="text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
                Priority support
              </li>
            </ul>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
        1 credit per generation or edit &middot; Cancel anytime
        {shouldShowFAQLink && (
          <>
            {" "}
            &middot;{" "}
            <a
              href="/pricing"
              target="_blank"
              className="text-blue-600 dark:text-blue-400 underline"
            >
              FAQs
            </a>
          </>
        )}
      </p>
    </>
  );
}

export default PricingPlans;
