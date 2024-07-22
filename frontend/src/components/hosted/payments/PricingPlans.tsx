import { FaCheckCircle } from "react-icons/fa";
import Spinner from "../../custom-ui/Spinner";
import React from "react";
import { Button } from "../../ui/button";
import useStripeCheckout from "./useStripeCheckout";

function PricingPlans() {
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
          Yearly (2 months free)
        </Button>
      </div>
      <div className="flex justify-center items-center">
        <div className="grid grid-cols-2 gap-8 p-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold">Hobby</h2>
            <p className="text-gray-500">Great to start</p>
            <div className="my-4">
              <span className="text-4xl font-bold">
                {paymentInterval === "monthly" ? "$15" : "$150"}
              </span>
              <span className="text-gray-500">
                {paymentInterval === "monthly" ? "/ month" : "/ year"}
              </span>
            </div>

            <button
              className="bg-black text-white rounded py-2 px-4 w-full text-sm
                flex justify-center items-center gap-x-2"
              onClick={() =>
                checkout(
                  paymentInterval === "monthly"
                    ? "hobby_monthly"
                    : "hobby_yearly"
                )
              }
            >
              Subscribe {isLoadingCheckout && <Spinner />}
            </button>

            <ul className="mt-4 space-y-2">
              <li className="flex items-center">
                <FaCheckCircle className="text-black mr-2" />
                100 credits / mo
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-black mr-2" />
                OpenAI models
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-black mr-2" />
                Claude models
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-black mr-2" />
                Chat support
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold">Pro</h2>
            <p className="text-gray-500">Higher limits</p>
            <div className="my-4">
              <span className="text-4xl font-bold">
                {paymentInterval === "monthly" ? "$40" : "$400"}
              </span>
              <span className="text-gray-500">
                {paymentInterval === "monthly" ? "/ month" : "/ year"}
              </span>
            </div>

            <button
              className="bg-black text-white rounded py-2 px-4 w-full text-sm 
                  flex justify-center items-center gap-x-2"
              onClick={() =>
                checkout(
                  paymentInterval === "monthly" ? "pro_monthly" : "pro_yearly"
                )
              }
            >
              Subscribe {isLoadingCheckout && <Spinner />}
            </button>

            <ul className="mt-4 space-y-2">
              <li className="flex items-center">
                <FaCheckCircle className="text-black mr-2" />
                300 credits / mo
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-black mr-2" />
                OpenAI models
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-black mr-2" />
                Claude models
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-black mr-2" />
                Chat support
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export default PricingPlans;
