// AI 검색(ChatGPT, Perplexity, Claude 등)이 회사를 정확히 설명하도록 돕는 요약 문서 (/llms.txt)
// 서비스와 FAQ 데이터에서 만들어지므로 따로 고칠 필요가 없습니다.
import { projects } from "@/lib/portfolio";
import { services, plain } from "@/lib/services";
import { faqs } from "@/lib/faq";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const lines = [
    `# ${site.name} (${site.nameEn})`,
    "",
    `> ${site.description}`,
    "",
    "## 회사 정보",
    "",
    `- 회사명: ${site.name} (${site.nameEn}, 로고 표기 .mate)`,
    `- 사업자등록번호: ${site.businessNumber}`,
    `- 설립: ${site.foundingYear}년`,
    `- 문의: ${site.email}`,
    `- 웹사이트: ${site.url}/`,
    "- 서비스 지역: 대한민국",
    "- 하는 일: 중소기업의 기존 시스템(쇼핑몰, ERP, 앱, 홈페이지)을 AI 중심 시스템으로 다시 만드는 AX(AI Transformation) 전환. 진단, 설계, 구축, 운영을 한 팀이 맡습니다.",
    "",
    "## 서비스",
    "",
    ...services.map(
      (s) =>
        `- [.AX ${s.name} (${s.serviceType})](${site.url}/services/${s.slug}/): ${s.summary}. ${s.after.join(" ")} 대상: ${s.fit.join(", ")}.`
    ),
    "",
    "## 진행 방식",
    "",
    "1. 무료 .AX 진단: 지금 쓰는 시스템을 보고 AI로 바뀌는 업무 목록, 우선순위와 예상 비용, 정부 AX 지원사업 연계 가능 여부를 정리합니다.",
    "2. 전환 설계: 효과가 큰 업무부터 순서를 정하고, 쓰던 데이터는 그대로 옮겨옵니다.",
    "3. AI 시스템 구축: AI를 덧붙이지 않고 AI 중심 구조로 다시 만듭니다.",
    "4. 운영과 개선: 오픈 후 쌓이는 데이터로 AI를 계속 고칩니다.",
    "",
    "## 자주 묻는 질문",
    "",
    ...faqs.flatMap((f) => [`### ${f.q}`, "", f.a, ""]),
    "## 주요 페이지",
    "",
    `- [홈](${site.url}/): ${site.slogan}`,
    ...services.map((s) => `- [.AX ${s.name}](${site.url}/services/${s.slug}/): ${plain(s.question)}`),
    `- [무료 .AX 진단 신청](${site.url}/diagnosis/)`,
    `- [포트폴리오](${site.url}/portfolio/)`,
    ...projects.map((p) => `  - [${p.title}](${site.url}/portfolio/${p.slug}/): ${p.client}, ${p.category}, ${p.period}`),
    `- [개인정보 처리방침](${site.url}/privacy/)`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
