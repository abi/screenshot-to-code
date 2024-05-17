import puppeteer, { Browser, Page, ElementHandle } from "puppeteer";
import { Stack } from "../lib/stacks";

const REPO_PATH = "/Users/abi/Documents/GitHub/screenshot-to-code/frontend";
const DOWNLOAD_PATH = `${REPO_PATH}/qa`;
const SCREENSHOTS_PATH = `${REPO_PATH}/qa/results`;
const IMAGE_PATH = DOWNLOAD_PATH + "/ui_table.png";

describe("Simple Puppeteer Test", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });
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

  const stacks = Object.values(Stack).slice(0, 1);

  stacks.forEach((stack) => {
    it(`should load the homepage and check the title for stack: ${stack}`, async () => {
      const codeGenerationModel = "claude_3_sonnet";

      // Set up local storage
      const setting = {
        openAiApiKey: null,
        openAiBaseURL: null,
        screenshotOneApiKey: null,
        isImageGenerationEnabled: false,
        editorTheme: "cobalt",
        generatedCodeConfig: stack,
        codeGenerationModel: codeGenerationModel,
        isTermOfServiceAccepted: false,
        accessCode: null,
      };

      await page.evaluate((setting) => {
        localStorage.setItem("setting", JSON.stringify(setting));
      }, setting);

      // Reload the page to apply the local storage
      await page.reload();

      // Generate from image

      const fileInput = (await page.$(
        ".file-input"
      )) as ElementHandle<HTMLInputElement>;
      // Replace with the path to your image
      const imagePath = IMAGE_PATH;
      if (!fileInput) {
        throw new Error("File input element not found");
      }

      // Upload file
      await fileInput.uploadFile(imagePath);

      // Screenshot of the uploaded image
      await page.screenshot({
        path: `${SCREENSHOTS_PATH}/${codeGenerationModel}_${stack}_image_uploaded.png`,
      });

      console.log("starting image code generation for stack: ", stack);

      // Click the generate button and wait for the code to be generated
      await page.waitForNetworkIdle();
      await page.waitForFunction(() => document.body.innerText.includes("v1"), {
        timeout: 30000,
      });

      await page.screenshot({
        path: `${SCREENSHOTS_PATH}/${codeGenerationModel}_${stack}_image_generation_results.png`,
      });

      console.log(`done with image code generation for stack: ${stack}`);
    });
  });
});
