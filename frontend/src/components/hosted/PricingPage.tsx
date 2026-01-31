import React from "react";
import Footer from "./LandingPage/Footer";
import PricingPlans from "./payments/PricingPlans";
import FAQs from "./FAQs";
import { FaStar, FaShieldAlt } from "react-icons/fa";

const LOGOS = ["microsoft", "amazon", "mit", "stanford", "bytedance", "baidu"];

const PricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <FaStar className="w-3 h-3" />
            <span>Simple, transparent pricing</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Start building beautiful interfaces from screenshots. No hidden fees,
            cancel anytime.
          </p>
        </div>

        {/* Pricing Plans */}
        <PricingPlans shouldShowFAQLink={false} />

        {/* Trust signals */}
        <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <FaShieldAlt className="text-green-600" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <FaShieldAlt className="text-green-600" />
            <span>Secure checkout via Stripe</span>
          </div>
          <div className="flex items-center gap-2">
            <FaShieldAlt className="text-green-600" />
            <span>Instant access</span>
          </div>
        </div>

        {/* Logos */}
        <div className="mt-16">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
            Trusted by developers and designers at
          </p>
          <div className="mx-auto grid max-w-2xl items-center gap-x-8 gap-y-4 grid-cols-6">
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

        {/* FAQs */}
        <div className="mt-20">
          <FAQs />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PricingPage;
