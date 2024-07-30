import React from "react";

interface DeprecationMessageProps {}

const DeprecationMessage: React.FC<DeprecationMessageProps> = () => {
  return (
    <div className="rounded-lg p-2 bg-fuchsia-200">
      <p className="text-gray-800 text-sm">
        We no longer support this model. Instead, code generation will use
        GPT-4o or Claude Sonnet 3.5, the 2 state-of-the-art models.
      </p>
    </div>
  );
};

export default DeprecationMessage;
