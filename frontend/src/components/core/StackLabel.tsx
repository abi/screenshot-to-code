import React from "react";
import { Stack, STACK_DESCRIPTIONS } from "../../lib/stacks";

interface StackLabelProps {
  stack: Stack;
}

const StackLabel: React.FC<StackLabelProps> = ({ stack }) => {
  const stackComponents = STACK_DESCRIPTIONS[stack].components;

  return (
    <div>
      {stackComponents.map((component, index) => (
        <React.Fragment key={index}>
          <span className="font-semibold">{component}</span>
          {index < stackComponents.length - 1 && " + "}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StackLabel;
