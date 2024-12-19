import { Stack } from "./lib/stacks";
import { CodeGenerationModel } from "./lib/models";

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
  generatedCodeConfig: Stack;
  codeGenerationModel: CodeGenerationModel;
  // Only relevant for hosted version
  isTermOfServiceAccepted: boolean;
  anthropicApiKey: string | null; // Added property for anthropic API key
}

export enum AppState {
  INITIAL = "INITIAL",
  CODING = "CODING",
  CODE_READY = "CODE_READY",
}

export enum ScreenRecorderState {
  INITIAL = "initial",
  RECORDING = "recording",
  FINISHED = "finished",
}

export interface CodeGenerationParams {
  generationType: "create" | "update";
  inputMode: "image" | "video";
  image: string;
  history?: string[];
  isImportedFromCode?: boolean;
}

export type FullGenerationSettings = CodeGenerationParams & Settings;
