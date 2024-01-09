import { GeneratedCodeConfig } from "./lib/stacks/types";

export enum EditorTheme {
  ESPRESSO = "espresso",
  COBALT = "cobalt",
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

export interface CodeGenerationParams {
  generationType: "create" | "update";
  image: string;
  resultImage?: string;
  history?: string[];
  isImportedFromCode?: boolean;
}

export type FullGenerationSettings = CodeGenerationParams & Settings;
export { GeneratedCodeConfig };
