// 제안서·회사소개서 내용.
// 표준 블록(회사 소개, 경쟁력, 레퍼런스, 서비스, 수행 방법, 상품)은 여기서 한 번 작성하고 모든 문서가 같이 씁니다.
// 맞춤 블록(고객 현황~다음 단계)은 문서마다 저장되고, AI 초안은 대표님이 확인해야 발송할 수 있습니다.
import { projects, type Project } from "./site/portfolio";
import { services } from "./site/services";

export const SITE_URL = "https://dotmate.co.kr";
export const CONTACT = { email: "dotmate@dotmate.co.kr", bizNo: "328-31-00498", web: "dotmate.co.kr" };

// ---------- 맞춤 블록 ----------

export type Blocks = {
  cover?: { title: string; subtitle: string };
  situation?: string[];
  problems?: { problem: string; solution: string }[];
  areas?: { title: string; body: string }[];
  beforeAfter?: { before: string; after: string }[];
  roi?: { items: { label: string; value: string }[]; note: string };
  plan?: { phase: string; period: string; body: string }[];
  cost?: { items: { item: string; amount: string; note: string }[]; note: string };
  nextStep?: string[];
};
export type BlockKey = keyof Blocks;

export const BLOCKS: { key: BlockKey; label: string }[] = [
  { key: "cover", label: "표지" },
  { key: "situation", label: "고객 현황" },
  { key: "problems", label: "문제와 해법" },
  { key: "areas", label: "AX 적용 영역" },
  { key: "beforeAfter", label: "도입 전후" },
  { key: "roi", label: "기대 효과" },
  { key: "plan", label: "추진 방안" },
  { key: "cost", label: "예상 비용" },
  { key: "nextStep", label: "다음 단계" },
];

export type Proposal = {
  id: string;
  kind: "mini" | "intro";
  companyId: string;
  companyName: string;
  industry?: string;
  title: string;
  blocks: Blocks;
  flags: Partial<Record<BlockKey, true>>;
  status: "draft" | "sent" | "closed";
  code?: string;
  sentAt?: string;
  expiresAt?: string;
  views: number;
  firstViewedAt?: string;
  lastViewedAt?: string;
  aiModel?: string;
  aiAt?: string;
  createdAt: string;
  updatedAt: string;
};
export type ProposalView = { at: string; device?: string };
export type PublicProposal = Pick<Proposal, "kind" | "title" | "companyName" | "industry" | "blocks" | "sentAt" | "expiresAt">;

export const STATUS_LABEL: Record<Proposal["status"], string> = { draft: "작성 중", sent: "발송됨", closed: "닫힘" };

// ---------- 산업 템플릿 (전략 문서 04장) ----------

export type Template = {
  key: string;
  name: string;
  title: string; // 제안서 제목
  audience: string[]; // 접촉 대상
  services: string[]; // 연결 서비스 slug
  references: string[]; // 우선 보여줄 포트폴리오 slug
  pairs: { problem: string; solution: string }[];
  areas: { title: string; body: string }[];
};

const COMMON: Template = {
  key: "common",
  name: "공통 AX",
  title: "반복 업무를 줄이고 매출 업무에 집중하는 AI 전환(AX) 제안",
  audience: ["대표", "운영 총괄", "IT 담당자"],
  services: ["erp", "web"],
  references: ["matchum", "nongbujangteo", "alion"],
  pairs: [
    { problem: "같은 자료를 여러 시스템과 엑셀에 반복해서 입력합니다.", solution: "한 번 입력한 정보가 필요한 곳으로 자동으로 이어지게 업무 흐름을 다시 짭니다." },
    { problem: "고객 문의 답변이 담당자 근무 시간에 묶여 있습니다.", solution: "AI 상담이 자주 묻는 질문에 먼저 답하고, 필요한 건만 담당자에게 넘깁니다." },
    { problem: "보고서와 현황 집계에 매주 몇 시간씩 씁니다.", solution: "데이터를 모아 요약 보고서를 자동으로 만들고, 이상 징후만 알려줍니다." },
    { problem: "업무 노하우가 사람에게만 있어 담당자가 바뀌면 흔들립니다.", solution: "사내 문서와 처리 기록을 AI가 찾아 답하는 사내 지식 도우미를 둡니다." },
    { problem: "기존 시스템이 오래되어 고치기 어렵고 비용이 큽니다.", solution: "핵심 업무부터 작게 다시 만들고(PoC), 효과를 확인한 뒤 넓힙니다." },
  ],
  areas: [
    { title: "AI 상담·응대", body: "문의 분류와 1차 답변을 AI가 맡고 담당자는 판단이 필요한 일만 처리합니다." },
    { title: "업무 자동화 에이전트", body: "입력, 집계, 알림처럼 규칙이 있는 반복 업무를 에이전트가 처리합니다." },
    { title: "데이터 요약·보고", body: "흩어진 데이터를 모아 매일·매주 필요한 숫자를 자동으로 정리합니다." },
  ],
};

export const TEMPLATES: Template[] = [
  COMMON,
  {
    key: "beauty",
    name: "뷰티",
    title: "글로벌 뷰티 브랜드 경쟁력 강화를 위한 AI 커머스 플랫폼 전환 제안",
    audience: ["대표", "이커머스 사업부장", "해외사업 담당자"],
    services: ["commerce"],
    references: ["matchum", "kyde"],
    pairs: [
      { problem: "상품 추천이 베스트셀러 목록에 머물러 고객 피부와 고민에 맞지 않습니다.", solution: "고객이 피부 상태와 고민을 말하면 AI가 맞는 루틴과 이유를 설명하는 대화형 추천을 둡니다." },
      { problem: "해외 고객 문의를 소수 인원이 영어로만 응대해 답이 늦습니다.", solution: "다국어 AI 상담이 성분, 배송, 사용법 질문에 24시간 먼저 답합니다." },
      { problem: "신제품마다 상세페이지와 홍보 문구를 사람이 하나씩 만듭니다.", solution: "상품 정보를 넣으면 AI가 상세 콘텐츠, 검색 문구, 홍보 문안을 초안으로 만듭니다." },
      { problem: "임대형 쇼핑몰이나 해외 플랫폼 수수료와 기능 제약이 커지고 있습니다.", solution: "결제, 배송, 회원을 직접 운영하는 자체 글로벌 몰로 옮겨 수수료와 제약을 줄입니다." },
      { problem: "주문, 수출 신고, 배송 접수를 사람이 엑셀로 옮깁니다.", solution: "주문부터 수출 신고, 배송사 접수까지 이어 처리하는 주문·배송 에이전트를 둡니다." },
    ],
    areas: [
      { title: "AI 뷰티 상담·추천", body: "피부 타입, 고민, 성분 선호를 대화로 파악해 상품과 루틴을 추천합니다." },
      { title: "상품·콘텐츠 에이전트", body: "상세페이지, 검색 문구, SNS 문안을 브랜드 톤에 맞춰 초안으로 만듭니다." },
      { title: "글로벌 주문·배송 자동화", body: "국가별 배송 정책과 수출 서류를 시스템이 처리합니다." },
    ],
  },
  {
    key: "commerce",
    name: "이커머스·유통",
    title: "운영 인력은 그대로, 매출 업무에 집중하는 AI 커머스 전환 제안",
    audience: ["대표", "이커머스 팀장", "MD·CS 책임자"],
    services: ["commerce", "erp"],
    references: ["matchum", "kyde", "nongbujangteo"],
    pairs: [
      { problem: "상품 등록과 상세페이지 제작에 상품당 반나절이 걸립니다.", solution: "상품 정보와 사진을 넣으면 AI가 상세페이지와 검색 문구 초안을 만듭니다." },
      { problem: "모든 고객이 같은 첫 화면을 봅니다.", solution: "구매·탐색 기록으로 고객마다 다른 상품을 보여주는 추천을 붙입니다." },
      { problem: "CS 문의의 대부분이 배송, 교환, 재고처럼 같은 질문입니다.", solution: "주문 정보와 연결된 AI 상담이 먼저 답하고 예외만 사람에게 넘깁니다." },
      { problem: "여러 판매 채널의 재고와 주문을 수작업으로 맞춥니다.", solution: "채널 주문과 재고를 한곳에 모아 자동으로 맞추고 품절 위험을 알려줍니다." },
      { problem: "매출, 광고, 재고 보고서를 매주 엑셀로 만듭니다.", solution: "필요한 숫자를 자동 집계해 요약과 함께 보내는 보고 에이전트를 둡니다." },
    ],
    areas: [
      { title: "AI 상품 등록", body: "상세페이지, 옵션, 검색 문구를 AI가 초안으로 만들고 담당자는 검수만 합니다." },
      { title: "개인화 추천·AI 상담", body: "고객 행동에 맞춘 추천과 주문 정보 기반 상담으로 전환율과 CS 부담을 함께 개선합니다." },
      { title: "주문·재고 통합 관리", body: "채널별 주문과 재고를 한 화면에서 관리하고 반복 처리는 자동화합니다." },
    ],
  },
  {
    key: "manufacturing",
    name: "제조·수출",
    title: "견적부터 수출 서류까지, 영업·생산 사무를 줄이는 AI 업무 시스템 제안",
    audience: ["대표", "영업·해외영업 팀장", "생산관리 책임자"],
    services: ["erp", "web"],
    references: ["nongbujangteo", "alion", "matchum"],
    pairs: [
      { problem: "해외 바이어 문의와 견적 요청에 답하는 데 며칠씩 걸립니다.", solution: "제품 사양과 단가표를 학습한 AI가 다국어 문의에 답하고 견적 초안을 만듭니다." },
      { problem: "주문, 생산, 출하 정보가 ERP와 엑셀, 메신저에 흩어져 있습니다.", solution: "주문부터 출하까지 한 흐름으로 이어지는 업무 시스템과 현황 화면을 만듭니다." },
      { problem: "수출 서류(인보이스, 패킹리스트 등)를 매번 손으로 작성합니다.", solution: "주문 정보로 수출 서류 초안을 자동으로 만들고 담당자는 확인만 합니다." },
      { problem: "영문 홈페이지와 카탈로그가 오래되어 문의로 이어지지 않습니다.", solution: "제품 검색과 문의가 쉬운 다국어 사이트로 바꾸고 AI 검색 노출(GEO)을 준비합니다." },
      { problem: "품질·설비 기록이 종이와 엑셀에 남아 분석이 어렵습니다.", solution: "기록을 디지털로 모으고 AI가 이상 패턴과 반복 불량을 요약합니다." },
    ],
    areas: [
      { title: "AI 바이어 응대·견적", body: "다국어 문의 응대와 견적 초안을 AI가 맡아 응답 시간을 줄입니다." },
      { title: "주문·생산·출하 연결", body: "흩어진 정보를 한 흐름으로 묶어 누가 무엇을 해야 하는지 바로 보이게 합니다." },
      { title: "수출 서류 자동화", body: "반복되는 서류를 주문 데이터로 자동 작성합니다." },
    ],
  },
  {
    key: "franchise",
    name: "프랜차이즈",
    title: "본사와 가맹점의 반복 업무를 줄이는 AI 운영 플랫폼 제안",
    audience: ["대표", "운영본부장", "가맹 관리 팀장"],
    services: ["erp", "app"],
    references: ["alion", "nongbujangteo"],
    pairs: [
      { problem: "가맹점 문의(발주, 매뉴얼, 정책)가 본사 담당자에게 몰립니다.", solution: "매뉴얼과 공지를 학습한 AI 도우미가 가맹점 질문에 먼저 답합니다." },
      { problem: "지점별 매출, 발주, 재고를 취합하는 데 시간이 걸립니다.", solution: "지점 데이터를 자동으로 모아 본사 대시보드와 이상 알림을 만듭니다." },
      { problem: "점검표와 교육 자료가 종이와 메신저로 돌고 있습니다.", solution: "모바일 점검·교육 앱으로 기록을 남기고 미이행 지점을 자동으로 알려줍니다." },
      { problem: "고객 리뷰와 불만이 지점별로 흩어져 대응이 늦습니다.", solution: "리뷰를 모아 AI가 유형별로 요약하고 대응이 필요한 건을 바로 알립니다." },
    ],
    areas: [
      { title: "가맹점 AI 도우미", body: "매뉴얼, 정책, 발주 질문에 24시간 답합니다." },
      { title: "다지점 운영 대시보드", body: "지점별 숫자를 자동으로 모으고 이상 지점을 먼저 보여줍니다." },
      { title: "점검·교육 앱", body: "현장 점검과 교육 이수를 모바일로 기록하고 관리합니다." },
    ],
  },
  {
    key: "space",
    name: "공간 운영",
    title: "예약부터 정산까지, 공간 운영 업무를 자동화하는 AI 플랫폼 제안",
    audience: ["대표", "운영 총괄", "고객 경험(CX) 책임자"],
    services: ["web", "app", "erp"],
    references: ["alion", "nongbujangteo"],
    pairs: [
      { problem: "예약, 입주, 계약 문의를 담당자가 전화와 메신저로 하나씩 응대합니다.", solution: "AI 상담이 공간, 가격, 가능 일정 문의에 먼저 답하고 예약까지 이어줍니다." },
      { problem: "입·퇴실, 출입, 시설 이용 기록이 여러 시스템에 나뉘어 있습니다.", solution: "출입과 이용 기록을 한 시스템에 모으고 자동 알림을 보냅니다." },
      { problem: "지점이 늘수록 정산과 계약 관리가 엑셀로 복잡해집니다.", solution: "계약, 청구, 정산을 자동으로 이어 처리하는 운영 시스템을 만듭니다." },
      { problem: "웹사이트가 오래되어 공간 정보와 예약이 따로 놉니다.", solution: "지점과 공간 정보, 예약이 연결된 사이트로 다시 만들고 AI 검색 노출을 준비합니다." },
    ],
    areas: [
      { title: "AI 예약·입주 상담", body: "문의부터 예약까지 AI가 먼저 처리합니다." },
      { title: "출입·이용 관리", body: "입·퇴실과 시설 이용을 기록하고 자동으로 알립니다." },
      { title: "계약·정산 자동화", body: "지점별 계약과 청구, 정산을 한곳에서 처리합니다." },
    ],
  },
];

// 기업 산업 → 템플릿
const BY_INDUSTRY: Record<string, string> = {
  "화장품·뷰티": "beauty",
  "이커머스·유통": "commerce",
  "B2B 제조·수출": "manufacturing",
  "프랜차이즈·다지점": "franchise",
  "공유오피스·공간 운영": "space",
};
export const templateFor = (industry?: string) => TEMPLATES.find((t) => t.key === BY_INDUSTRY[industry || ""]) || COMMON;

// 템플릿만으로 채운 미니 제안서 초안 (AI를 쓰지 않을 때 시작점). 고객 사실이 없으니 현황 칸은 비워 둡니다.
export function blankMini(companyName: string, t: Template): Blocks {
  return {
    cover: { title: t.title, subtitle: `${companyName} 맞춤 AX 미니 제안` },
    situation: [],
    problems: t.pairs.slice(0, 3),
    areas: t.areas,
    beforeAfter: t.pairs.slice(0, 3).map((p) => ({ before: p.problem, after: p.solution })),
    roi: { items: [], note: "정확한 효과는 무료 AX 진단에서 현재 업무량을 확인한 뒤 계산해 드립니다." },
    plan: [
      { phase: "무료 AX 진단", period: "1주", body: "현재 시스템과 업무를 살펴보고 AI로 바꿀 곳 3~5개를 정리합니다." },
      { phase: "AX PoC", period: "4~8주", body: "효과가 가장 큰 업무 하나를 작게 만들어 실제 숫자로 확인합니다." },
      { phase: "AX 플랫폼 구축", period: "협의", body: "검증된 기능을 중심으로 시스템을 넓히고 운영에 붙입니다." },
    ],
    cost: {
      items: [
        { item: "무료 AX 진단", amount: "0원", note: "" },
        { item: "AX PoC", amount: "300만~1,000만 원", note: "범위에 따라 달라집니다." },
        { item: "AX 플랫폼 구축", amount: "협의", note: "진단 후 정밀 견적을 드립니다." },
      ],
      note: "부가세 별도. 정밀 견적은 진단 후 드립니다.",
    },
    nextStep: ["30분 화상 미팅으로 현재 업무와 시스템을 들려주세요.", "무료 AX 진단 결과를 1주 안에 정리해 드립니다."],
  };
}

export const blankIntro = (companyName: string): Blocks => ({
  cover: { title: "낡은 시스템을 AI 시스템으로", subtitle: "닷메이트 회사소개서 · AI 전환(AX) 개발 회사" },
});

// ---------- 표준 블록 ----------

export const ABOUT = {
  slogan: "낡은 시스템을 AI 시스템으로",
  intro:
    "닷메이트는 2017년부터 웹, 앱, 쇼핑몰, 사내 시스템을 만들어 온 개발 회사입니다. 지금은 중소기업의 쇼핑몰, ERP, 앱, 홈페이지를 AI가 일하는 시스템으로 다시 만드는 AI 전환(AX)을 합니다.",
  dxToAx: [
    { title: "DX", body: "종이와 엑셀을 시스템으로 옮겼습니다. 하지만 입력, 확인, 응대는 여전히 사람이 합니다." },
    { title: "AX", body: "시스템 안에서 AI가 입력, 응대, 집계, 보고를 맡습니다. 사람은 판단과 고객 관계에 집중합니다." },
  ],
  strengths: [
    { title: "2017년부터 만들어 온 개발 회사", body: "기획, 디자인, 개발, 운영을 한 팀이 끝까지 맡습니다. AI 기능만 붙이고 떠나지 않습니다." },
    { title: "작게 검증하고 넓힙니다", body: "효과가 큰 업무 하나로 PoC를 먼저 해 숫자로 확인한 뒤 투자를 결정하실 수 있습니다." },
    { title: "AI로 개발도 빠르게", body: "설계, 코드, 테스트에 AI 에이전트를 써서 12개월 예상 프로젝트를 2개월에 출시한 경험이 있습니다." },
    { title: "운영까지 책임", body: "MBC 14F 플랫폼은 개발 후 3년째 운영하고 있습니다. 만든 뒤의 개선과 장애 대응까지 맡습니다." },
  ],
};

// 홈페이지 포트폴리오에 없는 레퍼런스 (공개 허락 받음)
export const EXTRA_REFERENCES = [
  { client: "MBC", title: "MBC 14F 플랫폼 개발과 3년 운영", body: "MBC 14F 플랫폼을 개발하고 3년째 운영과 고도화를 맡고 있습니다." },
  { client: "패스트파이브", title: "패스트파이브 웹사이트 리뉴얼", body: "공유오피스 패스트파이브의 웹사이트를 리뉴얼했습니다." },
];

export const PROCESS = [
  { step: "무료 AX 진단", body: "현재 시스템과 업무를 보고 AI로 바꿀 곳 3~5개를 정리합니다.", period: "1주", price: "0원" },
  { step: "정밀 컨설팅", body: "업무 흐름, 데이터, 효과를 자세히 분석하고 실행 계획을 만듭니다.", period: "2~4주", price: "100만~300만 원" },
  { step: "AX PoC", body: "효과가 가장 큰 업무 하나를 작게 만들어 실제 숫자로 확인합니다.", period: "4~8주", price: "300만~1,000만 원" },
  { step: "AX 플랫폼 구축", body: "검증된 기능을 중심으로 시스템을 다시 만들고 운영에 붙입니다.", period: "2~6개월", price: "1,500만 원~1억 원 이상" },
  { step: "운영·고도화", body: "운영하면서 AI 기능을 계속 개선하고 장애에 대응합니다.", period: "월 단위", price: "월 50만~300만 원" },
];

export { services };

export function referencesFor(t: Template): Project[] {
  const order = [...t.references, ...projects.map((p) => p.slug)];
  const seen = new Set<string>();
  return order
    .filter((s) => !seen.has(s) && seen.add(s))
    .map((s) => projects.find((p) => p.slug === s))
    .filter((p): p is Project => !!p);
}

export const imageUrl = (p: Project) => (p.image ? SITE_URL + p.image : undefined);

// AI에 보낼 템플릿 요약 (전체 표준 블록은 보내지 않아 비용을 줄입니다)
export const templateForAi = (t: Template) => ({
  name: t.name,
  title: t.title,
  audience: t.audience,
  pairs: t.pairs,
  areas: t.areas,
  services: services.filter((s) => t.services.includes(s.slug)).map((s) => ({ name: s.system, now: s.now, after: s.after })),
  products: PROCESS.map((p) => `${p.step} (${p.period}, ${p.price})`),
});
