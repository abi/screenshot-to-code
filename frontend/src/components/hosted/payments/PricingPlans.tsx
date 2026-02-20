import { FaCheckCircle } from "react-icons/fa";
import Spinner from "../../core/Spinner";
import * as React from "react";
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
    <div className="flex flex-col items-center gap-6">
      {/* Interval toggle */}
      <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
        <button
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            paymentInterval === "monthly"
              ? "bg-white text-gray-900 shadow-sm dark:bg-zinc-700 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          }`}
          onClick={() => setPaymentInterval("monthly")}
        >
          Monthly
        </button>
        <button
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            paymentInterval === "yearly"
              ? "bg-white text-gray-900 shadow-sm dark:bg-zinc-700 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          }`}
          onClick={() => setPaymentInterval("yearly")}
        >
          Yearly
          <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
            -50%
          </span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid w-full max-w-xl grid-cols-2 gap-4">
        {/* Hobby Plan */}
        <div className="relative flex flex-col rounded-xl border-2 border-blue-500 bg-white p-5 shadow-md shadow-blue-500/5 dark:border-blue-400 dark:bg-gray-800">
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
            <span className="whitespace-nowrap rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-semibold text-white dark:bg-blue-500">
              Most Popular
            </span>
          </div>

          <h2 className="text-lg font-semibold dark:text-white">Hobby</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Great for getting started
          </p>

          <div className="mt-3 mb-4">
            <span className="text-3xl font-bold tracking-tight dark:text-white">
              {paymentInterval === "monthly" ? "$15" : "$90"}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {paymentInterval === "monthly" ? " /mo" : " /yr"}
            </span>
            {paymentInterval === "yearly" && (
              <div className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                Save $90/yr
              </div>
            )}
          </div>

          <button
            className="mb-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 flex justify-center items-center gap-x-2"
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

          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-xs dark:text-white">
              <FaCheckCircle className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
              150 credits / mo
            </li>
            <li className="flex items-center gap-2 text-xs dark:text-white">
              <FaCheckCircle className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
              All AI models
            </li>
            <li className="flex items-center gap-2 text-xs dark:text-white">
              <FaCheckCircle className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
              Full code access
            </li>
            <li className="flex items-center gap-2 text-xs dark:text-white">
              <FaCheckCircle className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
              Chat support
            </li>
          </ul>
        </div>

        {/* Pro Plan */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold dark:text-white">Pro</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            For power users
          </p>

          <div className="mt-3 mb-4">
            <span className="text-3xl font-bold tracking-tight dark:text-white">
              {paymentInterval === "monthly" ? "$40" : "$240"}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {paymentInterval === "monthly" ? " /mo" : " /yr"}
            </span>
            {paymentInterval === "yearly" && (
              <div className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                Save $240/yr
              </div>
            )}
          </div>

          <button
            className="mb-4 w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 flex justify-center items-center gap-x-2"
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

          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-xs dark:text-white">
              <FaCheckCircle className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
              400 credits / mo
            </li>
            <li className="flex items-center gap-2 text-xs dark:text-white">
              <FaCheckCircle className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
              All AI models
            </li>
            <li className="flex items-center gap-2 text-xs dark:text-white">
              <FaCheckCircle className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
              Full code access
            </li>
            <li className="flex items-center gap-2 text-xs dark:text-white">
              <FaCheckCircle className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
              Priority support
            </li>
          </ul>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
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
    </div>
  );
}

export default PricingPlans;
