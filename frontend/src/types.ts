export enum ComponentLibrary {
  HTML = 'html',
  IONIC = 'ionic',
  // TODO: add support to FLUTTER = 'flutter',
  // TODO: add support to REACT = 'react',
  // TODO: add support to VUE = 'vue',
}

export enum EditorTheme {
  ESPRESSO = "espresso",
  COBALT = "cobalt",
}

export interface Settings {
  openAiApiKey: string | null;
  screenshotOneApiKey: string | null;
  isImageGenerationEnabled: boolean;
  editorTheme: EditorTheme;
  isTermOfServiceAccepted: boolean; // Only relevant for hosted version
  componentLibrary: ComponentLibrary;
}

export enum AppState {
  INITIAL = "INITIAL",
  CODING = "CODING",
  CODE_READY = "CODE_READY",
}
