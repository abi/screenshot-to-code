import puppeteer, { Browser, Page, ElementHandle } from "puppeteer";
import { Stack } from "../lib/stacks";
import { CodeGenerationModel } from "../lib/models";

const TESTS_ROOT_PATH = process.env.TEST_ROOT_PATH;

// Fixtures
const FIXTURES_PATH = `${TESTS_ROOT_PATH}/fixtures`;
const SIMPLE_SCREENSHOT = FIXTURES_PATH + "/simple_button.png";
const SCREENSHOT_WITH_IMAGES = `${FIXTURES_PATH}/simple_ui_with_image.png`;

// Results
const RESULTS_DIR = `${TESTS_ROOT_PATH}/results`;

// Run with MOCK=true backend for stability
// Command: MOCK=true poetry run uvicorn main:app --reload --port 7001

describe.skip("e2e tests", () => {
  let browser: Browser;
  let page: Page;

  const DEBUG = true;
  const IS_HEADLESS = true;
  const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5173";

  const stacks = Object.values(Stack).slice(0, DEBUG ? 1 : undefined);
  const models = DEBUG
    ? [CodeGenerationModel.CLAUDE_4_5_SONNET_2025_09_29]
    : Object.values(CodeGenerationModel);

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: IS_HEADLESS });
    page = await browser.newPage();
    await page.goto(BASE_URL);

    // Set screen size
    await page.setViewport({ width: 1080, height: 1024 });
  });

  afterAll(async () => {
    await browser.close();
  });

  // Create tests
  models.forEach((model) => {
    stacks.forEach((stack) => {
      it(
        `Create for : ${model} & ${stack}`,
        async () => {
          const app = new App(
            page,
            stack,
            model,
            `create_screenshot_${model}_${stack}`
          );
          await app.init();
          // Generate from screenshot
          await app.uploadImage(SCREENSHOT_WITH_IMAGES);
        },
        60 * 1000
      );

      it(
        `Create from URL for : ${model} & ${stack}`,
        async () => {
          const app = new App(
            page,
            stack,
            model,
            `create_url_${model}_${stack}`
          );
          await app.init();
          // Generate from screenshot
          await app.generateFromUrl("https://a.picoapps.xyz/design-fear");
        },
        60 * 1000
      );
    });
  });

  // Update tests - for every model (doesn't need to be repeated for each stack - fix to HTML Tailwind only)
  models.forEach((model) => {
    ["html_tailwind"].forEach((stack) => {
      it(
        `update: ${model}`,
        async () => {
          const app = new App(page, stack, model, `update_${model}_${stack}`);
          await app.init();

          // Generate from screenshot
          await app.uploadImage(SIMPLE_SCREENSHOT);
          // Regenerate works for v1
          await app.regenerate();
          // Make an update
          await app.edit("make the button background blue", "v2");
          // Make another update
          await app.edit("make the text italic", "v3");
          // Branch off v2 and make an update
          await app.clickVersion("v2");
          await app.edit("make the text yellow", "v4");
        },
        90 * 1000
      );
    });
  });

  // Start from code tests - for every model
  models.forEach((model) => {
    ["html_tailwind"].forEach((stack) => {
      it.skip(
        `Start from code: ${model}`,
        async () => {
          const app = new App(
            page,
            stack,
            model,
            `start_from_code_${model}_${stack}`
          );
          await app.init();

          await app.importFromCode();
        },
        90 * 1000
      );
    });
  });
});

class App {
  private screenshotPathPrefix: string;
  private page: Page;
  private stack: string;
  private model: string;

  constructor(page: Page, stack: string, model: string, testId: string) {
    this.page = page;
    this.stack = stack;
    this.model = model;
    this.screenshotPathPrefix = `${RESULTS_DIR}/${testId}`;
  }

  async init() {
    await this.setupLocalStorage();
  }

  async setupLocalStorage() {
    const setting = {
      openAiApiKey: null,
      openAiBaseURL: null,
      screenshotOneApiKey: process.env.TEST_SCREENSHOTONE_API_KEY,
      isImageGenerationEnabled: true,
      editorTheme: "cobalt",
      generatedCodeConfig: this.stack,
      codeGenerationModel: this.model,
      isTermOfServiceAccepted: false,
      accessCode: null,
    };

    await this.page.evaluate((setting) => {
      localStorage.setItem("setting", JSON.stringify(setting));
    }, setting);

    // Reload the page to apply the local storage
    await this.page.reload();
  }

  async _screenshot(step: string) {
    await this.page.screenshot({
      path: `${this.screenshotPathPrefix}_${step}.png`,
    });
  }

  async _waitUntilVersionIsReady(version: string) {
    // Wait for network idle
    await this.page.waitForNetworkIdle({ timeout: 30000 });

    // Wait for the version label to appear using data-testid
    const versionNumber = version.replace("v", "");
    await this.page.waitForSelector(
      `[data-testid="version-label-${versionNumber}"]`,
      { timeout: 30000 }
    );

    // Small delay for rendering to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async generateFromUrl(url: string) {
    // Type in the URL using data-testid
    const urlInput = await this.page.waitForSelector('[data-testid="url-input"]');
    await urlInput?.type(url);
    await this._screenshot("typed_url");

    // Click the capture button using data-testid
    await this.page.click('[data-testid="capture-btn"]');
    await this._waitUntilVersionIsReady("v1");
    await this._screenshot("url_result");
  }

  // Uploads a screenshot and generates the image
  async uploadImage(screenshotPath: string) {
    // Upload file using data-testid
    const fileInput = await this.page.waitForSelector(
      '[data-testid="file-input"]'
    ) as ElementHandle<HTMLInputElement>;

    if (!fileInput) {
      throw new Error("File input element not found");
    }
    await fileInput.uploadFile(screenshotPath);
    await this._screenshot("image_uploaded");

    // Wait for generate button and click it
    const generateBtn = await this.page.waitForSelector('[data-testid="generate-btn"]');
    if (generateBtn) {
      await generateBtn.click();
    }

    await this._waitUntilVersionIsReady("v1");
    await this._screenshot("image_results");
  }

  // Makes a text edit and waits for a new version
  async edit(edit: string, version: string) {
    // Type in the edit using data-testid
    const textarea = await this.page.waitForSelector(
      '[data-testid="update-instruction-input"]'
    );
    await textarea?.type(edit);
    await this._screenshot(`typed_${version}`);

    // Click the update button using data-testid
    await this.page.click('[data-testid="update-btn"]');
    await this._waitUntilVersionIsReady(version);
    await this._screenshot(`done_${version}`);
  }

  async clickVersion(version: string) {
    const versionNumber = version.replace("v", "");
    // Click on the version using data-testid
    const versionSelector = `[data-testid="version-select-${versionNumber}"]`;
    await this.page.waitForSelector(versionSelector);
    await this.page.click(versionSelector);

    // Wait for the version to become active
    await this.page.waitForSelector(
      `[data-testid="version-container-${versionNumber}"][data-active="true"]`
    );
  }

  async regenerate() {
    // Click regenerate button using data-testid
    await this.page.click('[data-testid="regenerate-btn"]');
    await this._waitUntilVersionIsReady("v1");
    await this._screenshot("regenerate_results");
  }

  async importFromCode() {
    // Click import tab/button
    const importTab = await this.page.waitForSelector('[data-testid="import-tab"]');
    await importTab?.click();

    // Type code into the textarea using data-testid
    const codeInput = await this.page.waitForSelector(
      '[data-testid="import-code-input"]'
    );
    await codeInput?.type("<html><body>Hello World</body></html>");

    await this._screenshot("typed_code");

    // Click import button using data-testid
    await this.page.click('[data-testid="import-btn"]');

    await this._waitUntilVersionIsReady("v1");
  }
}
