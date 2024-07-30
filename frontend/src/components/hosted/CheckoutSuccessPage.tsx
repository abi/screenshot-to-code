import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const CheckoutSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
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
