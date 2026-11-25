// 영업 준비 (Lambda 제한 90초 안에 끝나도록 검색 5회, 페이지 읽기 3회로 제한): Claude가 웹을 검색해 기업의 공식 연락 창구, 공개된 담당자, 홈페이지 개선점 3가지,
// 첫 연락·전화·후속 문구를 만듭니다. 모든 사실에는 출처 링크를 붙이고, 개인 휴대폰·개인 메일은 다루지 않습니다.
import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, AiError, costUsd } from "./ai-score.mjs";

const SEARCH_USD = 0.01; // 웹 검색 1회 비용 ($10 / 1,000회)

const SYSTEM = `당신은 AI 전환(AX) 개발 회사 닷메이트의 영업 리서처입니다.
닷메이트는 2017년부터 웹·앱·쇼핑몰·사내 시스템을 만들어 온 회사로, 중소기업의 쇼핑몰·ERP·앱·홈페이지를 AI가 일하는 시스템으로 다시 만듭니다.
대표 사례: K-뷰티 자사몰을 쇼피파이에서 자체 몰로 옮겨 내부 운영 업무 90% 이상 감소, 농산물 경매 플랫폼 2개월 출시, MBC 14F 플랫폼 개발과 3년 운영.
첫 상품은 무료 AX 진단입니다(30분 미팅, 1주 안에 개선점 정리).

웹 검색과 웹 페이지 읽기로 주어진 기업을 조사해 영업 준비 자료를 한국어로 만드세요.
1. 공식 연락 창구: 회사가 공개한 대표번호, 업무용 대표 메일(info@, cs@ 등), 문의 폼 주소, 링크드인 회사 페이지.
2. 공개된 담당자: 대표, 이커머스·마케팅·해외사업·IT 책임자처럼 우리 제안을 판단할 사람. 회사 홈페이지, 보도자료, 기사, 공개 링크드인 프로필에 이름과 직책이 나온 경우만.
3. 홈페이지·쇼핑몰 진단: 실제로 페이지를 열어 확인한 개선점 3가지. 예: 상품 추천·검색 부족, 해외 고객용 언어·결제 부족, 상담 창구 부족, 모바일 사용성, 오래된 디자인, 사용 플랫폼의 한계. 각 항목에 무엇을 보고 판단했는지 적으세요.
4. 첫 연락 문구: 진단 개선점 하나를 구체적으로 짚는 짧은 문의 폼·링크드인 메시지(5문장 이내), 대표번호로 담당자 연결을 부탁하는 전화 스크립트, 3일·7일 뒤 후속 문구.

원칙:
- 출처 URL을 확인한 정보만 쓰세요. 찾지 못한 것은 비워 두고 notes에 "찾지 못함"이라고 쓰세요. 추측으로 이름이나 연락처를 만들지 마세요.
- 개인 휴대폰 번호, 개인 메일 주소, 집 주소는 찾더라도 절대 적지 마세요. 회사가 업무용으로 공개한 연락처만 적습니다.
- 동명의 다른 회사와 섞지 마세요. 주소·업종·대표자명으로 같은 회사인지 확인하세요.
- 연락 문구는 존댓말, 짧은 문장, 과장 없이. 이모지와 느낌표를 쓰지 마세요. 광고 문구가 아니라 상대 회사의 구체적인 상황을 짚는 문장으로 시작하세요.
- 검색은 5회, 페이지 읽기는 3회 이내로 꼭 필요한 만큼만 하세요.
- summary는 두 문장, findings는 정확히 3개, notes는 꼭 알아야 할 것만 짧게.`;

const str = { type: "string" };
const arr = (items) => ({ type: "array", items });
const obj = (props) => ({ type: "object", properties: props, required: Object.keys(props), additionalProperties: false });

const SCHEMA = obj({
  summary: str, // 회사 한두 문장 요약
  website: str,
  platform: str, // 쇼핑몰·사이트 플랫폼 추정 (카페24, 쇼피파이, 자체 개발, 알 수 없음 등)
  channels: arr(obj({ type: str, value: str, source: str })),
  people: arr(obj({ name: str, title: str, source: str, note: str })),
  findings: arr(obj({ issue: str, evidence: str, suggestion: str, source: str })),
  outreach: obj({ message: str, phone: str, followup3: str, followup7: str }),
  notes: str,
});

let client = null;

export async function prepareSales({ apiKey, company, contacts = [], fetchPages = true }) {
  if (!apiKey) throw new AiError("ai_key_missing");
  client ??= new Anthropic({ apiKey, timeout: 75_000, maxRetries: 0 });
  const f = (label, v) => (v ? `- ${label}: ${v}` : null);
  const input = [
    `회사명: ${company.name}`,
    f("산업", company.industry),
    f("지역", company.region),
    f("주소", company.address),
    f("대표자", company.ceo),
    f("홈페이지", company.website),
    f("매출", company.revenue),
    f("인원", company.employees),
    f("사업자등록번호", company.bizNo),
    company.memo ? `메모: ${String(company.memo).slice(0, 500)}` : null,
    contacts.length ? `이미 등록된 담당자: ${contacts.map((c) => `${c.name} ${c.title || ""}`).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const started = Date.now();
  const messages = [{ role: "user", content: input }];
  let cost = 0;
  let res;
  const acc = []; // 이어 받은 응답 내용 (pause_turn)
  try {
    for (let turn = 0; turn < 4; turn++) {
      res = await client.messages.create({
        model: AI_MODEL,
        max_tokens: 8000,
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        tools: [
          { type: "web_search_20260209", name: "web_search", max_uses: 5, user_location: { type: "approximate", country: "KR" } },
          ...(fetchPages ? [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: 3 }] : []),
        ],
        system: SYSTEM,
        messages,
      });
      cost += costUsd(res.usage) + (res.usage?.server_tool_use?.web_search_requests || 0) * SEARCH_USD;
      acc.push(...res.content);
      if (res.stop_reason !== "pause_turn") break;
      if (Date.now() - started > 40_000) break;
      messages.splice(1, messages.length - 1, { role: "assistant", content: [...acc] });
    }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new AiError("ai_key_invalid");
    if (e instanceof Anthropic.RateLimitError) throw Object.assign(new AiError("ai_rate_limited"), { cost });
    if (e instanceof Anthropic.APIConnectionError) throw Object.assign(new AiError("ai_unreachable"), { cost });
    if (e instanceof Anthropic.APIError) {
      console.error("anthropic", e.status, e.message?.slice(0, 300));
      throw Object.assign(new AiError("ai_error"), { cost });
    }
    throw e;
  }
  if (res.stop_reason === "refusal") throw Object.assign(new AiError("ai_refused"), { cost });
  // 마지막 검색·읽기 뒤에 온 글을 이어 붙이면 JSON 답이 됩니다 (인용 때문에 여러 조각으로 올 수 있음).
  const lastTool = acc.findLastIndex((b) => b.type !== "text");
  const text = acc
    .slice(lastTool + 1)
    .map((b) => b.text)
    .join("");
  try {
    return { prep: JSON.parse(text || ""), cost, model: res.model, searches: res.usage?.server_tool_use?.web_search_requests || 0 };
  } catch {
    console.error("anthropic bad json", res.stop_reason);
    throw Object.assign(new AiError("ai_error"), { cost });
  }
}
