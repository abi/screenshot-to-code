import { Stack } from "./types";

export const STACK_DESCRIPTIONS: {
  [key in Stack]: { components: string[]; inBeta: boolean };
} = {
  html_tailwind: { components: ["HTML", "Tailwind"], inBeta: false },
  react_tailwind: { components: ["React", "Tailwind"], inBeta: false },
  bootstrap: { components: ["Bootstrap"], inBeta: false },
  vue_tailwind: { components: ["Vue", "Tailwind"], inBeta: true },
  ionic_tailwind: { components: ["Ionic", "Tailwind"], inBeta: true },
  svg: { components: ["SVG"], inBeta: true },
};
