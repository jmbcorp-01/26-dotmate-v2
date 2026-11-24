// 닷메이트 영업 관리 API (Lambda Function URL)
// 런타임: Node.js 22.x (AWS SDK v3 기본 포함, 추가 패키지 없음)
// 인증: Cognito 사용자 풀의 ID 토큰(Authorization: Bearer ...)을 직접 검증합니다.
// 저장소: DynamoDB 테이블 하나 (TABLE_NAME). 키 구조는 README.md 참고.
import { createPublicKey, verify as verifySig, randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { makeProposalRoutes } from "./proposals.mjs";
import { makeQuoteRoutes } from "./quotes.mjs";

const TABLE = process.env.TABLE_NAME || "dotmate-sales";
const REGION = process.env.AWS_REGION || "ap-northeast-2";
const POOL_ID = process.env.USER_POOL_ID || "";
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID || "";
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const DATA_KEY = process.env.DATA_GO_KR_KEY || "";
const AI_KEY = process.env.ANTHROPIC_API_KEY || ""; // Claude API 키 (AI 점수 초안)
const AI_MONTHLY_USD = Number(process.env.AI_MONTHLY_USD || 30); // 월 예산 약 5만 원 // 공공데이터포털 일반 인증키(Decoding)
const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${POOL_ID}`;

let db = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
let devUser = null;

// 로컬 모의 실행(admin/scripts/mock-api.mjs) 전용: 메모리 저장소와 고정 사용자로 바꿉니다. Lambda에서는 호출되지 않습니다.
export function useLocalDev(fakeDb, user) {
  db = fakeDb;
  devUser = user;
}

// ---------- 공통 ----------

export const STAGES = ["발굴", "진단", "미니 제안", "미팅·데모", "PoC", "본계약·운영", "보류"];
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
];
// 전략 문서 03장 기업별 스코어링 (합계 100점)
export const SCORE_ITEMS = {
  legacy: 20, // 기존 시스템 노후화
  aiFit: 20, // AI 전환 가능 업무
  budget: 20, // 투자 여력
  reference: 20, // 레퍼런스 연관성
  access: 10, // 의사결정권자 접근성
  urgency: 10, // 개선 시급성
};

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const now = () => new Date().toISOString();
const newId = () => randomUUID().replace(/-/g, "").slice(0, 16);

const str = (v, max = 200) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : undefined;
const num = (v, min, max) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, Math.round(n)));
};
const date = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const oneOf = (v, list) => (list.includes(v) ? v : undefined);

export function scoreTotal(score = {}) {
  return Object.entries(SCORE_ITEMS).reduce((sum, [k, max]) => sum + (num(score[k], 0, max) ?? 0), 0);
}
export function grade(total, scored) {
  if (!scored) return "";
  if (total >= 80) return "A";
  if (total >= 60) return "B";
  return "C";
}

// ---------- 입력 정리 ----------

function cleanCompany(b, prev = {}) {
  const score = {};
  const src = b.score && typeof b.score === "object" ? b.score : prev.score || {};
  for (const [k, max] of Object.entries(SCORE_ITEMS)) {
    const v = num(src[k], 0, max);
    if (v !== undefined) score[k] = v;
  }
  const scored = Object.keys(score).length > 0;
  const total = scoreTotal(score);
  const name = str(b.name, 100) ?? prev.name;
  if (!name) throw new HttpError(400, "name_required");
  return {
    name,
    bizNo: str(b.bizNo, 20) ?? prev.bizNo,
    crno: str(b.crno, 20) ?? prev.crno, // 법인등록번호
    ceo: str(b.ceo, 50) ?? prev.ceo,
    founded: str(b.founded, 20) ?? prev.founded,
    address: str(b.address, 300) ?? prev.address,
    industry: oneOf(b.industry, INDUSTRIES) ?? prev.industry ?? "기타",
    region: str(b.region, 50) ?? prev.region,
    revenue: str(b.revenue, 50) ?? prev.revenue, // 예: "약 120억"
    employees: str(b.employees, 50) ?? prev.employees,
    website: str(b.website, 300) ?? prev.website,
    platform: str(b.platform, 100) ?? prev.platform, // 예: 카페24, 자체 개발
    source: str(b.source, 300) ?? prev.source, // 발굴 출처
    memo: str(b.memo, 5000) ?? prev.memo,
    tags: Array.isArray(b.tags) ? b.tags.map((t) => str(t, 30)).filter(Boolean).slice(0, 20) : prev.tags,
    score,
    scoreTotal: total,
    grade: grade(total, scored),
  };
}

function cleanContact(b, prev = {}) {
  const name = str(b.name, 50) ?? prev.name;
  if (!name) throw new HttpError(400, "name_required");
  return {
    name,
    title: str(b.title, 50) ?? prev.title,
    phone: str(b.phone, 30) ?? prev.phone,
    email: str(b.email, 120) ?? prev.email,
    consent: typeof b.consent === "boolean" ? b.consent : prev.consent ?? false, // 광고성 정보 수신 동의
    optOut: typeof b.optOut === "boolean" ? b.optOut : prev.optOut ?? false, // 수신 거부
    memo: str(b.memo, 1000) ?? prev.memo,
  };
}

const ACTIVITY_TYPES = ["메모", "전화", "메일", "미팅", "방문", "문의 접수", "단계 변경"];
function cleanActivity(b) {
  const body = str(b.body, 5000);
  if (!body) throw new HttpError(400, "body_required");
  return {
    type: oneOf(b.type, ACTIVITY_TYPES) ?? "메모",
    body,
    at: date(b.at) ?? now().slice(0, 10),
  };
}

function cleanDeal(b, prev = {}) {
  const title = str(b.title, 100) ?? prev.title;
  const companyId = str(b.companyId, 40) ?? prev.companyId;
  if (!title) throw new HttpError(400, "title_required");
  if (!companyId) throw new HttpError(400, "company_required");
  return {
    title,
    companyId,
    companyName: str(b.companyName, 100) ?? prev.companyName,
    stage: oneOf(b.stage, STAGES) ?? prev.stage ?? "발굴",
    product: str(b.product, 50) ?? prev.product,
    amount: num(b.amount, 0, 100_000_000_000) ?? prev.amount, // 예상 금액(원, 부가세 별도)
    nextAction: str(b.nextAction, 200) ?? prev.nextAction,
    nextDate: date(b.nextDate) ?? (b.nextDate === "" ? undefined : prev.nextDate),
    lostReason: str(b.lostReason, 300) ?? prev.lostReason,
  };
}

// ---------- 인증 ----------

let jwks = null;
async function keys() {
  if (jwks) return jwks;
  const res = await fetch(`${ISSUER}/.well-known/jwks.json`);
  if (!res.ok) throw new Error("jwks_fetch_failed");
  const { keys: list } = await res.json();
  jwks = Object.fromEntries(list.map((k) => [k.kid, createPublicKey({ key: k, format: "jwk" })]));
  return jwks;
}

const b64json = (s) => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));

export async function authenticate(header) {
  const token = (header || "").replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) throw new HttpError(401, "unauthorized");
  let h, p;
  try {
    h = b64json(parts[0]);
    p = b64json(parts[1]);
  } catch {
    throw new HttpError(401, "unauthorized");
  }
  if (h.alg !== "RS256") throw new HttpError(401, "unauthorized");
  const all = await keys();
  const key = all[h.kid];
  if (!key) throw new HttpError(401, "unauthorized");
  const ok = verifySig("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], "base64url"));
  if (!ok) throw new HttpError(401, "unauthorized");
  const t = Math.floor(Date.now() / 1000);
  if (p.iss !== ISSUER || p.token_use !== "id" || p.aud !== CLIENT_ID || !(p.exp > t)) throw new HttpError(401, "unauthorized");
  const email = String(p.email || "").toLowerCase();
  if (ALLOWED_EMAILS.length && !ALLOWED_EMAILS.includes(email)) throw new HttpError(403, "forbidden");
  return { email };
}

// ---------- 저장소 ----------
// 기업:   pk=COMPANY        sk=<companyId>
// 담당자: pk=CO#<companyId> sk=CONTACT#<contactId>
// 활동:   pk=CO#<companyId> sk=ACT#<ISO 시각>#<id>
// 딜:     pk=DEAL           sk=<dealId>   (companyId 속성)
// 타겟 DB 후보: pk=PROS#<산업> sk=<사업자번호 앞6자리>#<사업장명>  (ym 속성: 국민연금 자료 기준월)
// 타겟 DB 현황: pk=PROSMETA     sk=latest
// 제안서: pk=PROP sk=<id>, 링크 코드: pk=PCODE sk=<code>, 열람 기록: pk=PROPVIEW#<id> (proposals.mjs)
// 견적서: pk=QUOTE sk=<id>, 링크 코드: pk=QCODE, 열람 기록: pk=QUOTEVIEW#<id>, 설정: pk=SETTINGS sk=quote (quotes.mjs)

async function queryAll(params) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const r = await db.send(new QueryCommand({ TableName: TABLE, ...params, ExclusiveStartKey }));
    items.push(...(r.Items || []));
    ExclusiveStartKey = r.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

const strip = ({ pk, sk, ...rest }) => rest;

async function getCompany(id) {
  const r = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: "COMPANY", sk: id } }));
  if (!r.Item) throw new HttpError(404, "not_found");
  return strip(r.Item);
}

async function putCompany(data, user, prev) {
  const id = prev?.id ?? newId();
  const item = {
    pk: "COMPANY",
    sk: id,
    id,
    ...cleanCompany(data, prev),
    createdAt: prev?.createdAt ?? now(),
    updatedAt: now(),
    updatedBy: user.email,
  };
  await db.send(new PutCommand({ TableName: TABLE, Item: item }));
  return strip(item);
}

async function addActivity(companyId, data, user) {
  const a = cleanActivity(data);
  const id = newId();
  const item = { pk: `CO#${companyId}`, sk: `ACT#${now()}#${id}`, id, companyId, ...a, by: user.email, createdAt: now() };
  await db.send(new PutCommand({ TableName: TABLE, Item: item }));
  return strip(item);
}

async function deleteCompany(id) {
  const children = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `CO#${id}` } });
  const deals = (await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": "DEAL" } })).filter(
    (d) => d.companyId === id,
  );
  const keysToDelete = [{ pk: "COMPANY", sk: id }, ...children, ...deals].map(({ pk, sk }) => ({ pk, sk }));
  for (let i = 0; i < keysToDelete.length; i += 25) {
    await db.send(
      new BatchWriteCommand({
        RequestItems: { [TABLE]: keysToDelete.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } })) },
      }),
    );
  }
}



// ---------- 기업 정보 조회 (금융위원회 기업기본정보·재무정보, 공공데이터포털) ----------

async function dataGoKr(path, params) {
  if (!DATA_KEY) throw new HttpError(503, "data_key_missing");
  const qs = new URLSearchParams({ serviceKey: DATA_KEY, pageNo: "1", resultType: "json", ...params });
  let res;
  try {
    res = await fetch(`https://apis.data.go.kr/1160100/service/${path}?${qs}`, { signal: AbortSignal.timeout(8000) });
  } catch {
    throw new HttpError(502, "data_unreachable");
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // 키 미승인·트래픽 초과 등은 XML 오류로 옵니다.
    console.error("data.go.kr", path, res.status, text.slice(0, 300));
    if (/SERVICE_KEY_IS_NOT_REGISTERED|SERVICE ACCESS DENIED|NO_OPENAPI_SERVICE/.test(text)) throw new HttpError(502, "data_not_approved");
    if (/LIMITED_NUMBER_OF_SERVICE_REQUESTS/.test(text)) throw new HttpError(502, "data_limit");
    throw new HttpError(502, "data_error");
  }
  const code = data?.response?.header?.resultCode;
  if (code && code !== "00") {
    console.error("data.go.kr", path, code, data?.response?.header?.resultMsg);
    throw new HttpError(502, "data_error");
  }
  const item = data?.response?.body?.items?.item;
  return Array.isArray(item) ? item : item ? [item] : [];
}

const ymd = (v) => (typeof v === "string" && /^\d{8}$/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : undefined);
const bizFmt = (v) => (typeof v === "string" && /^\d{10}$/.test(v) ? `${v.slice(0, 3)}-${v.slice(3, 5)}-${v.slice(5)}` : v || undefined);

function outline(x) {
  return {
    crno: x.crno,
    name: x.corpNm,
    ceo: x.enpRprFnm || undefined,
    bizNo: bizFmt(x.bzno),
    address: [x.enpBsadr, x.enpDtadr].filter(Boolean).join(" ") || undefined,
    website: x.enpHmpgUrl ? (/^https?:\/\//.test(x.enpHmpgUrl) ? x.enpHmpgUrl : `http://${x.enpHmpgUrl}`) : undefined,
    phone: x.enpTlno || undefined,
    kind: x.sicNm || undefined,
    mainBiz: x.enpMainBizNm || undefined,
    employees: Number(x.enpEmpeCnt) > 0 ? Number(x.enpEmpeCnt) : undefined,
    founded: ymd(x.enpEstbDt),
    listed: x.corpRegMrktDcdNm || undefined,
    basDt: x.basDt,
  };
}

// 회사명으로 후보를 찾습니다. 같은 법인이 기준일별로 여러 번 나오므로 법인등록번호로 묶어 최신 것만 남깁니다.
async function searchCorp(name) {
  const corpNm = String(name).replace(/\(주\)|주식회사|㈜|\(유\)|유한회사/g, "").trim();
  if (!corpNm) return [];
  const items = await dataGoKr("GetCorpBasicInfoService_V2/getCorpOutline_V2", { numOfRows: "50", corpNm });
  const latest = new Map();
  for (const x of items) {
    if (!x.crno) continue;
    const prev = latest.get(x.crno);
    if (!prev || String(x.basDt || "") > String(prev.basDt || "")) latest.set(x.crno, x);
  }
  return [...latest.values()].map(outline).slice(0, 20);
}

async function corpFinance(crno) {
  try {
    const items = await dataGoKr("GetFinaStatInfoService_V2/getSummFinaStat_V2", { numOfRows: "20", crno });
    const rows = items.filter((x) => x.bizYear && x.enpSaleAmt !== undefined && x.enpSaleAmt !== "");
    if (!rows.length) return { finance: null };
    // 최근 사업연도, 같은 해면 연결보다 별도 재무제표를 우선합니다.
    rows.sort((a, b) => String(b.bizYear).localeCompare(String(a.bizYear)) || (String(a.fnclDcdNm).includes("연결") ? 1 : -1));
    const x = rows[0];
    return { finance: { year: x.bizYear, sales: Number(x.enpSaleAmt), profit: Number(x.enpBzopPft), assets: Number(x.enpTastAmt) } };
  } catch (e) {
    return { finance: null, financeError: e instanceof HttpError ? e.code : "data_error" };
  }
}

const eok = (n) => {
  if (!Number.isFinite(n)) return undefined;
  const v = n / 1e8;
  return `약 ${v >= 10 ? Math.round(v).toLocaleString("ko-KR") : v.toFixed(1)}억`;
};

async function lookupRoutes(method, id, body, user) {
  const company = await getCompany(id);
  if (method === "GET") return { query: company.name, items: await searchCorp(company.name) };
  if (method === "POST") {
    const crno = str(body.crno, 20);
    if (!crno || !/^\d{13}$/.test(crno)) throw new HttpError(400, "crno_required");
    const items = await dataGoKr("GetCorpBasicInfoService_V2/getCorpOutline_V2", { numOfRows: "10", crno });
    if (!items.length) throw new HttpError(404, "not_found");
    items.sort((a, b) => String(b.basDt || "").localeCompare(String(a.basDt || "")));
    const o = outline(items[0]);
    const { finance, financeError } = await corpFinance(crno);
    const patch = {
      crno,
      ceo: o.ceo,
      bizNo: o.bizNo,
      address: o.address,
      founded: o.founded,
      website: company.website || o.website,
      employees: o.employees ? `${o.employees}명 (금융위 ${o.basDt?.slice(0, 4) || ""})` : undefined,
      revenue: finance && Number.isFinite(finance.sales) ? `${eok(finance.sales)} (${finance.year})` : undefined,
    };
    const updated = await putCompany({ ...company, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v)) }, user, company);
    const lines = [
      `기업 정보 자동 채우기 (금융위원회 기업기본정보 ${o.basDt || ""})`,
      o.ceo && `대표자: ${o.ceo}`,
      o.bizNo && `사업자번호: ${o.bizNo}`,
      o.kind && `업종: ${o.kind}`,
      o.mainBiz && `주요 사업: ${o.mainBiz}`,
      o.employees && `직원 수: ${o.employees}명`,
      o.founded && `설립일: ${o.founded}`,
      o.listed && `시장 구분: ${o.listed}`,
      o.phone && `대표 전화: ${o.phone}`,
      finance && `${finance.year} 매출 ${eok(finance.sales)}, 영업이익 ${eok(finance.profit) ?? "-"}`,
    ].filter(Boolean);
    await addActivity(id, { type: "메모", body: lines.join("\n") }, user);
    return { company: updated, outline: o, finance, financeError };
  }
  throw new HttpError(404, "not_found");
}


// ---------- AI 점수 초안 ----------
// 사용액: pk=AIUSAGE sk=<YYYY-MM>  /  초안: pk=CO#<id> sk=AISCORE

const month = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 7); // 한국 시간 기준 월

async function aiUsage() {
  const r = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: "AIUSAGE", sk: month() } }));
  return { month: month(), usd: r.Item?.usd || 0, calls: r.Item?.calls || 0, cap: AI_MONTHLY_USD };
}

async function addAiUsage(usd) {
  const u = await aiUsage();
  await db.send(
    new PutCommand({ TableName: TABLE, Item: { pk: "AIUSAGE", sk: u.month, usd: Math.round((u.usd + usd) * 10000) / 10000, calls: u.calls + 1, updatedAt: now() } }),
  );
}

async function aiScoreRoute(id, user) {
  const usage = await aiUsage();
  if (usage.usd >= AI_MONTHLY_USD) throw new HttpError(429, "ai_budget");
  const company = await getCompany(id);
  const children = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `CO#${id}` }, ScanIndexForward: false });
  const { scoreCompany, AiError } = await import("./ai-score.mjs");
  let draft;
  try {
    draft = await scoreCompany({
      apiKey: AI_KEY,
      company,
      activities: children.filter((c) => c.sk.startsWith("ACT#")),
      contacts: children.filter((c) => c.sk.startsWith("CONTACT#")),
    });
  } catch (e) {
    if (e instanceof AiError) {
      if (e.cost) await addAiUsage(e.cost);
      throw new HttpError(e.code === "ai_key_missing" ? 503 : 502, e.code);
    }
    throw e;
  }
  await addAiUsage(draft.cost);
  const item = { pk: `CO#${id}`, sk: "AISCORE", companyId: id, ...draft, at: now(), by: user.email };
  await db.send(new PutCommand({ TableName: TABLE, Item: item }));
  return { aiScore: strip(item), usage: await aiUsage() };
}

// ---------- 제안서 ----------

async function aiProposal({ company, template, activities, aiScore }) {
  const usage = await aiUsage();
  if (usage.usd >= AI_MONTHLY_USD) throw new HttpError(429, "ai_budget");
  const { draftProposal } = await import("./ai-proposal.mjs");
  const { AiError } = await import("./ai-score.mjs");
  try {
    const r = await draftProposal({ apiKey: AI_KEY, company, template, activities, aiScore });
    await addAiUsage(r.cost);
    return { ...r, usage: await aiUsage() };
  } catch (e) {
    if (e instanceof AiError) {
      if (e.cost) await addAiUsage(e.cost);
      throw new HttpError(e.code === "ai_key_missing" ? 503 : 502, e.code);
    }
    throw e;
  }
}

let proposalRoutes;
const proposals = () =>
  (proposalRoutes ??= makeProposalRoutes({
    db,
    TABLE,
    HttpError,
    GetCommand,
    PutCommand,
    DeleteCommand,
    queryAll,
    strip,
    now,
    newId,
    str,
    getCompany,
    addActivity,
    ai: aiProposal,
  }));

let quoteRoutes;
const quotes = () =>
  (quoteRoutes ??= makeQuoteRoutes({ db, TABLE, HttpError, GetCommand, PutCommand, DeleteCommand, queryAll, strip, now, newId, str, getCompany, addActivity }));

// ---------- 타겟 DB (국민연금 가입 사업장 자료) ----------
// 관리자 화면이 공공데이터포털의 월간 CSV를 읽어 산업별로 분류한 행을 500개씩 보내고, 여기서는 저장·검색·등록만 합니다.

const normName = (s) => String(s || "").replace(/\s|\(주\)|주식회사|\(유\)|유한회사|㈜/g, "");

function cleanProspect(r, ym, loadId) {
  const industry = oneOf(r?.industry, INDUSTRIES);
  const name = str(r?.name, 120);
  if (!industry || !name) return null;
  const bizNo = (str(r?.bizNo, 20) || "").replace(/[^0-9*]/g, "").slice(0, 10);
  return {
    pk: `PROS#${industry}`,
    sk: `${bizNo || "-"}#${normName(name)}`.slice(0, 200),
    industry,
    name,
    bizNo: bizNo || undefined,
    kind: str(r?.kind, 60),
    employees: num(r?.employees, 0, 1_000_000) ?? 0,
    region: str(r?.region, 20),
    address: str(r?.address, 200),
    corp: r?.corp === true,
    since: date(r?.since),
    ym,
    loadId,
  };
}

async function prospectMeta() {
  const r = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: "PROSMETA", sk: "latest" } }));
  return r.Item ? strip(r.Item) : null;
}

// 따뜻한 Lambda에서는 산업별 후보를 5분간 메모리에 둡니다. 자료를 새로 불러오면 loadedAt이 바뀌어 다시 읽습니다.
const prospectCache = new Map(); // industry → { loadedAt, at, items }
async function prospectsOf(industry, meta) {
  const c = prospectCache.get(industry);
  if (c && c.loadedAt === meta.loadedAt && Date.now() - c.at < 5 * 60_000) return c.items;
  const all = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `PROS#${industry}` } });
  const items = all.filter((x) => (meta.loadId ? x.loadId === meta.loadId : x.ym === meta.ym)).sort((a, b) => b.employees - a.employees);
  prospectCache.set(industry, { loadedAt: meta.loadedAt, at: Date.now(), items });
  return items;
}

async function prospectRoutes(method, seg, body, query, user) {
  if (method === "GET" && seg.length === 1) {
    const meta = await prospectMeta();
    const industry = oneOf(query.get("industry"), INDUSTRIES);
    if (!industry || !meta) return { meta, items: [], total: 0 };
    const region = query.get("region") || "";
    const min = num(query.get("min"), 0, 1_000_000) ?? 0;
    const max = num(query.get("max"), 0, 1_000_000) ?? 1_000_000;
    const q = normName(query.get("q") || "").toLowerCase();
    const corpOnly = query.get("corp") === "1";
    const all = await prospectsOf(industry, meta);
    const hits = all.filter(
      (x) =>
        x.employees >= min &&
        x.employees <= max &&
        (!region || x.region === region) &&
        (!corpOnly || x.corp) &&
        (!q || normName(x.name).toLowerCase().includes(q) || String(x.kind || "").includes(q) || String(x.address || "").includes(q)),
    );
    const size = num(query.get("size"), 10, 200) ?? 50;
    const pages = Math.max(1, Math.ceil(hits.length / size));
    const page = Math.min(num(query.get("page"), 1, 100_000) ?? 1, pages);
    const companies = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": "COMPANY" } });
    const known = new Set(companies.map((c) => normName(c.name)));
    return {
      meta,
      total: hits.length,
      page,
      pages,
      items: hits.slice((page - 1) * size, page * size).map((x) => ({ ...strip(x), key: x.sk, registered: known.has(normName(x.name)) })),
    };
  }

  if (method === "POST" && seg[1] === "load") {
    const ym = typeof body.ym === "string" && /^\d{4}-\d{2}$/.test(body.ym) ? body.ym : undefined;
    if (!ym) throw new HttpError(400, "ym_required");
    // 같은 달 자료를 다시 불러와도 이전 분류가 섞이지 않도록 불러오기마다 loadId를 붙입니다.
    const loadId = str(body.loadId, 40);
    const rows = (Array.isArray(body.rows) ? body.rows.slice(0, 500) : []).map((r) => cleanProspect(r, ym, loadId)).filter(Boolean);
    const unique = [...new Map(rows.map((r) => [`${r.pk}|${r.sk}`, r])).values()];
    for (let i = 0; i < unique.length; i += 25) {
      let req = { [TABLE]: unique.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } })) };
      for (let tries = 0; req && Object.keys(req).length && tries < 5; tries++) {
        const r = await db.send(new BatchWriteCommand({ RequestItems: req }));
        req = r?.UnprocessedItems && Object.keys(r.UnprocessedItems).length ? r.UnprocessedItems : null;
        if (req) await new Promise((ok) => setTimeout(ok, 200 * (tries + 1)));
      }
    }
    if (body.done) {
      const counts = {};
      for (const k of INDUSTRIES) {
        const n = num(body.counts?.[k], 0, 10_000_000);
        if (n) counts[k] = n;
      }
      await db.send(
        new PutCommand({
          TableName: TABLE,
          Item: { pk: "PROSMETA", sk: "latest", ym, loadId, counts, fileName: str(body.fileName, 200), loadedAt: now(), loadedBy: user.email },
        }),
      );
    }
    return { saved: unique.length };
  }

  // 고른 후보의 매출을 금융위원회 재무정보에서 조회해 후보에 저장합니다. 사업자번호 앞 6자리로 같은 회사인지 확인합니다.
  if (method === "POST" && seg[1] === "finance") {
    const picks = Array.isArray(body.items) ? body.items.slice(0, 10) : [];
    const results = [];
    let i = 0;
    const worker = async () => {
      while (i < picks.length) {
        const p = picks[i++];
        const industry = oneOf(p?.industry, INDUSTRIES);
        const key = str(p?.key, 200);
        if (!industry || !key) continue;
        const got = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: `PROS#${industry}`, sk: key } }));
        const x = got.Item;
        if (!x) continue;
        let status = "ok";
        let corp = null;
        let finance = null;
        try {
          const hits = await searchCorp(x.name);
          const prefix = String(x.bizNo || "").replace(/\D/g, "").slice(0, 6);
          corp =
            (prefix.length === 6 && hits.find((h) => String(h.bizNo || "").replace(/\D/g, "").startsWith(prefix))) ||
            (hits.length === 1 ? hits[0] : null);
          if (!corp) status = hits.length ? "ambiguous" : "no_corp";
          else {
            const f = await corpFinance(corp.crno);
            finance = f.finance;
            if (!finance) status = f.financeError || "no_finance";
          }
        } catch (e) {
          status = e instanceof HttpError ? e.code : "data_error";
        }
        const item = {
          ...x,
          finStatus: status,
          finCheckedAt: now(),
          crno: corp?.crno ?? x.crno,
          ceo: corp?.ceo ?? x.ceo,
          sales: finance && Number.isFinite(finance.sales) ? finance.sales : x.sales,
          profit: finance && Number.isFinite(finance.profit) ? finance.profit : x.profit,
          finYear: finance?.year ?? x.finYear,
        };
        await db.send(new PutCommand({ TableName: TABLE, Item: item }));
        const cached = prospectCache.get(industry)?.items;
        const at = cached ? cached.findIndex((c) => c.sk === key) : -1;
        if (at >= 0) cached[at] = item;
        results.push({ key, status, sales: item.sales, profit: item.profit, finYear: item.finYear, ceo: item.ceo });
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    return { results };
  }

  if (method === "POST" && seg[1] === "promote") {
    const picks = Array.isArray(body.items) ? body.items.slice(0, 100) : [];
    const meta = await prospectMeta();
    const existing = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": "COMPANY" } });
    const names = new Set(existing.map((c) => normName(c.name)));
    let created = 0;
    const skipped = [];
    for (const p of picks) {
      const industry = oneOf(p?.industry, INDUSTRIES);
      const key = str(p?.key, 200);
      if (!industry || !key) continue;
      const r = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: `PROS#${industry}`, sk: key } }));
      const x = r.Item;
      if (!x) continue;
      if (names.has(normName(x.name))) {
        skipped.push(x.name);
        continue;
      }
      const memo = [
        x.kind && `업종: ${x.kind}`,
        x.address && `주소: ${x.address}`,
        x.bizNo && `사업자번호 앞자리: ${x.bizNo}`,
        x.since && `국민연금 적용일: ${x.since}`,
      ]
        .filter(Boolean)
        .join("\n");
      const c = await putCompany(
        {
          name: x.name,
          industry,
          region: x.region,
          employees: x.employees ? `${x.employees}명 (국민연금 가입자)` : undefined,
          revenue: Number.isFinite(x.sales) ? `${eok(x.sales)} (${x.finYear})` : undefined,
          ceo: x.ceo,
          crno: x.crno,
          source: `국민연금 가입 사업장 ${meta?.ym || x.ym}`,
          memo,
        },
        user,
      );
      await addActivity(c.id, { type: "메모", body: `타겟 DB에서 등록 (국민연금 가입 사업장 ${x.ym} 자료)` }, user);
      names.add(normName(x.name));
      created++;
    }
    return { created, skipped };
  }

  throw new HttpError(404, "not_found");
}

// ---------- 라우팅 ----------

async function route(method, path, body, user, query = new URLSearchParams()) {
  const seg = path.split("/").filter(Boolean);
  if (seg[0] === "prospects") return prospectRoutes(method, seg, body, query, user);
  if (seg[0] === "companies" && seg.length === 3 && seg[2] === "lookup") return lookupRoutes(method, seg[1], body, user);
  if (seg[0] === "companies" && seg.length === 3 && seg[2] === "ai-score" && method === "POST") return aiScoreRoute(seg[1], user);
  if (method === "GET" && path === "/ai/usage") return aiUsage();
  if (seg[0] === "proposals") return proposals().authed(method, seg, body, user);
  if (seg[0] === "quotes" || (seg[0] === "settings" && seg[1] === "quote")) return quotes().authed(method, seg, body, user);

  if (method === "GET" && path === "/meta") return { stages: STAGES, industries: INDUSTRIES, scoreItems: SCORE_ITEMS, activityTypes: ACTIVITY_TYPES };
  if (method === "GET" && path === "/me") return { email: user.email };

  // 기업
  if (seg[0] === "companies") {
    if (seg.length === 1 && method === "GET") {
      const items = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": "COMPANY" } });
      return { items: items.map(strip) };
    }
    if (seg.length === 1 && method === "POST") return putCompany(body, user);

    const id = seg[1];
    if (seg.length === 2 && method === "GET") {
      const company = await getCompany(id);
      const children = await queryAll({
        KeyConditionExpression: "pk = :p",
        ExpressionAttributeValues: { ":p": `CO#${id}` },
        ScanIndexForward: false,
      });
      const deals = (await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": "DEAL" } }))
        .filter((d) => d.companyId === id)
        .map(strip);
      return {
        company,
        contacts: children.filter((c) => c.sk.startsWith("CONTACT#")).map(strip),
        activities: children.filter((c) => c.sk.startsWith("ACT#")).map(strip),
        aiScore: (() => {
          const a = children.find((c) => c.sk === "AISCORE");
          return a ? strip(a) : null;
        })(),
        deals,
      };
    }
    if (seg.length === 2 && method === "PUT") return putCompany(body, user, await getCompany(id));
    if (seg.length === 2 && method === "DELETE") {
      await getCompany(id);
      await deleteCompany(id);
      return { ok: true };
    }

    // 담당자
    if (seg[2] === "contacts") {
      await getCompany(id);
      const cid = seg[3] ?? newId();
      const key = { pk: `CO#${id}`, sk: `CONTACT#${cid}` };
      if (seg.length === 3 && method === "POST") {
        const item = { ...key, id: cid, companyId: id, ...cleanContact(body), createdAt: now(), updatedAt: now() };
        await db.send(new PutCommand({ TableName: TABLE, Item: item }));
        return strip(item);
      }
      if (seg.length === 4 && method === "PUT") {
        const r = await db.send(new GetCommand({ TableName: TABLE, Key: key }));
        if (!r.Item) throw new HttpError(404, "not_found");
        const item = { ...r.Item, ...cleanContact(body, r.Item), updatedAt: now() };
        await db.send(new PutCommand({ TableName: TABLE, Item: item }));
        return strip(item);
      }
      if (seg.length === 4 && method === "DELETE") {
        await db.send(new DeleteCommand({ TableName: TABLE, Key: key }));
        return { ok: true };
      }
    }

    // 활동 기록
    if (seg[2] === "activities" && seg.length === 3 && method === "POST") {
      await getCompany(id);
      return addActivity(id, body, user);
    }
  }

  // 딜(영업 건)
  if (seg[0] === "deals") {
    if (seg.length === 1 && method === "GET") {
      const items = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": "DEAL" } });
      return { items: items.map(strip) };
    }
    if (seg.length === 1 && method === "POST") {
      const company = await getCompany(str(body.companyId, 40) || "-");
      const id = newId();
      const item = {
        pk: "DEAL",
        sk: id,
        id,
        ...cleanDeal({ ...body, companyName: company.name }),
        createdAt: now(),
        updatedAt: now(),
      };
      await db.send(new PutCommand({ TableName: TABLE, Item: item }));
      await addActivity(company.id, { type: "단계 변경", body: `영업 건 "${item.title}" 등록 (${item.stage})` }, user);
      return strip(item);
    }
    const id = seg[1];
    const key = { pk: "DEAL", sk: id };
    if (seg.length === 2 && method === "PUT") {
      const r = await db.send(new GetCommand({ TableName: TABLE, Key: key }));
      if (!r.Item) throw new HttpError(404, "not_found");
      const next = cleanDeal(body, r.Item);
      const item = { ...r.Item, ...next, updatedAt: now() };
      await db.send(new PutCommand({ TableName: TABLE, Item: item }));
      if (next.stage !== r.Item.stage) {
        await addActivity(item.companyId, { type: "단계 변경", body: `"${item.title}" ${r.Item.stage} → ${next.stage}` }, user);
      }
      return strip(item);
    }
    if (seg.length === 2 && method === "DELETE") {
      await db.send(new DeleteCommand({ TableName: TABLE, Key: key }));
      return { ok: true };
    }
  }

  // 일괄 등록 (엑셀에서 복사한 표 등). 같은 이름 또는 같은 사업자번호의 기업은 건너뜁니다.
  if (method === "POST" && path === "/import") {
    const rows = Array.isArray(body.rows) ? body.rows.slice(0, 500) : [];
    const existing = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": "COMPANY" } });
    const names = new Set(existing.map((c) => c.name.replace(/\s|\(주\)|주식회사/g, "")));
    const biz = new Set(existing.map((c) => c.bizNo).filter(Boolean));
    let created = 0;
    const skipped = [];
    for (const row of rows) {
      const key = String(row?.name || "").replace(/\s|\(주\)|주식회사/g, "");
      if (!key) continue;
      if (names.has(key) || (row.bizNo && biz.has(row.bizNo))) {
        skipped.push(row.name);
        continue;
      }
      try {
        const c = await putCompany(row, user);
        names.add(key);
        if (c.bizNo) biz.add(c.bizNo);
        created++;
      } catch {
        skipped.push(row.name);
      }
    }
    return { created, skipped };
  }

  throw new HttpError(404, "not_found");
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || "GET";
  const path = (event.rawPath || "/").replace(/\/+$/, "") || "/";
  if (method === "OPTIONS") return { statusCode: 204 };
  // 고객이 여는 제안서·견적서 링크만 인증 없이 받습니다.
  const pub = /^\/public\/(p|q)\/([^/]+)(?:\/(approve|request))?$/.exec(path);
  if (pub) {
    try {
      const ua = event.headers?.["user-agent"] || "";
      const q = new URLSearchParams(event.rawQueryString || "");
      const meta = { device: /Mobi|Android|iPhone/i.test(ua) ? "모바일" : "PC", preview: q.get("preview") === "1" };
      if (pub[1] === "p") {
        if (method !== "GET" || pub[3]) return json(405, { ok: false, error: "method_not_allowed" });
        return json(200, await proposals().publicView(pub[2], meta));
      }
      let body = {};
      if (event.body) {
        const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
        if (raw.length > 10_000) throw new HttpError(413, "too_large");
        try {
          body = JSON.parse(raw);
        } catch {
          throw new HttpError(400, "bad_json");
        }
      }
      return json(200, await quotes().publicRoute(method, pub[2], pub[3], body, meta));
    } catch (err) {
      if (err instanceof HttpError) return json(err.status, { ok: false, error: err.code });
      console.error("error", err?.name, err?.message);
      return json(500, { ok: false, error: "server_error" });
    }
  }
  try {
    const user = devUser ?? (await authenticate(event.headers?.authorization));
    let body = {};
    if (event.body) {
      const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
      if (raw.length > 2_000_000) throw new HttpError(413, "too_large");
      try {
        body = JSON.parse(raw);
      } catch {
        throw new HttpError(400, "bad_json");
      }
    }
    return json(200, await route(method, path, body, user, new URLSearchParams(event.rawQueryString || "")));
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { ok: false, error: err.code });
    // 개인정보는 로그에 남기지 않음
    console.error("error", err?.name, err?.message);
    return json(500, { ok: false, error: "server_error" });
  }
};
