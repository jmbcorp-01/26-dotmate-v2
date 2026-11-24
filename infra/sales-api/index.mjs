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

const TABLE = process.env.TABLE_NAME || "dotmate-sales";
const REGION = process.env.AWS_REGION || "ap-northeast-2";
const POOL_ID = process.env.USER_POOL_ID || "";
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID || "";
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
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

// ---------- 라우팅 ----------

async function route(method, path, body, user) {
  const seg = path.split("/").filter(Boolean);

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
  try {
    const user = devUser ?? (await authenticate(event.headers?.authorization));
    let body = {};
    if (event.body) {
      const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
      if (raw.length > 1_000_000) throw new HttpError(413, "too_large");
      try {
        body = JSON.parse(raw);
      } catch {
        throw new HttpError(400, "bad_json");
      }
    }
    return json(200, await route(method, path, body, user));
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { ok: false, error: err.code });
    // 개인정보는 로그에 남기지 않음
    console.error("error", err?.name, err?.message);
    return json(500, { ok: false, error: "server_error" });
  }
};
