import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const folder = "docs/screenshots/home-ui/before";
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
const page = await browser.newPage();
const captures = [];
for (const [route, width, height] of [
  ["coach-today", 1536, 1024], ["coach-today", 1440, 900],
  ["coach-today", 1280, 900], ["coach-today", 390, 844],
  ["coach-today", 320, 844], ["players", 1440, 900],
  ["player-profile", 1440, 900], ["parent-home", 390, 844],
]) {
  await page.setViewportSize({width,height});
  await page.goto(`http://127.0.0.1:3000/design-preview/${route}`, {timeout:120000});
  await page.locator("h1").waitFor();
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode().catch(() => {}))); });
  await page.screenshot({path:`${folder}/${route}-${width}.png`});
  captures.push({route:`/design-preview/${route}`,width,height,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
}
await writeFile(`${folder}/capture.json`,JSON.stringify({baseCommit:"ed53d8c4641d7efa8add54d33d59a176be69e9a0",captures},null,2));
await browser.close();
console.log(JSON.stringify(captures,null,2));
