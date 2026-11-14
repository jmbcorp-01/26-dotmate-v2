// 페이지별 공유 이미지(1200x630)를 public/og/에 만듭니다.
// 실행: node scripts/make-og.mjs  (npm ci 후, Playwright가 설치된 환경에서)
// 문구를 바꾸면 이 스크립트를 다시 실행하고 결과 PNG를 함께 커밋하세요.
import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";

const { chromium } = createRequire(import.meta.url)("playwright");

const font = (w) =>
  readFileSync(`node_modules/pretendard/dist/web/static/woff2/Pretendard-${w}.woff2`).toString("base64");
const logo = readFileSync("public/logo-white.png").toString("base64");

// kicker: 위 작은 글씨, title: "|"에서 줄바꿈, sub: 아래 설명
const cards = [
  { file: "home", kicker: "dotmate .AX", title: "낡은 시스템을|AI 시스템으로.", sub: "쇼핑몰, ERP, 앱, 홈페이지를 AX로 다시 만듭니다." },
  { file: "commerce", kicker: ".AX 커머스", title: "상품 하나 올리는 데|반나절, 아직도요?", sub: "상품 등록부터 상담, 추천까지 AI가 맡는 쇼핑몰" },
  { file: "erp", kicker: ".AX ERP", title: "월말마다 엑셀과|씨름하고 있다면.", sub: "문서를 읽고 입력하고, 물으면 답하는 ERP" },
  { file: "app", kicker: ".AX 앱", title: "고객은 바뀌었는데|앱은 그대로입니다.", sub: "고객을 기억하고 먼저 말을 거는 앱" },
  { file: "web", kicker: ".AX 웹", title: "ChatGPT에 우리 회사를 물으면|뭐라고 답할까요?", sub: "AI 검색에 나오고, 24시간 문의를 받는 홈페이지" },
  { file: "diagnosis", kicker: "무료 .AX 진단", title: "지금 시스템을|알려주세요.", sub: "AI로 바뀌는 업무, 예상 비용, 정부 지원사업 연계 여부를 정리해 드립니다." },
  { file: "portfolio", kicker: "포트폴리오", title: "시스템을 만들어 온 팀이|AI로 다시 만듭니다.", sub: "쇼핑몰, ERP, 앱, 홈페이지 구축과 AX 전환 사례" },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const kickerHtml = (k) => esc(k).replace(/^(dotmate )?\.AX/, (m, p) => `${p ?? ""}<b class="dot">.</b>AX`);

const html = (c) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@font-face{font-family:P;font-weight:500;src:url(data:font/woff2;base64,${font("Medium")})}
@font-face{font-family:P;font-weight:800;src:url(data:font/woff2;base64,${font("ExtraBold")})}
html,body{margin:0}
body{width:1200px;height:630px;background:#000;color:#fff;font-family:P;box-sizing:border-box;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between;word-break:keep-all}
.logo{height:40px;width:auto;display:block}
.kicker{font-size:34px;font-weight:800;margin:0 0 22px;letter-spacing:-0.01em}
.dot{color:#D82E28;font-weight:800}
h1{font-size:76px;line-height:1.16;font-weight:800;margin:0;letter-spacing:-0.035em}
h1 span{display:block}
.sub{font-size:30px;color:#A1A1A6;margin:28px 0 0;font-weight:500;letter-spacing:-0.01em}
.foot{display:flex;justify-content:space-between;align-items:flex-end;font-size:24px;color:#6E6E73;font-weight:500}
</style></head><body>
<div><p class="kicker">${kickerHtml(c.kicker)}</p><h1>${c.title.split("|").map((l) => `<span>${esc(l)}</span>`).join("")}</h1><p class="sub">${esc(c.sub)}</p></div>
<div class="foot"><img class="logo" src="data:image/png;base64,${logo}" alt=""><span>dotmate.co.kr</span></div>
</body></html>`;

mkdirSync("public/og", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const c of cards) {
  await page.setContent(html(c), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/og/${c.file}.png` });
}
await browser.close();
