import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheckCircle, FaRocket } from "react-icons/fa";

const CheckoutSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Redirect to home page after countdown
    const redirectTimer = setTimeout(() => {
      navigate("/");
    }, 5000);

    return () => {
      clearTimeout(redirectTimer);
      clearInterval(countdownInterval);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Success animation */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-pulse">
            <FaCheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-4 border-green-500/20 animate-ping" />
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Welcome to Pro!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          Your subscription is now active. You have full access to all features
          and credits.
        </p>

        {/* Quick tips */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <FaRocket className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Get started
            </h2>
          </div>
          <ul className="text-left text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">1.</span>
              <span>Upload a screenshot or paste a design URL</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">2.</span>
              <span>Choose your preferred tech stack</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">3.</span>
              <span>Get production-ready code in seconds</span>
            </li>
          </ul>
        </div>

        {/* Redirect notice */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Redirecting to app in {countdown}s...
        </p>

        <button
          onClick={() => navigate("/")}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Start Building Now
        </button>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
