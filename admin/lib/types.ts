export const STAGES = ["발굴", "진단", "미니 제안", "미팅·데모", "PoC", "본계약·운영", "보류"] as const;
export type Stage = (typeof STAGES)[number];

export const INDUSTRIES = [
  "화장품·뷰티",
  "이커머스·유통",
  "B2B 제조·수출",
  "프랜차이즈·다지점",
  "공유오피스·공간 운영",
  "교육 서비스",
  "미디어·콘텐츠",
  "전문 서비스",
  "기타",
] as const;

// 전략 문서 03장 기업별 스코어링 (합계 100점)
export const SCORE_ITEMS = [
  { key: "legacy", label: "기존 시스템 노후화", max: 20 },
  { key: "aiFit", label: "AI 전환 가능 업무", max: 20 },
  { key: "budget", label: "투자 여력", max: 20 },
  { key: "reference", label: "레퍼런스 연관성", max: 20 },
  { key: "access", label: "의사결정권자 접근성", max: 10 },
  { key: "urgency", label: "개선 시급성", max: 10 },
] as const;
export type ScoreKey = (typeof SCORE_ITEMS)[number]["key"];

export const ACTIVITY_TYPES = ["메모", "전화", "메일", "미팅", "방문", "문의 접수"] as const;

// 전략 문서 10장 월간 영업 퍼널 목표
export const FUNNEL_TARGETS: Partial<Record<Stage, number>> = {
  발굴: 100,
  진단: 60,
  "미니 제안": 30,
  "미팅·데모": 10,
  PoC: 5,
  "본계약·운영": 2,
};

export type Company = {
  id: string;
  name: string;
  bizNo?: string;
  crno?: string;
  ceo?: string;
  founded?: string;
  address?: string;
  industry: string;
  region?: string;
  revenue?: string;
  employees?: string;
  website?: string;
  platform?: string;
  source?: string;
  memo?: string;
  tags?: string[];
  score: Partial<Record<ScoreKey, number>>;
  scoreTotal: number;
  grade: "" | "A" | "B" | "C";
  createdAt: string;
  updatedAt: string;
};

export type Contact = {
  id: string;
  companyId: string;
  name: string;
  title?: string;
  phone?: string;
  email?: string;
  consent?: boolean;
  optOut?: boolean;
  memo?: string;
};

export type Activity = { id: string; companyId: string; type: string; body: string; at: string; by?: string; createdAt: string };

export type Deal = {
  id: string;
  companyId: string;
  companyName?: string;
  title: string;
  stage: Stage;
  product?: string;
  amount?: number;
  nextAction?: string;
  nextDate?: string;
  lostReason?: string;
  createdAt: string;
  updatedAt: string;
};

// 전략 문서 07장 영업 상품
export const PRODUCTS = ["무료 AX 진단", "정밀 컨설팅", "AX PoC", "AX 플랫폼 구축", "운영·고도화"] as const;

export type AiScore = {
  companyId: string;
  score: Record<ScoreKey, number>;
  reasons: Record<ScoreKey, string>;
  total: number;
  summary: string;
  nextAction: string;
  missingInfo: string[];
  model: string;
  cost: number;
  at: string;
};

// 영업 준비 (웹 조사)
export type SalesPrep = {
  companyId: string;
  summary: string;
  website: string;
  platform: string;
  channels: { type: string; value: string; source: string }[];
  people: { name: string; title: string; source: string; note: string }[];
  findings: { issue: string; evidence: string; suggestion: string; source: string }[];
  outreach: { message: string; phone: string; followup3: string; followup7: string };
  notes: string;
  cost: number;
  searches: number;
  at: string;
};
