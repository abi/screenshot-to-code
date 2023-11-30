export enum EditorTheme {
  ESPRESSO = "espresso",
  COBALT = "cobalt",
}

// Keep in sync with backend (prompts.py)
export enum GeneratedCodeConfig {
  HTML_TAILWIND = "html_tailwind",
  REACT_TAILWIND = "react_tailwind",
  BOOTSTRAP = "bootstrap",
  IONIC_TAILWIND = "ionic_tailwind",
}

export interface Settings {
  openAiApiKey: string | null;
  openAiBaseURL: string | null;
  screenshotOneApiKey: string | null;
  isImageGenerationEnabled: boolean;
  editorTheme: EditorTheme;
  generatedCodeConfig: GeneratedCodeConfig;
  // Only relevant for hosted version
  isTermOfServiceAccepted: boolean;
  accessCode: string | null;
}

export enum AppState {
  INITIAL = "INITIAL",
  CODING = "CODING",
  CODE_READY = "CODE_READY",
}
