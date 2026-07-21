import React from "react";
import { IconType } from "react-icons";
import {
  SiBootstrap,
  SiCss3,
  SiHtml5,
  SiIonic,
  SiReact,
  SiTailwindcss,
  SiVuedotjs,
} from "react-icons/si";
import { Stack, STACK_DESCRIPTIONS } from "../../lib/stacks";

const COMPONENT_LOGOS: { [name: string]: { icon: IconType; color: string } } = {
  HTML: { icon: SiHtml5, color: "#E34F26" },
  CSS: { icon: SiCss3, color: "#1572B6" },
  Tailwind: { icon: SiTailwindcss, color: "#06B6D4" },
  React: { icon: SiReact, color: "#61DAFB" },
  Bootstrap: { icon: SiBootstrap, color: "#7952B3" },
  Vue: { icon: SiVuedotjs, color: "#4FC08D" },
  Ionic: { icon: SiIonic, color: "#3880FF" },
};

interface StackLabelProps {
  stack: Stack;
}

const StackLabel: React.FC<StackLabelProps> = ({ stack }) => {
  const stackComponents = STACK_DESCRIPTIONS[stack].components;

  return (
    <div className="notranslate flex items-center gap-2" translate="no">
      <span className="flex items-center gap-1">
        {stackComponents.map((component) => {
          const logo = COMPONENT_LOGOS[component];
          if (!logo) return null;
          const Icon = logo.icon;
          return (
            <Icon
              key={component}
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: logo.color }}
              aria-hidden="true"
            />
          );
        })}
      </span>
      <span>
        {stackComponents.map((component, index) => (
          <React.Fragment key={index}>
            <span className="font-semibold">{component}</span>
            {index < stackComponents.length - 1 && " + "}
          </React.Fragment>
        ))}
      </span>
    </div>
  );
};

export default StackLabel;
