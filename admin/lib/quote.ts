// 견적 계산. 관리자 견적 화면과 고객용 견적 링크(/q/)가 같은 계산을 씁니다.
// 기준가 = 직접인건비(직무별 일평균임금 × 투입 일수) + 제경비 + 기술료 + 직접경비 - 할인
// 지급 방식은 견적마다 고릅니다: 일시불, 구독형, 성과 연동형(거래액 수수료), 혼합형.

// 2026년 적용 SW기술자 평균임금 (한국SW산업협회 2025.12 공표, 일평균임금 = 월평균임금 / 20.5일)
export const RATES_2026 = [
  { role: "IT기획자", daily: 578206 },
  { role: "IT컨설턴트", daily: 522340 },
  { role: "업무분석가", daily: 475154 },
  { role: "데이터분석가", daily: 414600 },
  { role: "IT PM", daily: 492039 },
  { role: "IT아키텍트", daily: 541621 },
  { role: "UI/UX기획·개발자", daily: 336666 },
  { role: "UI/UX디자이너", daily: 251671 },
  { role: "응용SW개발자", daily: 378250 },
  { role: "시스템SW개발자", daily: 284888 },
  { role: "정보시스템운용자", daily: 519469 },
  { role: "IT지원기술자", daily: 252196 },
  { role: "IT마케터", daily: 575293 },
  { role: "IT품질관리자", daily: 538638 },
  { role: "IT테스터", daily: 197714 },
  { role: "IT감리", daily: 572934 },
  { role: "정보보안전문가", daily: 507887 },
];

export type Rate = { role: string; daily: number };
export type QuoteSettings = { rates: Rate[]; overheadPct: number; techFeePct: number; rateYear: string; validDays: number };

// SW사업 대가산정 가이드의 통상 범위(제경비 110~120%, 기술료 20~40%) 중 낮은 쪽을 기본값으로 둡니다.
export const DEFAULT_SETTINGS: QuoteSettings = { rates: RATES_2026, overheadPct: 110, techFeePct: 20, rateYear: "2026", validDays: 14 };

export type QuoteItem = {
  kind: "labor" | "expense";
  phase: string;
  name: string;
  role: string;
  days: number;
  unit: number; // 인건비: 일 단가, 경비: 단가
  qty: number; // 경비 수량
  amount: number;
  note: string;
};

export type PayType = "lump" | "subscription" | "revenue" | "hybrid";
export type Payment = {
  type: PayType;
  months: number;
  split: { label: string; pct: number }[]; // 일시불 지급 비율
  upfront: number; // 구독·성과·혼합: 처음 받는 금액
  monthly: number; // 구독형 월 이용료
  rate: number; // 성과 연동 수수료율 %
  minMonthly: number; // 월 최저 보장액
  cap: number; // 총 수수료 상한
  expectedSales: number; // 고객 예상 월 거래액
  premium: number; // 나눠 받는 위험 프리미엄 배수
  monthlyOps: number; // 일시불일 때 월 운영·유지보수비
  showAlternatives: boolean; // 고객 화면에 다른 지급 방식 비교 보여주기
  note: string;
};

export type Totals = {
  labor: number;
  overhead: number;
  techFee: number;
  expense: number;
  subtotal: number;
  discount: number;
  supply: number;
  vat: number;
  total: number;
};

export type Quote = {
  id: string;
  rootId: string;
  version: number;
  companyId: string;
  companyName: string;
  industry?: string;
  title: string;
  items: QuoteItem[];
  overheadPct: number;
  techFeePct: number;
  discount: number;
  totals: Totals;
  payment: Payment;
  scope: string;
  terms: string;
  costMemo: { labor: number; outsource: number; api: number; other: number; note: string };
  validDays: number;
  status: "draft" | "sent" | "approved" | "superseded" | "closed";
  code?: string;
  sentAt?: string;
  expiresAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  requests?: { at: string; name: string; text: string }[];
  views: number;
  firstViewedAt?: string;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
};
export type PublicQuote = Pick<
  Quote,
  | "title"
  | "version"
  | "companyName"
  | "industry"
  | "items"
  | "overheadPct"
  | "techFeePct"
  | "discount"
  | "totals"
  | "payment"
  | "scope"
  | "terms"
  | "status"
  | "sentAt"
  | "expiresAt"
  | "approvedAt"
  | "approvedBy"
>;

export const QUOTE_STATUS: Record<Quote["status"], string> = {
  draft: "작성 중",
  sent: "발송됨",
  approved: "승인됨",
  superseded: "수정본으로 대체",
  closed: "닫힘",
};

export const PAY_LABEL: Record<PayType, string> = {
  lump: "일시불",
  subscription: "구독형",
  revenue: "성과 연동형",
  hybrid: "혼합형",
};
export const PAY_DESC: Record<PayType, string> = {
  lump: "구축비를 단계별로 나눠 지급합니다. 운영은 별도 월 계약입니다.",
  subscription: "처음 비용을 낮추고, 구축과 운영을 기간 동안 월 이용료로 나눠 냅니다.",
  revenue: "구축비 부담 없이 시작하고, 새 시스템에서 발생한 거래액의 일정 비율을 월 수수료로 냅니다.",
  hybrid: "착수금 일부와 거래액 수수료를 함께 냅니다. 처음 비용과 월 부담을 모두 낮춥니다.",
};

const won10k = (x: number) => Math.round(x / 10000) * 10000; // 만 원 단위
export const krw = (x: number) => `${Math.round(x).toLocaleString("ko-KR")}원`;
export const eokMan = (x: number) => {
  const v = Math.round(x / 10000);
  if (v >= 10000) {
    const eok = Math.floor(v / 10000);
    const man = v % 10000;
    return `${eok}억${man ? ` ${man.toLocaleString("ko-KR")}만` : ""} 원`;
  }
  return `${v.toLocaleString("ko-KR")}만 원`;
};

// 산업별 기본 지급 방식: 매출이 시스템에 찍히는 B2C는 성과 연동, B2B 제조는 일시불, 다지점은 구독
export function defaultPayType(industry?: string): PayType {
  if (industry === "화장품·뷰티" || industry === "이커머스·유통") return "hybrid";
  if (industry === "프랜차이즈·다지점" || industry === "공유오피스·공간 운영") return "subscription";
  return "lump";
}

export function defaultPayment(industry?: string): Payment {
  return {
    type: defaultPayType(industry),
    months: 24,
    split: [
      { label: "착수금", pct: 30 },
      { label: "중도금", pct: 40 },
      { label: "잔금", pct: 30 },
    ],
    upfront: 0,
    monthly: 0,
    rate: 0,
    minMonthly: 0,
    cap: 0,
    expectedSales: 0,
    premium: 1.4,
    monthlyOps: 0,
    showAlternatives: true,
    note: "",
  };
}

export function itemAmount(i: QuoteItem) {
  return i.kind === "labor" ? Math.round(i.unit * i.days) : Math.round(i.unit * (i.qty || 1));
}

export function calcTotals(items: QuoteItem[], overheadPct: number, techFeePct: number, discount: number): Totals {
  const labor = items.filter((i) => i.kind === "labor").reduce((a, i) => a + itemAmount(i), 0);
  const overhead = Math.round((labor * overheadPct) / 100);
  const techFee = Math.round(((labor + overhead) * techFeePct) / 100);
  const expense = items.filter((i) => i.kind === "expense").reduce((a, i) => a + itemAmount(i), 0);
  const subtotal = labor + overhead + techFee + expense;
  const supply = Math.max(0, Math.floor((subtotal - discount) / 10000) * 10000); // 공급가액은 만 원 미만 절사
  const vat = Math.round(supply * 0.1);
  return { labor, overhead, techFee, expense, subtotal, discount: subtotal - supply, supply, vat, total: supply + vat }; // 할인에는 만 원 미만 절사분이 포함됩니다
}

// 지급 방식별 금액 (공급가액 기준, 부가세 별도)
export type PayPlan = {
  type: PayType;
  upfront: number; // 처음 내는 돈
  monthly: number; // 월 부담 (성과형은 예상 매출 기준 예상액)
  months: number;
  total: number; // 기간 전체 예상 총액
  rate?: number;
  minMonthly?: number;
  cap?: number;
  schedule?: { label: string; amount: number }[];
};

// 성과형 수수료율 제안: (기준가 × 프리미엄 - 처음 받는 금액) ÷ (기간 × 예상 월 거래액)
export function suggestRate(supply: number, p: Payment, upfront: number) {
  if (!p.expectedSales) return 0;
  const r = ((supply * p.premium - upfront) / (p.months * p.expectedSales)) * 100;
  return Math.max(0.1, Math.round(r * 10) / 10);
}

export function planFor(type: PayType, supply: number, p: Payment): PayPlan {
  const months = p.months || 24;
  if (type === "lump") {
    const split = p.split.length ? p.split : defaultPayment().split;
    const schedule = split.map((s) => ({ label: s.label, amount: won10k((supply * s.pct) / 100) }));
    const diff = supply - schedule.reduce((a, s) => a + s.amount, 0);
    if (schedule.length) schedule[schedule.length - 1].amount += diff;
    return { type, upfront: schedule[0]?.amount || 0, monthly: p.monthlyOps, months, total: supply + p.monthlyOps * months, schedule };
  }
  if (type === "subscription") {
    const upfront = p.type === "subscription" && p.upfront ? p.upfront : won10k(supply * 0.2);
    const monthly = p.type === "subscription" && p.monthly ? p.monthly : won10k((supply * p.premium - upfront) / months);
    return { type, upfront, monthly, months, total: upfront + monthly * months };
  }
  const upfront = p.type === type && p.upfront ? p.upfront : type === "hybrid" ? won10k(supply * 0.3) : 0;
  const premium = type === "hybrid" ? Math.max(1, p.premium - 0.1) : p.premium;
  const rate = p.type === type && p.rate ? p.rate : suggestRate(supply, { ...p, premium }, upfront);
  const minMonthly = p.type === type && p.minMonthly ? p.minMonthly : won10k((supply * 0.4) / months);
  const cap = p.type === type && p.cap ? p.cap : won10k(supply * (premium + 0.6));
  const expectedFee = p.expectedSales ? Math.max(minMonthly, (p.expectedSales * rate) / 100) : minMonthly;
  const monthly = won10k(expectedFee);
  return { type, upfront, monthly, months, total: Math.min(upfront + monthly * months, upfront + cap), rate, minMonthly, cap };
}

// 새 견적을 시작할 때 쓰는 단계별 기본 구성 (투입 일수는 견적마다 고칩니다)
export const PRESETS: { key: string; label: string; items: { kind: "labor" | "expense"; phase: string; name: string; role?: string; days?: number; unit?: number; qty?: number }[] }[] = [
  {
    key: "consulting",
    label: "정밀 컨설팅",
    items: [
      { kind: "labor", phase: "정밀 컨설팅", name: "현행 업무·시스템 분석", role: "IT컨설턴트", days: 6 },
      { kind: "labor", phase: "정밀 컨설팅", name: "AX 적용 업무 설계", role: "업무분석가", days: 4 },
    ],
  },
  {
    key: "poc",
    label: "AX PoC",
    items: [
      { kind: "labor", phase: "AX PoC", name: "PoC 기획과 효과 측정 설계", role: "IT기획자", days: 4 },
      { kind: "labor", phase: "AX PoC", name: "화면 설계·디자인", role: "UI/UX디자이너", days: 4 },
      { kind: "labor", phase: "AX PoC", name: "AI 기능 개발과 연동", role: "응용SW개발자", days: 16 },
      { kind: "labor", phase: "AX PoC", name: "테스트", role: "IT테스터", days: 3 },
      { kind: "expense", phase: "AX PoC", name: "AI API 사용료 (PoC 기간)", unit: 300000, qty: 1 },
    ],
  },
  {
    key: "build",
    label: "AX 플랫폼 구축",
    items: [
      { kind: "labor", phase: "AX 플랫폼 구축", name: "사업 관리", role: "IT PM", days: 15 },
      { kind: "labor", phase: "AX 플랫폼 구축", name: "서비스 기획", role: "IT기획자", days: 15 },
      { kind: "labor", phase: "AX 플랫폼 구축", name: "UI/UX 디자인", role: "UI/UX디자이너", days: 20 },
      { kind: "labor", phase: "AX 플랫폼 구축", name: "프론트엔드·백엔드 개발", role: "응용SW개발자", days: 60 },
      { kind: "labor", phase: "AX 플랫폼 구축", name: "AI 에이전트 설계", role: "IT아키텍트", days: 10 },
      { kind: "labor", phase: "AX 플랫폼 구축", name: "통합 테스트", role: "IT테스터", days: 10 },
      { kind: "expense", phase: "AX 플랫폼 구축", name: "클라우드 서버 구성", unit: 500000, qty: 1 },
    ],
  },
];

export function presetItems(key: string, rates: Rate[]): QuoteItem[] {
  const p = PRESETS.find((x) => x.key === key);
  if (!p) return [];
  return p.items.map((i) => {
    const unit = i.kind === "labor" ? rates.find((r) => r.role === i.role)?.daily || 0 : i.unit || 0;
    const item: QuoteItem = { kind: i.kind, phase: i.phase, name: i.name, role: i.role || "", days: i.days || 0, unit, qty: i.qty || 1, amount: 0, note: "" };
    return { ...item, amount: itemAmount(item) };
  });
}

export const DEFAULT_TERMS = [
  "견적 금액은 부가세 별도입니다.",
  "개발 인건비는 한국SW산업협회가 공표한 2026년 SW기술자 평균임금을 기준으로 산정했습니다.",
  "AI API, 서버 등 사용량에 따라 달라지는 비용은 실제 사용량 기준으로 정산합니다.",
  "성과 연동형의 거래액은 이 프로젝트로 만든 시스템에서 결제가 완료된 금액(취소·환불 제외)을 기준으로 매월 정산합니다.",
  "세부 범위와 일정은 계약서에서 확정합니다.",
].join("\n");
