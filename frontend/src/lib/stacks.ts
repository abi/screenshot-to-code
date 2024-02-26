// Keep in sync with backend (prompts/types.py)
export enum Stack {
  HTML_TAILWIND = "html_tailwind",
  REACT_TAILWIND = "react_tailwind",
  BOOTSTRAP = "bootstrap",
  VUE_TAILWIND = "vue_tailwind",
  VUE_CSS = "vue_css",
  IONIC_TAILWIND = "ionic_tailwind",
  SVG = "svg",
  FLUTTER = "flutter",
}

export const STACK_DESCRIPTIONS: {
  [key in Stack]: { components: string[]; inBeta: boolean };
} = {
  html_tailwind: { components: ["HTML", "Tailwind"], inBeta: false },
  react_tailwind: { components: ["React", "Tailwind"], inBeta: false },
  bootstrap: { components: ["Bootstrap"], inBeta: false },
  vue_tailwind: { components: ["Vue", "Tailwind"], inBeta: true },
  vue_css: { components: ["Vue","CSS"], inBeta: true },
  ionic_tailwind: { components: ["Ionic", "Tailwind"], inBeta: true },
  svg: { components: ["SVG"], inBeta: true },
  flutter: { components: ["Flutter"], inBeta: true },
};
