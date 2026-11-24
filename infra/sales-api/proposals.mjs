// 제안서·회사소개서: 저장, 발송 링크, 열람 기록, AI 맞춤 블록 초안.
// 제안서:    pk=PROP       sk=<id>
// 링크 코드: pk=PCODE      sk=<code>   (proposalId 속성)
// 열람 기록: pk=PROPVIEW#<id> sk=<ISO 시각>
// 표준 블록(회사 소개, 레퍼런스, 수행 방법)은 화면 쪽 고정 내용이라 여기에는 기업별 맞춤 블록만 저장합니다.
import { randomBytes } from "node:crypto";

export const BLOCK_KEYS = ["cover", "situation", "problems", "areas", "beforeAfter", "roi", "plan", "cost", "nextStep"];
const KINDS = ["mini", "intro"];
const MAX_VIEWS_LOGGED = 300;

// 블록은 JSON 구조 그대로 저장하되, 깊이·길이를 제한하고 문자열만 남깁니다.
function cleanValue(v, depth = 0) {
  if (depth > 4) return undefined;
  if (typeof v === "string") return v.slice(0, 3000);
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => cleanValue(x, depth + 1)).filter((x) => x !== undefined);
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, x] of Object.entries(v).slice(0, 20)) {
      if (!/^[a-zA-Z]{1,20}$/.test(k)) continue;
      const c = cleanValue(x, depth + 1);
      if (c !== undefined) out[k] = c;
    }
    return out;
  }
  return undefined;
}

export function cleanBlocks(b) {
  const out = {};
  for (const k of BLOCK_KEYS) if (b && b[k] !== undefined) out[k] = cleanValue(b[k], 1);
  return out;
}

const cleanFlags = (f) => Object.fromEntries(BLOCK_KEYS.filter((k) => f && f[k] === true).map((k) => [k, true]));

const newCode = () => randomBytes(9).toString("base64url"); // 12자, 추측 불가

export function makeProposalRoutes({ db, TABLE, HttpError, GetCommand, PutCommand, DeleteCommand, queryAll, strip, now, newId, str, getCompany, addActivity, ai }) {
  const get = async (id) => {
    const r = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: "PROP", sk: id } }));
    if (!r.Item) throw new HttpError(404, "not_found");
    return r.Item;
  };
  const put = (item) => db.send(new PutCommand({ TableName: TABLE, Item: { ...item, updatedAt: now() } }));
  const summary = ({ blocks, ...rest }) => strip(rest);

  async function authed(method, seg, body, user) {
    if (seg.length === 1 && method === "GET") {
      const items = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": "PROP" } });
      return { items: items.map(summary).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")) };
    }
    if (seg.length === 1 && method === "POST") {
      const kind = KINDS.includes(body.kind) ? body.kind : "mini";
      const company = await getCompany(str(body.companyId, 40) || "-");
      const id = newId();
      const blocks = cleanBlocks(body.blocks);
      const item = {
        pk: "PROP",
        sk: id,
        id,
        kind,
        companyId: company.id,
        companyName: company.name,
        industry: company.industry,
        title: str(body.title, 120) || (kind === "intro" ? `${company.name} 회사소개서` : `${company.name} AX 미니 제안서`),
        blocks,
        flags: {},
        status: "draft",
        views: 0,
        createdAt: now(),
        createdBy: user.email,
      };
      await put(item);
      return strip(item);
    }

    const id = seg[1];
    if (seg.length === 2 && method === "GET") {
      const item = await get(id);
      const views = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `PROPVIEW#${id}` }, ScanIndexForward: false });
      return { proposal: strip(item), views: views.slice(0, 50).map(strip) };
    }
    if (seg.length === 2 && method === "PUT") {
      const prev = await get(id);
      if (prev.status === "closed") throw new HttpError(409, "proposal_closed");
      const item = {
        ...prev,
        title: str(body.title, 120) || prev.title,
        blocks: body.blocks ? cleanBlocks(body.blocks) : prev.blocks,
        flags: body.flags ? cleanFlags(body.flags) : prev.flags,
      };
      await put(item);
      return strip(item);
    }
    if (seg.length === 2 && method === "DELETE") {
      const prev = await get(id);
      const views = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `PROPVIEW#${id}` } });
      for (const v of views) await db.send(new DeleteCommand({ TableName: TABLE, Key: { pk: v.pk, sk: v.sk } }));
      if (prev.code) await db.send(new DeleteCommand({ TableName: TABLE, Key: { pk: "PCODE", sk: prev.code } }));
      await db.send(new DeleteCommand({ TableName: TABLE, Key: { pk: "PROP", sk: id } }));
      return { ok: true };
    }

    // AI 맞춤 블록 초안: 받은 블록은 모두 "확인 필요"로 표시합니다.
    if (seg.length === 3 && seg[2] === "ai" && method === "POST") {
      const prev = await get(id);
      if (prev.kind !== "mini") throw new HttpError(400, "bad_request");
      if (prev.status === "closed") throw new HttpError(409, "proposal_closed");
      const company = await getCompany(prev.companyId);
      const children = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `CO#${prev.companyId}` }, ScanIndexForward: false });
      const template = cleanValue(body.template, 0) || {};
      const draft = await ai({
        company,
        template,
        activities: children.filter((c) => c.sk.startsWith("ACT#")),
        aiScore: children.find((c) => c.sk === "AISCORE"),
      });
      const blocks = cleanBlocks(draft.blocks);
      const item = { ...prev, blocks, flags: Object.fromEntries(Object.keys(blocks).map((k) => [k, true])), aiModel: draft.model, aiAt: now() };
      await put(item);
      return { proposal: strip(item), usage: draft.usage };
    }

    // 발송: 확인 안 된 블록이 없어야 링크를 만듭니다. 다시 발송하면 기간만 늘리고 같은 링크를 씁니다.
    if (seg.length === 3 && seg[2] === "send" && method === "POST") {
      const prev = await get(id);
      if (Object.keys(prev.flags || {}).length) throw new HttpError(409, "proposal_unverified");
      const days = Math.min(Math.max(Math.round(Number(body.days) || 30), 1), 180);
      const code = prev.code || newCode();
      const item = { ...prev, code, status: "sent", sentAt: prev.sentAt || now(), expiresAt: new Date(Date.now() + days * 86400_000).toISOString() };
      await db.send(new PutCommand({ TableName: TABLE, Item: { pk: "PCODE", sk: code, proposalId: id } }));
      await put(item);
      if (!prev.code) {
        await addActivity(prev.companyId, { type: "메일", body: `${prev.kind === "intro" ? "회사소개서" : "제안서"} 링크 발송: "${prev.title}" (${days}일 동안 열람 가능)` }, user);
      }
      return strip(item);
    }
    if (seg.length === 3 && seg[2] === "close" && method === "POST") {
      const prev = await get(id);
      const item = { ...prev, status: "closed", closedAt: now() };
      await put(item);
      return strip(item);
    }
    if (seg.length === 3 && seg[2] === "reopen" && method === "POST") {
      const prev = await get(id);
      const item = { ...prev, status: prev.code ? "sent" : "draft", closedAt: undefined };
      await put(item);
      return strip(item);
    }
    throw new HttpError(404, "not_found");
  }

  // 공개 열람 (인증 없음). 발송된 링크이고 기간 안일 때만 내용을 줍니다.
  async function publicView(code, meta) {
    if (!/^[A-Za-z0-9_-]{8,20}$/.test(code || "")) throw new HttpError(404, "not_found");
    const c = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: "PCODE", sk: code } }));
    if (!c.Item) throw new HttpError(404, "not_found");
    const p = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: "PROP", sk: c.Item.proposalId } }));
    const item = p.Item;
    if (!item || item.code !== code) throw new HttpError(404, "not_found");
    if (item.status !== "sent") throw new HttpError(410, "expired");
    if (item.expiresAt && item.expiresAt < now()) throw new HttpError(410, "expired");

    if (!meta.preview && (item.views || 0) < MAX_VIEWS_LOGGED) {
      const at = now();
      await db.send(
        new PutCommand({ TableName: TABLE, Item: { pk: `PROPVIEW#${item.id}`, sk: `${at}#${newId().slice(0, 4)}`, at, device: str(meta.device, 20) } }),
      );
      await put({ ...item, views: (item.views || 0) + 1, lastViewedAt: at, firstViewedAt: item.firstViewedAt || at });
      if (!item.firstViewedAt) {
        await addActivity(item.companyId, { type: "메모", body: `고객이 "${item.title}"을(를) 처음 열람했습니다.` }, { email: "system" });
      }
    }
    return {
      kind: item.kind,
      title: item.title,
      companyName: item.companyName,
      industry: item.industry,
      blocks: item.blocks,
      sentAt: item.sentAt,
      expiresAt: item.expiresAt,
    };
  }

  return { authed, publicView };
}
