import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const phase = process.argv[2] ?? "before";
const origin = process.argv[3] ?? "http://127.0.0.1:3000";
if (!["before", "after"].includes(phase))
  throw new Error("Choose before or after");
const folder = `docs/design/locked-ui/${phase}`;
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const evidence = [];
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
for (const [screen, width, height] of [
  ["coach-today", 1440, 780],
  ["parent-home", 390, 844],
  ["parent-home", 320, 844],
  ["parent-home", 1440, 900],
  ["coach-today", 390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page.goto(`${origin}/design-preview/${screen}`, { timeout: 120000 });
  await page.locator(".approved-review").waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((img) => img.decode().catch(() => {})),
    );
  });
  await page.screenshot({
    path: `${folder}/${screen}-${width}.png`,
    fullPage: false,
  });
  await page.screenshot({
    path: `${folder}/${screen}-${width}-full.png`,
    fullPage: true,
  });
  evidence.push({
    screen,
    width,
    height,
    route: `/design-preview/${screen}`,
    ...(await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      font: getComputedStyle(document.querySelector("h1")).fontFamily,
      fontReady: document.fonts.check('14px "Preview Noto"'),
      images: [...document.querySelectorAll(".approved-review img")].map(
        (img) => ({
          src: img.getAttribute("src"),
          loaded: img.complete && img.naturalWidth > 0,
          width: img.naturalWidth,
          height: img.naturalHeight,
        }),
      ),
    }))),
  });
}
await writeFile(
  `${folder}/capture.json`,
  JSON.stringify({ phase, origin, evidence, errors }, null, 2),
);
await browser.close();
console.log(JSON.stringify({ folder, evidence, errors }, null, 2));
