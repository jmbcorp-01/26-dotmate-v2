// 기업별 미니 제안서의 맞춤 블록 초안을 만듭니다. 표준 블록(회사 소개, 레퍼런스, 수행 방법)은 화면 쪽 고정 내용입니다.
// 한국어 JSON 9개 블록을 만드는 데 30초 안팎이 걸려 Lambda 제한 시간을 90초로 둡니다 (Function URL은 30초 제한이 없음).
// 초안은 대표님이 확인하기 전까지 "확인 필요"로 표시되고, 모두 확인해야 발송할 수 있습니다.
import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, AiError, costUsd } from "./ai-score.mjs";

const SYSTEM = `당신은 AI 전환(AX) 컨설팅·개발 회사 닷메이트의 제안서 작성자입니다.
닷메이트는 2017년부터 웹, 앱, 쇼핑몰, 사내 시스템을 만들어 온 개발 회사이고, 중소기업의 쇼핑몰·ERP·앱·홈페이지를 AI 중심 시스템으로 다시 만듭니다.
상품: 무료 AX 진단 → 정밀 컨설팅 → AX PoC(작게 검증) → AX 플랫폼 구축 → 운영·고도화.
대표 레퍼런스: MBC 14층 플랫폼 개발과 3년 운영, 패스트파이브 웹사이트 리뉴얼, K-뷰티 글로벌 자사몰(쇼피파이에서 전환, 내부 운영 업무 90% 이상 감소), 농산물 경매 플랫폼 2개월 출시.

주어진 기업 정보, 산업 템플릿, 영업 기록으로 이 기업에 보내는 3~5쪽 분량 미니 제안서의 맞춤 블록을 한국어로 쓰세요.
원칙:
- 고객에게 보내는 문서입니다. 존댓말, 짧은 문장, 과장 없이 쓰세요. 이모지와 느낌표를 쓰지 마세요.
- 주어진 정보에 없는 사실(매출, 시스템 현황, 고객 수 등)을 지어내지 마세요. 업종에서 일반적으로 추론한 내용은 "~일 것으로 보입니다", "~하는 경우가 많습니다"처럼 추정임이 드러나게 쓰세요.
- 기대효과 숫자는 확정 약속이 아니라 "예상" 범위로 쓰고, 근거(가정)를 note에 밝히세요.
- 예상 비용은 단계별로 "협의" 또는 범위로 쓰고, 정밀 견적은 진단 후 드린다고 하세요. 무료 AX 진단은 0원입니다.
- 산업 템플릿의 문제→해법 쌍 중 이 기업에 맞는 것을 골라 기업 상황에 맞게 다듬으세요.
분량: 투자 IR 덱처럼 16:9 슬라이드 한 장에 블록 하나가 들어갑니다. 읽히는 양만 쓰세요.
- 모든 문장은 한 문장, 45자 안팎. 설명을 늘어놓지 말고 핵심만 쓰세요.
- cover.title은 25자 이내의 제안 한 줄, cover.subtitle은 한 문장.
- situation은 2개. 첫 항목은 이 기업 상황을 요약한 한 문장입니다.
- problems 3개, areas 3개(title은 12자 이내), beforeAfter 3개.
- roi.items 3개. value는 "30~50%", "2배"처럼 짧은 숫자 표현, label은 무엇이 바뀌는지 15자 이내. note는 근거와 가정을 두 문장 이내로.
- plan 3~4단계. phase는 상품 이름 그대로(무료 AX 진단, 정밀 컨설팅, AX PoC, AX 플랫폼 구축, 운영·고도화) 쓰고, cost.items는 plan과 같은 이름과 순서로 쓰세요.
- nextStep 2개.`;

const str = { type: "string" };
const arr = (items) => ({ type: "array", items });
const obj = (props) => ({ type: "object", properties: props, required: Object.keys(props), additionalProperties: false });

const SCHEMA = obj({
  cover: obj({ title: str, subtitle: str }),
  situation: arr(str),
  problems: arr(obj({ problem: str, solution: str })),
  areas: arr(obj({ title: str, body: str })),
  beforeAfter: arr(obj({ before: str, after: str })),
  roi: obj({ items: arr(obj({ label: str, value: str })), note: str }),
  plan: arr(obj({ phase: str, period: str, body: str })),
  cost: obj({ items: arr(obj({ item: str, amount: str, note: str })), note: str }),
  nextStep: arr(str),
});

export const BLOCK_KEYS = ["cover", "situation", "problems", "areas", "beforeAfter", "roi", "plan", "cost", "nextStep"];

let client = null;

export async function draftProposal({ apiKey, company, template, activities = [], aiScore, timeout = 80_000 }) {
  if (!apiKey) throw new AiError("ai_key_missing");
  client ??= new Anthropic({ apiKey, timeout, maxRetries: 0 });
  const f = (label, v) => (v ? `- ${label}: ${v}` : null);
  const input = [
    "## 기업 정보",
    `회사명: ${company.name}`,
    f("산업", company.industry),
    f("지역", company.region),
    f("매출", company.revenue),
    f("인원", company.employees),
    f("홈페이지", company.website),
    f("사용 플랫폼", company.platform),
    company.memo ? `메모:\n${company.memo}` : null,
    aiScore?.summary ? `영업 분석 요약: ${aiScore.summary}` : null,
    activities.length
      ? `최근 영업 기록:\n${activities
          .slice(0, 8)
          .map((a) => `- ${a.at} [${a.type}] ${String(a.body).slice(0, 400)}`)
          .join("\n")}`
      : null,
    "",
    "## 산업 템플릿",
    JSON.stringify(template),
  ]
    .filter((x) => x !== null)
    .join("\n");

  let res;
  try {
    res = await client.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 6000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: input }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new AiError("ai_key_invalid");
    if (e instanceof Anthropic.RateLimitError) throw new AiError("ai_rate_limited");
    if (e instanceof Anthropic.APIConnectionError) throw new AiError("ai_unreachable");
    if (e instanceof Anthropic.APIError) {
      console.error("anthropic", e.status, e.message?.slice(0, 300));
      throw new AiError("ai_error");
    }
    throw e;
  }
  const cost = costUsd(res.usage);
  if (res.stop_reason === "refusal") throw Object.assign(new AiError("ai_refused"), { cost });
  const text = res.content.find((b) => b.type === "text")?.text;
  try {
    return { blocks: JSON.parse(text || ""), cost, model: res.model };
  } catch {
    console.error("anthropic bad json", res.stop_reason);
    throw Object.assign(new AiError("ai_error"), { cost });
  }
}
