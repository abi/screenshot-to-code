import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addEvent, addTikTokEvent } from "../../lib/analytics";
import { getAttributionEventProps } from "../../lib/attribution";

const CheckoutSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const attributionProps = getAttributionEventProps();
    addEvent("Paid Conversion", attributionProps);
    addTikTokEvent("Purchase", attributionProps);

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
