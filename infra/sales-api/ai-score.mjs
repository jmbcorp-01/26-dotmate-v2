// AI 점수 초안: 기업 정보와 최근 활동 기록을 보고 전략 문서 03장 6개 항목(합계 100점)에 점수와 근거를 매깁니다.
// 대표님이 확인하고 고치는 "초안"이라 기업 점수에 바로 쓰지 않고 따로 저장합니다.
import Anthropic from "@anthropic-ai/sdk";

export const AI_MODEL = "claude-opus-5-5";
// claude-opus-5-5 요금 (USD / 100만 토큰)
const PRICE_IN = 4;
const PRICE_OUT = 20;

const ITEMS = [
  ["legacy", 20, "기존 시스템 노후화", "홈페이지·쇼핑몰·사내 시스템이 오래됐거나 수작업·엑셀 의존이 클수록 높게"],
  ["aiFit", 20, "AI 전환 가능 업무", "상담·CS, 콘텐츠 제작, 상품 정보 관리, 재고·주문 처리, 보고서처럼 반복 업무가 많을수록 높게"],
  ["budget", 20, "투자 여력", "매출·직원 수·성장세로 볼 때 수천만 원대 프로젝트를 감당할 수 있을수록 높게"],
  ["reference", 20, "레퍼런스 연관성", "닷메이트 레퍼런스(MBC 14층 플랫폼 개발·3년 운영, 패스트파이브 웹사이트 리뉴얼)와 업종·과제가 비슷할수록 높게"],
  ["access", 10, "의사결정권자 접근성", "대표나 임원과 직접 연락이 닿았거나, 회사 규모가 작아 의사결정이 빠를수록 높게"],
  ["urgency", 10, "개선 시급성", "문의가 들어왔거나 리뉴얼·확장·채용 같은 변화 신호가 있을수록 높게"],
];

const SYSTEM = `당신은 AI 전환(AX) 컨설팅·개발 회사 닷메이트의 영업 분석가입니다.
닷메이트는 기업의 웹·플랫폼을 만들고 업무에 AI를 붙이는 일을 합니다. 주요 상품은 무료 AX 진단, 정밀 컨설팅, AX PoC, AX 플랫폼 구축, 운영·고도화입니다.

주어진 기업 정보와 영업 기록만 보고 아래 6개 항목에 점수를 매기세요. 합계는 100점입니다.
${ITEMS.map(([k, max, label, how]) => `- ${k} (${label}, 0~${max}점): ${how}`).join("\n")}

원칙:
- 근거는 한국어 한두 문장으로, 주어진 정보 중 무엇을 보고 판단했는지 쓰세요.
- 정보가 없어 판단하기 어려운 항목은 만점의 절반 근처로 두고, 근거에 "정보 부족"이라고 밝힌 뒤 missingInfo에 무엇을 확인하면 되는지 적으세요.
- 업종과 규모에서 일반적으로 추론한 내용은 "추정"이라고 표시하세요. 사실처럼 단정하지 마세요.
- nextAction에는 이 회사에 영업 담당자가 다음에 할 일 한 가지를 구체적으로 쓰세요.`;

const scoreProp = { type: "object", properties: { score: { type: "integer" }, reason: { type: "string" } }, required: ["score", "reason"], additionalProperties: false };
const SCHEMA = {
  type: "object",
  properties: {
    scores: {
      type: "object",
      properties: Object.fromEntries(ITEMS.map(([k]) => [k, scoreProp])),
      required: ITEMS.map(([k]) => k),
      additionalProperties: false,
    },
    summary: { type: "string" },
    nextAction: { type: "string" },
    missingInfo: { type: "array", items: { type: "string" } },
  },
  required: ["scores", "summary", "nextAction", "missingInfo"],
  additionalProperties: false,
};

function describe(company, activities, contacts) {
  const f = (label, v) => (v ? `- ${label}: ${v}` : null);
  const lines = [
    `회사명: ${company.name}`,
    f("산업", company.industry),
    f("지역", company.region),
    f("주소", company.address),
    f("대표자", company.ceo),
    f("설립일", company.founded),
    f("매출", company.revenue),
    f("인원", company.employees),
    f("홈페이지", company.website),
    f("사용 플랫폼", company.platform),
    f("발굴 출처", company.source),
    f("태그", company.tags?.join(", ")),
    company.memo ? `메모:\n${company.memo}` : null,
    contacts.length ? `담당자: ${contacts.map((c) => [c.name, c.title].filter(Boolean).join(" ")).join(", ")}` : null,
    activities.length
      ? `최근 영업 기록 (최신순):\n${activities
          .slice(0, 10)
          .map((a) => `- ${a.at} [${a.type}] ${String(a.body).slice(0, 600)}`)
          .join("\n")}`
      : "영업 기록: 없음",
  ];
  return lines.filter(Boolean).join("\n");
}

export const costUsd = (usage) => ((usage?.input_tokens || 0) * PRICE_IN + (usage?.output_tokens || 0) * PRICE_OUT) / 1e6;

export class AiError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

let client = null;

export async function scoreCompany({ apiKey, company, activities = [], contacts = [] }) {
  if (!apiKey) throw new AiError("ai_key_missing");
  client ??= new Anthropic({ apiKey, timeout: 24_000, maxRetries: 0 });
  let res;
  try {
    res = await client.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: describe(company, activities, contacts) }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new AiError("ai_key_invalid");
    if (e instanceof Anthropic.RateLimitError) throw new AiError("ai_rate_limited");
    if (e instanceof Anthropic.APIConnectionError) throw new AiError("ai_unreachable");
    if (e instanceof Anthropic.APIError) {
      console.error("anthropic", e.status, e.message?.slice(0, 300));
      throw new AiError(e.status === 400 && /credit|billing/i.test(e.message || "") ? "ai_billing" : "ai_error");
    }
    throw e;
  }
  const cost = costUsd(res.usage);
  if (res.stop_reason === "refusal") throw Object.assign(new AiError("ai_refused"), { cost });
  const text = res.content.find((b) => b.type === "text")?.text;
  let out;
  try {
    out = JSON.parse(text || "");
  } catch {
    console.error("anthropic bad json", res.stop_reason);
    throw Object.assign(new AiError("ai_error"), { cost });
  }
  const score = {};
  const reasons = {};
  for (const [k, max] of ITEMS) {
    const s = out.scores?.[k];
    score[k] = Math.max(0, Math.min(max, Math.round(Number(s?.score) || 0)));
    reasons[k] = String(s?.reason || "").slice(0, 400);
  }
  return {
    score,
    reasons,
    total: Object.values(score).reduce((a, b) => a + b, 0),
    summary: String(out.summary || "").slice(0, 600),
    nextAction: String(out.nextAction || "").slice(0, 300),
    missingInfo: (Array.isArray(out.missingInfo) ? out.missingInfo : []).map((x) => String(x).slice(0, 200)).slice(0, 8),
    model: res.model,
    cost,
  };
}
