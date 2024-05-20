import puppeteer, { Browser, Page, ElementHandle } from "puppeteer";
import { Stack } from "../lib/stacks";
import { CodeGenerationModel } from "../lib/models";

const REPO_PATH = "/Users/abi/Documents/GitHub/screenshot-to-code/frontend";
const DOWNLOAD_PATH = `${REPO_PATH}/qa`;
const SCREENSHOTS_PATH = `${REPO_PATH}/qa/results`;
const IMAGE_PATH = DOWNLOAD_PATH + "/ui_table.png";

describe("Simple Puppeteer Test", () => {
  let browser: Browser;
  let page: Page;

  const DEBUG = true;
  const stacks = Object.values(Stack).slice(0, DEBUG ? 1 : undefined);
  const models = Object.values(CodeGenerationModel).slice(
    0,
    DEBUG ? 1 : undefined
  );

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: false });
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

  models.forEach((model) => {
    stacks.forEach((stack) => {
      it(
        `should load the homepage and check the title for stack: ${stack}`,
        async () => {
          const testId = `${model}_${stack}`;
          const screenshotPathPrefix = `${SCREENSHOTS_PATH}/${testId}`;
          await setupLocalStorage(page, stack, model);

          // Upload file
          const fileInput = (await page.$(
            ".file-input"
          )) as ElementHandle<HTMLInputElement>;

          if (!fileInput) {
            throw new Error("File input element not found");
          }

          await fileInput.uploadFile(IMAGE_PATH);

          // Screenshot the first step
          await page.screenshot({
            path: `${screenshotPathPrefix}_image_uploaded.png`,
          });

          // Click the generate button and wait for the code to be generated
          await page.waitForNetworkIdle();
          await page.waitForFunction(
            () => document.body.innerText.includes("v1"),
            {
              timeout: 30000,
            }
          );

          await page.screenshot({
            path: `${screenshotPathPrefix}_image_results.png`,
          });

          await makeEdit(
            page,
            "make the header blue",
            "v2",
            screenshotPathPrefix
          );

          await makeEdit(
            page,
            "make all text italic",
            "v3",
            screenshotPathPrefix
          );

          await page.evaluate(() => {
            document.querySelectorAll("div").forEach((div) => {
              if (div.innerText.includes("v2")) {
                div.click();
              }
            });
          });

          await makeEdit(page, "make all text red", "v4", screenshotPathPrefix);
        },
        60 * 1000
      );
    });
  });
});

async function setupLocalStorage(page: Page, stack: string, model: string) {
  const setting = {
    openAiApiKey: null,
    openAiBaseURL: null,
    screenshotOneApiKey: null,
    isImageGenerationEnabled: false,
    editorTheme: "cobalt",
    generatedCodeConfig: stack,
    codeGenerationModel: model,
    isTermOfServiceAccepted: false,
    accessCode: null,
  };

  await page.evaluate((setting) => {
    localStorage.setItem("setting", JSON.stringify(setting));
  }, setting);

  // Reload the page to apply the local storage
  await page.reload();
}

async function makeEdit(
  page: Page,
  edit: string,
  version: string,
  screenshotPathPrefix: string
) {
  await page.type(
    'textarea[placeholder="Tell the AI what to change..."]',
    edit
  );

  await page.screenshot({
    path: `${screenshotPathPrefix}_typed_${version}.png`,
  });

  await page.click(".update-btn");

  await page.waitForFunction(
    (version: string) => document.body.innerText.includes(version),
    {
      timeout: 30000,
    },
    version
  );

  await page.screenshot({
    path: `${screenshotPathPrefix}_done_${version}.png`,
  });
}
