export enum EditorTheme {
  ESPRESSO = "espresso",
  COBALT = "cobalt",
}

export enum CSSOption {
  TAILWIND = "tailwind",
  BOOTSTRAP = "bootstrap",
}

export enum JSFrameworkOption {
  NO_FRAMEWORK = "vanilla",
  REACT = "react",
  VUE = "vue",
}

export enum UIComponentOption {
  HTML = 'HTML',
  IONIC = 'ionic'
}

export interface OutputSettings {
  css: CSSOption;
  js: JSFrameworkOption;
  components: UIComponentOption;
}

export interface Settings {
  openAiApiKey: string | null;
  openAiBaseURL: string | null;
  screenshotOneApiKey: string | null;
  isImageGenerationEnabled: boolean;
  editorTheme: EditorTheme;
  isTermOfServiceAccepted: boolean; // Only relevant for hosted version
  accessCode: string | null; // Only relevant for hosted version
}

export enum AppState {
  INITIAL = "INITIAL",
  CODING = "CODING",
  CODE_READY = "CODE_READY",
}
