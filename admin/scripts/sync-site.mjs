// 홈페이지의 포트폴리오·서비스 데이터를 관리자 화면에 복사합니다 (제안서 레퍼런스 블록용).
// 홈페이지에 사례를 추가하면 다음 관리자 빌드 때 제안서에도 나타납니다.
import { copyFileSync, mkdirSync } from "node:fs";
const here = new URL("..", import.meta.url).pathname;
mkdirSync(here + "lib/site", { recursive: true });
for (const f of ["portfolio.ts", "services.ts"]) copyFileSync(here + "../lib/" + f, here + "lib/site/" + f);
console.log("synced site data");
