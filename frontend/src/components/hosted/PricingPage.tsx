import React from "react";
import Footer from "./LandingPage/Footer";
import PricingPlans from "./payments/PricingPlans";
import FAQs from "./FAQs";

const PricingPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Screenshot to Code Pricing</h1>
      <PricingPlans shouldShowFAQLink={false} />
      {/* Spacer */}
      <div className="text-center mt-8"></div>
      <FAQs />
      <Footer />
    </div>
  );
};

export default PricingPage;
