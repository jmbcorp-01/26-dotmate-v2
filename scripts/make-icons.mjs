// 파비콘과 앱 아이콘 PNG를 brand/*.svg, public/icon.svg에서 만듭니다.
// 실행: node scripts/make-icons.mjs  (Playwright가 설치된 환경에서)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, mkdirSync } from "node:fs";
mkdirSync("brand/out", { recursive: true });

const jobs = [
  ["public/icon.svg", 16, "brand/out/icon-16.png"],
  ["public/icon.svg", 32, "brand/out/icon-32.png"],
  ["public/icon.svg", 48, "brand/out/icon-48.png"],
  ["brand/icon-square.svg", 180, "public/apple-touch-icon.png"],
  ["public/icon.svg", 192, "public/icon-192.png"],
  ["public/icon.svg", 512, "public/icon-512.png"],
  ["brand/icon-maskable.svg", 512, "public/icon-maskable-512.png"],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [src, size, out] of jobs) {
  const svg = readFileSync(src, "utf8");
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}img{display:block;width:${size}px;height:${size}px}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}">`
  );
  await page.locator("img").screenshot({ path: out, omitBackground: true });
}
await browser.close();
