import puppeteer, { Browser, Page, ElementHandle } from "puppeteer";
import { Stack } from "../lib/stacks";
import { CodeGenerationModel } from "../lib/models";

const REPO_PATH = "/Users/abi/Documents/GitHub/screenshot-to-code/frontend";
const DOWNLOAD_PATH = `${REPO_PATH}/qa`;
const SCREENSHOTS_PATH = `${REPO_PATH}/qa/results`;
const IMAGE_PATH = DOWNLOAD_PATH + "/simple_button.png";
const SCREENSHOT_WITH_IMAGES = `${DOWNLOAD_PATH}/simple_ui_with_image.png`;

describe("Simple Puppeteer Test", () => {
  let browser: Browser;
  let page: Page;

  const DEBUG = true;
  const IS_HEADLESS = false;

  const stacks = Object.values(Stack).slice(0, DEBUG ? 1 : undefined);
  const models = Object.values(CodeGenerationModel).slice(
    0,
    DEBUG ? 1 : undefined
  );

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: IS_HEADLESS });
    page = await browser.newPage();
    await page.goto("http://localhost:5173/");

    // Set screen size
    await page.setViewport({ width: 1080, height: 1024 });

    // TODO: Does this need to be moved?
    const client = await page.createCDPSession();

    // Set download behavior path
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: DOWNLOAD_PATH,
    });
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

  // Update tests - for every model (doesn’t need to be repeated for each stack - fix to HTML Tailwind only)
  models.forEach((model) => {
    ["html_tailwind"].forEach((stack) => {
      it(
        `Update for : ${model}`,
        async () => {
          const app = new App(page, stack, model, `update_${model}_${stack}`);
          await app.init();

          // Generate from screenshot
          await app.uploadImage(IMAGE_PATH);
          // Regenerate works for v1
          await app.regenerate();
          // Make an update
          await app.edit("make the header blue", "v2");
          // Make another update
          await app.edit("make all text italic", "v3");
          // Branch off v2 and make an update
          await app.clickVersion("v2");
          await app.edit("make all text red", "v4");
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

  // TODOs
  // - Abstract screenshot functionality
  // - Abstract waiting for version to be done

  constructor(page: Page, stack: string, model: string, testId: string) {
    this.page = page;
    this.stack = stack;
    this.model = model;
    this.screenshotPathPrefix = `${SCREENSHOTS_PATH}/${testId}`;
  }

  async init() {
    await this.setupLocalStorage();
  }

  async setupLocalStorage() {
    const setting = {
      openAiApiKey: null,
      openAiBaseURL: null,
      screenshotOneApiKey: null,
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

  async generateFromUrl(url: string) {
    await this.page.type('input[placeholder="Enter URL"]', url);

    await this._screenshot("typed_url");

    // Click the capture button and wait for the code to be generated
    await this.page.click("button.capture-btn");
    await this.page.waitForNetworkIdle();
    await this.page.waitForFunction(
      () => document.body.innerText.includes("v1"),
      {
        timeout: 30000,
      }
    );

    await this._screenshot("url_result");
  }

  // Uploads a screenshot and generates the image
  async uploadImage(screenshotPath: string) {
    // Upload file
    const fileInput = (await this.page.$(
      ".file-input"
    )) as ElementHandle<HTMLInputElement>;

    if (!fileInput) {
      throw new Error("File input element not found");
    }

    await fileInput.uploadFile(screenshotPath);

    // Screenshot the first step
    await this.page.screenshot({
      path: `${this.screenshotPathPrefix}_image_uploaded.png`,
    });

    // Click the generate button and wait for the code to be generated
    await this.page.waitForNetworkIdle();
    await this.page.waitForFunction(
      () => document.body.innerText.includes("v1"),
      {
        timeout: 30000,
      }
    );

    // Wait for 1s so that the HTML and JS has time to render before screenshotting
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await this.page.screenshot({
      path: `${this.screenshotPathPrefix}_image_results.png`,
    });
  }

  // Makes a text edit and waits for a new version
  async edit(edit: string, version: string) {
    await this.page.type(
      'textarea[placeholder="Tell the AI what to change..."]',
      edit
    );

    await this.page.screenshot({
      path: `${this.screenshotPathPrefix}_typed_${version}.png`,
    });

    await this.page.click(".update-btn");

    await this.page.waitForFunction(
      (version: string) => document.body.innerText.includes(version),
      {
        timeout: 30000,
      },
      version
    );

    await this.page.screenshot({
      path: `${this.screenshotPathPrefix}_done_${version}.png`,
    });
  }

  async clickVersion(version: string) {
    await this.page.evaluate((version) => {
      document.querySelectorAll("div").forEach((div) => {
        if (div.innerText.includes(version)) {
          div.click();
        }
      });
    }, version);
  }

  async regenerate() {
    await this.page.click(".regenerate-btn");

    await this.page.waitForFunction(
      () => document.body.innerText.includes("v1"),
      {
        timeout: 30000,
      }
    );

    await this.page.screenshot({
      path: `${this.screenshotPathPrefix}_regenerate_results.png`,
    });
  }
}
