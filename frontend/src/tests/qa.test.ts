import * as fs from "fs";
import * as path from "path";
import puppeteer, { Browser, ElementHandle, Page } from "puppeteer";
import { Stack } from "../lib/stacks";
import { CodeGenerationModel } from "../lib/models";

declare global {
  interface Window {
    __qaDownloads: Array<string | null>;
    __qaFormSubmits: Array<string | null>;
    __qaClipboardCalls: string[];
  }
}

const RUN_E2E = process.env.RUN_E2E === "true";
const describeE2E = RUN_E2E ? describe : describe.skip;

const TESTS_ROOT_PATH =
  process.env.TEST_ROOT_PATH ?? path.resolve(process.cwd(), "src/tests");

// Fixtures
const FIXTURES_PATH = path.join(TESTS_ROOT_PATH, "fixtures");
const SIMPLE_SCREENSHOT = path.join(FIXTURES_PATH, "simple_button.png");
const SCREENSHOT_WITH_IMAGES = path.join(
  FIXTURES_PATH,
  "simple_ui_with_image.png"
);
const SIMPLE_HTML = path.join(FIXTURES_PATH, "simple_page.html");

// Results
const RESULTS_DIR = path.join(TESTS_ROOT_PATH, "results");

const defaultStacks = [Stack.HTML_TAILWIND];
const stacks = process.env.QA_STACKS
  ? process.env.QA_STACKS.split(",").map((stack) => stack.trim() as Stack)
  : defaultStacks;

const defaultModels = [CodeGenerationModel.CLAUDE_4_5_SONNET_2025_09_29];
const models = process.env.QA_MODELS
  ? process.env.QA_MODELS.split(",").map((model) => model.trim())
  : defaultModels;

describeE2E("qa e2e flows", () => {
  let browser: Browser;
  let page: Page;

  const IS_HEADLESS = process.env.HEADLESS !== "false";

  beforeAll(async () => {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    browser = await puppeteer.launch({ headless: IS_HEADLESS });
    page = await browser.newPage();

    await installMockWebSocket(page);
    await installDomTestHooks(page);
    await setupRequestInterception(page, SCREENSHOT_WITH_IMAGES);

    await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" });

    // Set screen size
    await page.setViewport({ width: 1280, height: 1024 });
  });

  afterAll(async () => {
    await browser.close();
  });

  // Create tests (every stack)
  models.forEach((model) => {
    stacks.forEach((stack) => {
      it(
        `create from screenshot: ${model} & ${stack}`,
        async () => {
          const app = new App(
            page,
            stack,
            model,
            `create_screenshot_${model}_${stack}`
          );
          await app.init();
          await app.uploadImage(SCREENSHOT_WITH_IMAGES);
          await app.resetTestHooks();
        },
        60 * 1000
      );

      it(
        `create from URL: ${model} & ${stack}`,
        async () => {
          const app = new App(
            page,
            stack,
            model,
            `create_url_${model}_${stack}`
          );
          await app.init();
          await app.generateFromUrl("https://example.com");
          await app.resetTestHooks();
        },
        60 * 1000
      );
    });
  });

  // Update tests - for every model (HTML Tailwind only)
  models.forEach((model) => {
    it(
      `update flow: ${model}`,
      async () => {
        const app = new App(
          page,
          Stack.HTML_TAILWIND,
          model,
          `update_${model}`
        );
        await app.init();

        await app.uploadImage(SIMPLE_SCREENSHOT);
        await app.regenerate();
        await app.edit("make the text underline", "v2");
        await app.edit("make the text italic", "v3");
        await app.clickVersion("v2");
        await app.edit("make the text yellow", "v4");
        await app.resetTestHooks();
      },
      90 * 1000
    );
  });

  // Start from code tests - for every model
  models.forEach((model) => {
    it(
      `start from code: ${model}`,
      async () => {
        const app = new App(
          page,
          Stack.HTML_TAILWIND,
          model,
          `start_from_code_${model}`
        );
        await app.init();
        await app.importFromCode(fs.readFileSync(SIMPLE_HTML, "utf8"));
        await app.edit("make the text underline", "v2");
        await app.edit("make the text italic", "v3");
        await app.clickVersion("v2");
        await app.edit("make the text yellow", "v4");
        await app.resetTestHooks();
      },
      90 * 1000
    );
  });

  // Start from text tests - for every model
  models.forEach((model) => {
    it(
      `start from text: ${model}`,
      async () => {
        const app = new App(
          page,
          Stack.HTML_TAILWIND,
          model,
          `start_from_text_${model}`
        );
        await app.init();
        await app.generateFromText("a simple button that says howdy");
        await app.edit("make the text underline", "v2");
        await app.edit("make the text italic", "v3");
        await app.clickVersion("v2");
        await app.edit("make the text yellow", "v4");
        await app.resetTestHooks();
      },
      90 * 1000
    );
  });

  // Buttons (Download Code, Copy Code, Open in Codepen)
  models.forEach((model) => {
    it(
      `code action buttons: ${model}`,
      async () => {
        const app = new App(
          page,
          Stack.HTML_TAILWIND,
          model,
          `code_buttons_${model}`
        );
        await app.init();
        await app.generateFromText("a simple button that says howdy");
        await app.assertCodeActions();
        await app.resetTestHooks();
      },
      60 * 1000
    );
  });
});

class App {
  private screenshotPathPrefix: string;
  private page: Page;
  private stack: Stack;
  private model: string;

  constructor(page: Page, stack: Stack, model: string, testId: string) {
    this.page = page;
    this.stack = stack;
    this.model = model;
    this.screenshotPathPrefix = `${RESULTS_DIR}/${testId}`;
  }

  async init() {
    await this.setupLocalStorage();
    await this.resetTestHooks();
  }

  async setupLocalStorage() {
    const setting = {
      openAiApiKey: "test-openai-key",
      openAiBaseURL: null,
      anthropicApiKey: "test-anthropic-key",
      screenshotOneApiKey: "test-screenshotone-key",
      isImageGenerationEnabled: true,
      editorTheme: "cobalt",
      generatedCodeConfig: this.stack,
      codeGenerationModel: this.model,
      isTermOfServiceAccepted: true,
      accessCode: null,
    };

    await this.page.evaluate((nextSetting) => {
      localStorage.setItem("setting", JSON.stringify(nextSetting));
    }, setting);

    await this.page.reload({ waitUntil: "networkidle0" });
  }

  async resetTestHooks() {
    await this.page.evaluate(() => {
      window.__qaDownloads = [];
      window.__qaFormSubmits = [];
      window.__qaClipboardCalls = [];
    });
  }

  async takeScreenshot(step: string) {
    await this.page.screenshot({
      path: `${this.screenshotPathPrefix}_${step}.png`,
    });
  }

  async waitUntilVersionIsReady(version: string) {
    await this.page.waitForFunction(
      (versionLabel) => document.body.innerText.includes(versionLabel),
      {
        timeout: 30000,
      },
      version
    );
    await this.page.waitForSelector('[data-testid="update-input"]', {
      timeout: 30000,
    });
  }

  async switchToTab(testId: string) {
    await this.page.click(`[data-testid="${testId}"]`);
  }

  async generateFromUrl(url: string) {
    await this.switchToTab("tab-url");
    await this.page.type('[data-testid="url-input"]', url);
    await this.takeScreenshot("typed_url");
    await this.page.click('[data-testid="url-capture"]');
    await this.waitUntilVersionIsReady("v1");
    await this.takeScreenshot("url_result");
  }

  async generateFromText(prompt: string) {
    await this.switchToTab("tab-text");
    await this.page.type('[data-testid="text-input"]', prompt);
    await this.takeScreenshot("typed_text");
    await this.page.click('[data-testid="text-generate"]');
    await this.waitUntilVersionIsReady("v1");
    await this.takeScreenshot("text_result");
  }

  async uploadImage(screenshotPath: string) {
    await this.switchToTab("tab-upload");
    const fileInput = (await this.page.$(
      '[data-testid="upload-input"]'
    )) as ElementHandle<HTMLInputElement>;
    if (!fileInput) {
      throw new Error("Upload input element not found");
    }
    await fileInput.uploadFile(screenshotPath);
    await this.page.waitForSelector('[data-testid="upload-generate"]');
    await this.takeScreenshot("image_uploaded");

    await this.page.click('[data-testid="upload-generate"]');
    await this.waitUntilVersionIsReady("v1");
    await this.takeScreenshot("image_results");
  }

  async importFromCode(code: string) {
    await this.switchToTab("tab-import");
    await this.page.type('[data-testid="import-input"]', code);
    await this.page.click('[data-testid="stack-select"]');
    await this.page.waitForSelector('[role="option"]', { timeout: 5000 });
    await this.page.evaluate(() => {
      const options = Array.from(
        document.querySelectorAll('[role="option"]')
      ) as HTMLElement[];
      const target = options.find((option) =>
        option.textContent?.includes("HTML + Tailwind")
      );
      target?.click();
    });
    await this.takeScreenshot("typed_code");
    await this.page.click('[data-testid="import-submit"]');
    await this.waitUntilVersionIsReady("v1");
  }

  async edit(edit: string, version: string) {
    await this.page.type('[data-testid="update-input"]', edit);
    await this.takeScreenshot(`typed_${version}`);
    await this.page.click(".update-btn");
    await this.waitUntilVersionIsReady(version);
    await this.takeScreenshot(`done_${version}`);
  }

  async clickVersion(version: string) {
    await this.page.evaluate((versionLabel) => {
      document.querySelectorAll("div").forEach((div) => {
        if (div.innerText.includes(versionLabel)) {
          div.click();
        }
      });
    }, version);
  }

  async regenerate() {
    await this.page.click(".regenerate-btn");
    await this.waitUntilVersionIsReady("v1");
    await this.takeScreenshot("regenerate_results");
  }

  async assertCodeActions() {
    await this.page.click('[data-testid="tab-code"]');
    await this.page.waitForSelector('[data-testid="copy-code"]', {
      timeout: 10000,
    });
    await this.page.click('[data-testid="copy-code"]');
    await this.page.click('[data-testid="open-codepen"]');
    await this.page.click('[data-testid="download-code"]');

    const results = await this.page.evaluate(() => ({
      downloads: window.__qaDownloads,
      submits: window.__qaFormSubmits,
      clipboard: window.__qaClipboardCalls,
    }));

    expect(results.downloads).toContain("index.html");
    expect(results.submits).toContain("https://codepen.io/pen/define");
    expect(results.clipboard).toContain("copy");
  }
}

async function setupRequestInterception(
  page: Page,
  screenshotFixturePath: string
) {
  const screenshotBuffer = fs.readFileSync(screenshotFixturePath);
  const screenshotDataUrl = `data:image/png;base64,${screenshotBuffer.toString(
    "base64"
  )}`;

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = request.url();
    if (url.endsWith("/api/screenshot")) {
      request.respond({
        status: 200,
        contentType: "application/json",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({ url: screenshotDataUrl }),
      });
      return;
    }
    request.continue();
  });
}

async function installDomTestHooks(page: Page) {
  await page.evaluateOnNewDocument(() => {
    window.__qaDownloads = [];
    window.__qaFormSubmits = [];
    window.__qaClipboardCalls = [];

    const originalAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (...args) {
      window.__qaDownloads.push(this.getAttribute("download"));
      return originalAnchorClick.apply(this, args);
    };

    const originalFormSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function (...args) {
      window.__qaFormSubmits.push(this.getAttribute("action"));
      return originalFormSubmit.apply(this, args);
    };

    const originalExecCommand = document.execCommand?.bind(document);
    document.execCommand = (command) => {
      window.__qaClipboardCalls.push(command);
      if (!originalExecCommand) {
        return true;
      }
      return originalExecCommand(command);
    };
  });
}

async function installMockWebSocket(page: Page) {
  await page.evaluateOnNewDocument(() => {
    class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;

      readyState = MockWebSocket.CONNECTING;
      url: string;
      listeners: Record<string, Array<(event: any) => void>> = {};

      constructor(url: string) {
        this.url = url;
        window.setTimeout(() => {
          this.readyState = MockWebSocket.OPEN;
          this.emit("open", {});
        }, 10);
      }

      addEventListener(type: string, listener: (event: any) => void) {
        if (!this.listeners[type]) {
          this.listeners[type] = [];
        }
        this.listeners[type].push(listener);
      }

      removeEventListener(type: string, listener: (event: any) => void) {
        if (!this.listeners[type]) return;
        this.listeners[type] = this.listeners[type].filter(
          (existing) => existing !== listener
        );
      }

      send(data: string) {
        const params = JSON.parse(data);
        const code = [
          "<!doctype html>",
          "<html>",
          "<head><title>QA</title></head>",
          "<body>",
          `<button>${params.generationType ?? "create"}</button>`,
          "</body>",
          "</html>",
        ].join("");

        const events = [
          { type: "variantCount", value: "1", variantIndex: 0 },
          { type: "status", value: "Generating", variantIndex: 0 },
          { type: "setCode", value: code, variantIndex: 0 },
          { type: "variantComplete", value: "", variantIndex: 0 },
        ];

        events.forEach((payload, index) => {
          window.setTimeout(() => {
            this.emit("message", { data: JSON.stringify(payload) });
          }, 20 * (index + 1));
        });

        window.setTimeout(() => {
          this.close(1000, "OK");
        }, 120);
      }

      close(code = 1000, reason = "") {
        this.readyState = MockWebSocket.CLOSED;
        this.emit("close", { code, reason });
      }

      emit(type: string, event: any) {
        (this.listeners[type] || []).forEach((listener) => {
          listener(event);
        });
      }
    }

    window.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });
}
