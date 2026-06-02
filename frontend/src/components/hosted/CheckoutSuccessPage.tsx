import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  addEvent,
  addGoogleAdsConversion,
  addTikTokEvent,
} from "../../lib/analytics";
import { getAttributionEventProps } from "../../lib/attribution";
import { GOOGLE_ADS_PURCHASE_CONVERSION_SEND_TO } from "../../config";

const CheckoutSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const attributionProps = getAttributionEventProps();
    addEvent("Paid Conversion", attributionProps);
    addTikTokEvent("Purchase", attributionProps);
    addGoogleAdsConversion(
      GOOGLE_ADS_PURCHASE_CONVERSION_SEND_TO,
      {
        ...attributionProps,
        value: 1.0,
        currency: "USD",
        transaction_id: "",
      },
    );

    // Redirect to home page after a short delay
    const redirectTimer = setTimeout(() => {
      navigate("/");
    }, 200);

    // Clean up the timer if the component unmounts
    return () => clearTimeout(redirectTimer);
  }, [navigate]);

  return <div></div>;
};

export default CheckoutSuccessPage;
