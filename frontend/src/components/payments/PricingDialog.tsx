import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { FaCheckCircle } from "react-icons/fa";
import Spinner from "../custom-ui/Spinner";
import useStripeCheckout from "./useStripeCheckout";
import { Button } from "../ui/button";

const LOGOS = ["microsoft", "amazon", "mit", "stanford", "bytedance", "baidu"];

const SELL_SUBSCRIPTIONS = false;

const PricingDialog: React.FC = () => {
  const { checkout, isLoadingCheckout } = useStripeCheckout();
  const [paymentInterval, setPaymentInterval] = React.useState<
    "monthly" | "yearly"
  >("monthly");

  return (
    <Dialog>
      <DialogTrigger
        className="fixed z-50 bottom-28 right-5 rounded-md shadow-lg bg-black
          text-white  px-4 text-xs py-3 cursor-pointer"
      >
        buy 100 code generations for $15
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="mb-2 text-2xl text-center">
            Save Hours of Development Time
          </DialogTitle>
        </DialogHeader>

        {SELL_SUBSCRIPTIONS && (
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
        )}

        <div className="flex justify-center items-center">
          <div className="grid grid-cols-2 gap-8 p-2">
            {!SELL_SUBSCRIPTIONS && (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="font-semibold">Hobby</h2>
                  <p className="text-gray-500">Great to start</p>
                  <div className="my-4">
                    <span className="text-4xl font-bold">$15</span>
                  </div>
                  <a
                    href="https://buy.stripe.com/8wM6sre70gBW1nqaEE"
                    target="_blank"
                  >
                    <button className="bg-black text-white rounded py-2 px-4 w-full text-sm">
                      Purchase Credits
                    </button>
                  </a>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center">
                      <FaCheckCircle className="text-black mr-2" />
                      100 credits
                    </li>
                    <li className="flex items-center">
                      <FaCheckCircle className="text-black mr-2" />
                      Email support
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="font-semibold">Pro</h2>
                  <p className="text-gray-500">Higher limits</p>
                  <div className="my-4">
                    <span className="text-4xl font-bold">$40</span>
                    {/* <span className="text-gray-500"> / month</span> */}
                  </div>

                  <a
                    href="https://buy.stripe.com/dR69ED3sm85qgikcMN"
                    target="_blank"
                  >
                    <button className="bg-black text-white rounded py-2 px-4 w-full text-sm">
                      Purchase Credits
                    </button>
                  </a>

                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center">
                      <FaCheckCircle className="text-black mr-2" />
                      300 credits
                    </li>
                    <li className="flex items-center">
                      <FaCheckCircle className="text-black mr-2" />
                      Slack support
                    </li>
                  </ul>
                </div>
              </>
            )}

            {SELL_SUBSCRIPTIONS && (
              <>
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
                      Email support
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
                        paymentInterval === "monthly"
                          ? "pro_monthly"
                          : "pro_yearly"
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
                      Slack support
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-gray-600 mt-1">
          1 credit = 1 code generation.{" "}
          {!SELL_SUBSCRIPTIONS && <>Unused credits expire after 90 days.</>}
          {SELL_SUBSCRIPTIONS && (
            <>
              <br />
              Cancel subscription at any time.
            </>
          )}
        </p>

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
