import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const folder = "docs/screenshots/home-ui/iteration";
await mkdir(folder, { recursive: true });
console.log("Launching isolated Edge capture");
const browser = await chromium.launch({ channel: "msedge", timeout: 20000 });
try {
  const page = await browser.newPage();
  page.on("pageerror", error => console.log(error.message));
  for (const [width,height] of [[1536,1024],[390,844],[320,844]]) {
    await page.setViewportSize({width,height});
    await page.goto("http://127.0.0.1:3000/design-preview/coach-today",{timeout:120000});
    console.log(`Loaded ${width}px Home`);
    await page.locator(".home-dashboard").waitFor();
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));});
    await page.screenshot({path:`${folder}/home-${width}.png`});
    await page.screenshot({path:`${folder}/home-${width}-full.png`,fullPage:true});
    console.log(JSON.stringify(await page.evaluate(()=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,hero:document.querySelector(".hd-hero").getBoundingClientRect().toJSON(),schedule:document.querySelector(".hd-schedule").getBoundingClientRect().toJSON()}))));
  }
} finally { await browser.close(); }
