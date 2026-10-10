import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

// Original synthetic practice diagram. No footage of real people is used.
const directory = "public/demo";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
const layers = await page.evaluate(() => {
  function canvas(width, height) {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    return c;
  }
  const field = canvas(960, 540);
  const ctx = field.getContext("2d");
  ctx.fillStyle = "#092f28";
  ctx.fillRect(0, 0, 960, 540);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 ? "#24694b" : "#205e44";
    ctx.fillRect(35 + i * 74, 110, 74, 340);
  }
  ctx.strokeStyle = "#b3dec4";
  ctx.lineWidth = 2;
  ctx.strokeRect(55, 130, 850, 300);
  ctx.beginPath();
  ctx.moveTo(480, 130);
  ctx.lineTo(480, 430);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(480, 280, 60, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(55, 205, 95, 150);
  ctx.strokeRect(810, 205, 95, 150);
  ctx.fillStyle = "#f5fbf8";
  ctx.font = "bold 30px Arial";
  ctx.fillText("Scan. Receive. Progress.", 35, 50);
  ctx.font = "16px Arial";
  ctx.fillStyle = "#b1d6c4";
  ctx.fillText(
    "Fictional practice animation · not recorded player footage",
    35,
    82,
  );
  ctx.fillStyle = "#d4f0e1";
  ctx.font = "16px Arial";
  ctx.fillText("LOOK → RECEIVE → PASS", 35, 492);
  ctx.font = "12px Arial";
  ctx.fillStyle = "#9dc6b3";
  ctx.fillText(
    "Sportozen Academy · illustrative demo clip · no automated analysis",
    35,
    519,
  );
  const marker = canvas(44, 44);
  const p = marker.getContext("2d");
  p.fillStyle = "#ffffff";
  p.beginPath();
  p.arc(22, 22, 21, 0, Math.PI * 2);
  p.fill();
  p.fillStyle = "#00a878";
  p.beginPath();
  p.arc(22, 22, 17, 0, Math.PI * 2);
  p.fill();
  p.fillStyle = "#fff";
  p.font = "bold 17px Arial";
  p.textAlign = "center";
  p.fillText("P", 22, 28);
  const ball = canvas(22, 22);
  const b = ball.getContext("2d");
  b.fillStyle = "#fff";
  b.beginPath();
  b.arc(11, 11, 10, 0, Math.PI * 2);
  b.fill();
  b.strokeStyle = "#183328";
  b.lineWidth = 2;
  b.stroke();
  b.fillStyle = "#183328";
  b.fillRect(8, 8, 6, 6);
  return {
    field: field.toDataURL("image/png").split(",")[1],
    marker: marker.toDataURL("image/png").split(",")[1],
    ball: ball.toDataURL("image/png").split(",")[1],
  };
});
await browser.close();
for (const [name, data] of Object.entries(layers))
  await writeFile(`${directory}/${name}.png`, Buffer.from(data, "base64"));
const filters =
  "[1:v]split=4[p1][p2][p3][p4];[0:v][p1]overlay=200:210[a];[a][p2]overlay=440:340[b];[b][p3]overlay=690:210[c];[c][p4]overlay=440:150[d];[d][2:v]overlay=x='450+240*sin(2*PI*t/8)':y='255+80*cos(2*PI*t/8)'[out]";
const result = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-loop",
    "1",
    "-i",
    `${directory}/field.png`,
    "-loop",
    "1",
    "-i",
    `${directory}/marker.png`,
    "-loop",
    "1",
    "-i",
    `${directory}/ball.png`,
    "-filter_complex",
    filters,
    "-map",
    "[out]",
    "-t",
    "32",
    "-r",
    "24",
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-crf",
    "24",
    `${directory}/receiving-practice.mp4`,
  ],
  { encoding: "utf8", windowsHide: true },
);
if (result.status !== 0) throw new Error(result.stderr);
console.log("Created 32-second fictional practice animation and poster.");
