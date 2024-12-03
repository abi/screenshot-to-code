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
        <div className="grid grid-cols-3 gap-8 p-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="font-semibold dark:text-white">Hobby</h2>
            <p className="text-gray-500 dark:text-gray-400">Great to start</p>
            <div className="my-4">
              <span className="text-4xl font-bold dark:text-white">
                {paymentInterval === "monthly" ? "$15" : "$90"}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {paymentInterval === "monthly" ? "/ month" : "/ year"}
              </span>
            </div>

            <button
              className="bg-black text-white dark:bg-white dark:text-black rounded py-2 px-4 w-full text-sm
                flex justify-center items-center gap-x-2"
              onClick={() =>
                checkout(
                  paymentInterval === "monthly"
                    ? "hobby_monthly"
                    : "hobby_yearly_90"
                )
              }
            >
              Subscribe {isLoadingCheckout && <Spinner />}
            </button>

            <ul className="mt-4 space-y-2">
              <li className="flex items-center dark:text-white">
                <FaCheckCircle className="text-black dark:text-white mr-2" />
                100 credits / mo
              </li>
              <li className="flex items-center dark:text-white">
                <FaCheckCircle className="text-black dark:text-white mr-2" />
                All supported AI models
              </li>
              <li className="flex items-center dark:text-white">
                <FaCheckCircle className="text-black dark:text-white mr-2" />
                Full code access
              </li>
              <li className="flex items-center dark:text-white">
                <FaCheckCircle className="text-black dark:text-white mr-2" />
                Chat support
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="font-semibold dark:text-white">Pro</h2>
            <p className="text-gray-500 dark:text-gray-400">Higher limits</p>
            <div className="my-4">
              <span className="text-4xl font-bold dark:text-white">
                {paymentInterval === "monthly" ? "$40" : "$240"}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {paymentInterval === "monthly" ? "/ month" : "/ year"}
              </span>
            </div>

            <button
              className="bg-black text-white dark:bg-white dark:text-black rounded py-2 px-4 w-full text-sm 
                  flex justify-center items-center gap-x-2"
              onClick={() =>
                checkout(
                  paymentInterval === "monthly"
                    ? "pro_monthly"
                    : "pro_yearly_240"
                )
              }
            >
              Subscribe {isLoadingCheckout && <Spinner />}
            </button>

            <ul className="mt-4 space-y-2">
              <li className="flex items-center dark:text-white">
                <FaCheckCircle className="text-black dark:text-white mr-2" />
                300 credits / mo
              </li>
              <li className="flex items-center dark:text-white">
                <FaCheckCircle className="text-black dark:text-white mr-2" />
                All supported AI models
              </li>
              <li className="flex items-center dark:text-white">
                <FaCheckCircle className="text-black dark:text-white mr-2" />
                Full code access
              </li>
              <li className="flex items-center dark:text-white">
                <FaCheckCircle className="text-black dark:text-white mr-2" />
                Chat support
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="font-semibold dark:text-white">Enterprise</h2>
            <p className="text-gray-500 dark:text-gray-400">
              For medium to large companies
            </p>
            <div className="my-4">
              <span className="text-gray-500 dark:text-gray-400">
                Starting at $8000 annually
              </span>
            </div>

            <a
              href="https://cal.com/abi-raja-wy2pfh/30min"
              target="_blank"
              className="bg-black text-white dark:bg-white dark:text-black rounded py-2 px-4 w-full text-sm 
                flex justify-center items-center gap-x-2 no-underline"
            >
              Contact Us
            </a>

            <ul className="mt-4 space-y-2">
              <li className="flex items-center dark:text-white">
                <FaCheckCircle className="text-black dark:text-white mr-2" />
                Unlimited credits
              </li>
              <li className="flex items-center dark:text-white">
                <FaCheckCircle className="text-black dark:text-white mr-2" />
                Unlimited users
              </li>
              <li className="flex items-center dark:text-white">
                <FaCheckCircle className="text-black dark:text-white mr-2" />
                Custom integrations
              </li>
            </ul>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-gray-600 dark:text-gray-400 mt-1">
        1 credit = 1 code generation. Cancel subscription at any time. <br />{" "}
        {shouldShowFAQLink && (
          <>
            <a
              href="/pricing"
              target="_blank"
              className="text-blue-900 dark:text-blue-400 underline"
            >
              For more information, visit our FAQs
            </a>{" "}
            or contact support.
          </>
        )}
      </p>
    </>
  );
}

export default PricingPlans;
