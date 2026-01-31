import { FaCheck, FaBolt, FaRocket } from "react-icons/fa";
import Spinner from "../../core/Spinner";
import * as React from "react";
import useStripeCheckout from "./useStripeCheckout";

interface PricingPlansProps {
  shouldShowFAQLink?: boolean;
}

const HOBBY_FEATURES = [
  { text: "150 generations per month", highlight: true },
  { text: "GPT-4o, Claude 3.5 & more", highlight: false },
  { text: "React, Vue, HTML + Tailwind", highlight: false },
  { text: "Download & export code", highlight: false },
  { text: "Email support", highlight: false },
];

const PRO_FEATURES = [
  { text: "400 generations per month", highlight: true },
  { text: "All AI models included", highlight: false },
  { text: "All frameworks & stacks", highlight: false },
  { text: "Download & export code", highlight: false },
  { text: "Priority chat support", highlight: false },
  { text: "Early access to new features", highlight: false },
];

function PricingPlans({ shouldShowFAQLink = true }: PricingPlansProps) {
  const { checkout, isLoadingCheckout } = useStripeCheckout();
  const [paymentInterval, setPaymentInterval] = React.useState<
    "monthly" | "yearly"
  >("yearly");

  const hobbyPrice = paymentInterval === "monthly" ? 15 : 90;
  const proPrice = paymentInterval === "monthly" ? 40 : 240;
  const hobbyMonthlyEquiv = paymentInterval === "yearly" ? 7.5 : 15;
  const proMonthlyEquiv = paymentInterval === "yearly" ? 20 : 40;

  return (
    <div className="space-y-6">
      {/* Billing toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1">
          <button
            onClick={() => setPaymentInterval("monthly")}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
              paymentInterval === "monthly"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPaymentInterval("yearly")}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all flex items-center gap-2 ${
              paymentInterval === "yearly"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Yearly
            <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400 text-xs font-semibold px-2 py-0.5 rounded-full">
              Save 50%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto px-4">
        {/* Hobby Plan */}
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <FaBolt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Hobby
            </h3>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Perfect for personal projects
          </p>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">
                ${hobbyPrice}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                /{paymentInterval === "monthly" ? "mo" : "year"}
              </span>
            </div>
            {paymentInterval === "yearly" && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ${hobbyMonthlyEquiv}/mo billed annually
              </p>
            )}
          </div>

          <button
            onClick={() =>
              checkout(
                paymentInterval === "monthly"
                  ? "hobby_monthly"
                  : "hobby_yearly_90"
              )
            }
            disabled={isLoadingCheckout}
            className="w-full py-3 px-4 rounded-xl font-medium text-sm
              bg-gray-900 dark:bg-white text-white dark:text-gray-900
              hover:bg-gray-800 dark:hover:bg-gray-100
              transition-colors flex items-center justify-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingCheckout ? (
              <Spinner />
            ) : (
              <>Get Started</>
            )}
          </button>

          <ul className="mt-6 space-y-3 flex-1">
            {HOBBY_FEATURES.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <FaCheck className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span
                  className={`text-sm ${
                    feature.highlight
                      ? "text-gray-900 dark:text-white font-medium"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {feature.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pro Plan */}
        <div className="relative bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 rounded-2xl border-2 border-blue-500 dark:border-blue-400 p-6 flex flex-col">
          {/* Most Popular Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold px-4 py-1 rounded-full shadow-lg">
              MOST POPULAR
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2 mt-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <FaRocket className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Pro
            </h3>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            For power users & teams
          </p>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">
                ${proPrice}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                /{paymentInterval === "monthly" ? "mo" : "year"}
              </span>
            </div>
            {paymentInterval === "yearly" && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ${proMonthlyEquiv}/mo billed annually
              </p>
            )}
          </div>

          <button
            onClick={() =>
              checkout(
                paymentInterval === "monthly"
                  ? "pro_monthly"
                  : "pro_yearly_240"
              )
            }
            disabled={isLoadingCheckout}
            className="w-full py-3 px-4 rounded-xl font-medium text-sm
              bg-gradient-to-r from-blue-600 to-indigo-600 text-white
              hover:from-blue-700 hover:to-indigo-700
              shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40
              transition-all flex items-center justify-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingCheckout ? (
              <Spinner />
            ) : (
              <>Get Pro Access</>
            )}
          </button>

          <ul className="mt-6 space-y-3 flex-1">
            {PRO_FEATURES.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <FaCheck className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span
                  className={`text-sm ${
                    feature.highlight
                      ? "text-gray-900 dark:text-white font-medium"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {feature.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer info */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        1 credit = 1 code generation or edit.{" "}
        {shouldShowFAQLink && (
          <>
            <a
              href="/pricing"
              target="_blank"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              View FAQs
            </a>
          </>
        )}
      </p>
    </div>
  );
}

export default PricingPlans;
