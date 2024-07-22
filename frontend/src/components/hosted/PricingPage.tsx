import React from "react";
import Footer from "./LandingPage/Footer";

const PricingPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Pricing</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Plan */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Basic</h2>
          <p className="text-3xl font-bold mb-4">$9.99/mo</p>
          <ul className="list-disc list-inside mb-6">
            <li>Feature 1</li>
            <li>Feature 2</li>
            <li>Feature 3</li>
          </ul>
          <button className="bg-blue-500 text-white px-4 py-2 rounded">
            Choose Plan
          </button>
        </div>
        {/* Pro Plan */}
        <div className="border rounded-lg p-6 bg-gray-100">
          <h2 className="text-2xl font-semibold mb-4">Pro</h2>
          <p className="text-3xl font-bold mb-4">$19.99/mo</p>
          <ul className="list-disc list-inside mb-6">
            <li>All Basic features</li>
            <li>Feature 4</li>
            <li>Feature 5</li>
          </ul>
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Choose Plan
          </button>
        </div>
        {/* Enterprise Plan */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Enterprise</h2>
          <p className="text-3xl font-bold mb-4">Custom</p>
          <ul className="list-disc list-inside mb-6">
            <li>All Pro features</li>
            <li>Custom integrations</li>
            <li>Dedicated support</li>
          </ul>
          <button className="bg-blue-500 text-white px-4 py-2 rounded">
            Contact Sales
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PricingPage;
