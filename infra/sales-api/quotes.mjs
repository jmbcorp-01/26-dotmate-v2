// 견적서: 저장, 버전(수정본), 발송 링크, 고객 승인·수정 요청, 견적 설정(단가표).
// 견적:      pk=QUOTE  sk=<id>        (rootId로 같은 견적의 버전을 묶습니다)
// 링크 코드: pk=QCODE  sk=<code>      (quoteId 속성)
// 열람 기록: pk=QUOTEVIEW#<id> sk=<ISO 시각>
// 설정:      pk=SETTINGS sk=quote    (단가표, 제경비·기술료, 지급 방식 기본값)
// 금액 계산은 관리자 화면(admin/lib/quote.ts)이 하고, 여기서는 받은 값을 정리해 저장합니다.
// 원가 메모(costMemo)는 고객 링크에 절대 내보내지 않습니다.
import { randomBytes } from "node:crypto";

const PAY_TYPES = ["lump", "subscription", "revenue", "hybrid"];
const MAX_VIEWS_LOGGED = 300;

const s = (v, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const n = (v, min = 0, max = 1e12) => {
  const x = Number(v);
  return Number.isFinite(x) ? Math.min(Math.max(x, min), max) : 0;
};

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).slice(0, 80).map((i) => ({
    kind: i?.kind === "labor" ? "labor" : "expense",
    phase: s(i?.phase, 60),
    name: s(i?.name, 120),
    role: s(i?.role, 40),
    days: n(i?.days, 0, 10000),
    unit: n(i?.unit),
    qty: n(i?.qty, 0, 10000),
    amount: n(i?.amount),
    note: s(i?.note, 200),
  }));
}

function cleanPayment(p = {}) {
  return {
    type: PAY_TYPES.includes(p.type) ? p.type : "lump",
    months: Math.round(n(p.months, 1, 60)) || 24,
    split: Array.isArray(p.split) ? p.split.slice(0, 5).map((x) => ({ label: s(x?.label, 30), pct: n(x?.pct, 0, 100) })) : [],
    upfront: n(p.upfront),
    monthly: n(p.monthly),
    rate: n(p.rate, 0, 100),
    minMonthly: n(p.minMonthly),
    cap: n(p.cap),
    expectedSales: n(p.expectedSales),
    premium: n(p.premium, 1, 5),
    monthlyOps: n(p.monthlyOps),
    showAlternatives: p.showAlternatives === true,
    note: s(p.note, 1000),
  };
}

const cleanTotals = (t = {}) =>
  Object.fromEntries(["labor", "overhead", "techFee", "expense", "subtotal", "discount", "supply", "vat", "total"].map((k) => [k, n(t[k], -1e12)]));

const cleanCost = (c = {}) => ({ labor: n(c.labor), outsource: n(c.outsource), api: n(c.api), other: n(c.other), note: s(c.note, 500) });

export function cleanSettings(b = {}) {
  return {
    rates: (Array.isArray(b.rates) ? b.rates : []).slice(0, 40).map((r) => ({ role: s(r?.role, 40), daily: n(r?.daily) })).filter((r) => r.role),
    overheadPct: n(b.overheadPct, 0, 300),
    techFeePct: n(b.techFeePct, 0, 100),
    rateYear: s(b.rateYear, 10),
    validDays: Math.round(n(b.validDays, 1, 90)) || 14,
  };
}

const newCode = () => randomBytes(9).toString("base64url");

export function makeQuoteRoutes({ db, TABLE, HttpError, GetCommand, PutCommand, DeleteCommand, queryAll, strip, now, newId, str, getCompany, addActivity }) {
  const get = async (id) => {
    const r = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: "QUOTE", sk: id } }));
    if (!r.Item) throw new HttpError(404, "not_found");
    return r.Item;
  };
  const put = (item) => db.send(new PutCommand({ TableName: TABLE, Item: { ...item, updatedAt: now() } }));
  const editable = (q) => {
    if (q.status !== "draft") throw new HttpError(409, "quote_locked");
  };
  const body = (b, prev = {}) => ({
    title: s(b.title, 120) || prev.title || "견적서",
    items: b.items ? cleanItems(b.items) : prev.items || [],
    overheadPct: b.overheadPct !== undefined ? n(b.overheadPct, 0, 300) : prev.overheadPct ?? 110,
    techFeePct: b.techFeePct !== undefined ? n(b.techFeePct, 0, 100) : prev.techFeePct ?? 20,
    discount: b.discount !== undefined ? n(b.discount) : prev.discount || 0,
    totals: b.totals ? cleanTotals(b.totals) : prev.totals || cleanTotals(),
    payment: b.payment ? cleanPayment(b.payment) : prev.payment || cleanPayment(),
    scope: b.scope !== undefined ? s(b.scope, 3000) : prev.scope || "",
    terms: b.terms !== undefined ? s(b.terms, 3000) : prev.terms || "",
    costMemo: b.costMemo ? cleanCost(b.costMemo) : prev.costMemo || cleanCost(),
    validDays: b.validDays !== undefined ? Math.round(n(b.validDays, 1, 90)) || 14 : prev.validDays || 14,
  });

  async function authed(method, seg, b, user) {
    if (seg[0] === "settings") {
      const key = { pk: "SETTINGS", sk: "quote" };
      if (method === "GET") {
        const r = await db.send(new GetCommand({ TableName: TABLE, Key: key }));
        return { settings: r.Item ? strip(r.Item) : null };
      }
      if (method === "PUT") {
        const item = { ...key, ...cleanSettings(b), updatedAt: now(), updatedBy: user.email };
        await db.send(new PutCommand({ TableName: TABLE, Item: item }));
        return { settings: strip(item) };
      }
      throw new HttpError(404, "not_found");
    }

    if (seg.length === 1 && method === "GET") {
      const items = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": "QUOTE" } });
      return {
        items: items
          .map(({ items: _i, costMemo: _c, scope: _s, terms: _t, ...rest }) => strip(rest))
          .sort((a, c) => (c.updatedAt || "").localeCompare(a.updatedAt || "")),
      };
    }
    if (seg.length === 1 && method === "POST") {
      const company = await getCompany(str(b.companyId, 40) || "-");
      const id = newId();
      const item = {
        pk: "QUOTE",
        sk: id,
        id,
        rootId: id,
        version: 1,
        companyId: company.id,
        companyName: company.name,
        industry: company.industry,
        ...body(b),
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
      const views = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `QUOTEVIEW#${id}` }, ScanIndexForward: false });
      const versions = (await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": "QUOTE" } }))
        .filter((q) => q.rootId === item.rootId)
        .map((q) => ({ id: q.id, version: q.version, status: q.status, updatedAt: q.updatedAt }))
        .sort((a, c) => a.version - c.version);
      return { quote: strip(item), views: views.slice(0, 50).map(strip), versions };
    }
    if (seg.length === 2 && method === "PUT") {
      const prev = await get(id);
      editable(prev);
      const item = { ...prev, ...body(b, prev) };
      await put(item);
      return strip(item);
    }
    if (seg.length === 2 && method === "DELETE") {
      const prev = await get(id);
      const views = await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `QUOTEVIEW#${id}` } });
      for (const v of views) await db.send(new DeleteCommand({ TableName: TABLE, Key: { pk: v.pk, sk: v.sk } }));
      if (prev.code) await db.send(new DeleteCommand({ TableName: TABLE, Key: { pk: "QCODE", sk: prev.code } }));
      await db.send(new DeleteCommand({ TableName: TABLE, Key: { pk: "QUOTE", sk: id } }));
      return { ok: true };
    }

    // 수정본: 같은 견적의 새 버전을 작성 중 상태로 만들고, 이전 버전 링크는 닫습니다.
    if (seg.length === 3 && seg[2] === "revise" && method === "POST") {
      const prev = await get(id);
      const all = (await queryAll({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": "QUOTE" } })).filter((q) => q.rootId === prev.rootId);
      const nid = newId();
      const { code: _c, sentAt: _s, expiresAt: _e, approvedAt: _a, approvedBy: _ab, requests: _r, firstViewedAt: _f, lastViewedAt: _l, ...base } = prev;
      const item = { ...base, sk: nid, id: nid, version: Math.max(...all.map((q) => q.version)) + 1, status: "draft", views: 0, createdAt: now(), createdBy: user.email };
      await put(item);
      if (prev.status === "sent") await put({ ...prev, status: "superseded" });
      return strip(item);
    }

    // 발송: 유효 기간 동안 열리는 링크를 만듭니다. 다시 누르면 기간만 늘립니다.
    if (seg.length === 3 && seg[2] === "send" && method === "POST") {
      const prev = await get(id);
      if (!["draft", "sent"].includes(prev.status)) throw new HttpError(409, "quote_locked");
      if (!(prev.totals?.supply > 0) && prev.payment?.type !== "revenue") throw new HttpError(400, "quote_empty");
      const days = Math.round(n(b.days, 1, 90)) || prev.validDays || 14;
      const code = prev.code || newCode();
      const item = { ...prev, code, status: "sent", sentAt: prev.sentAt || now(), expiresAt: new Date(Date.now() + days * 86400_000).toISOString() };
      await db.send(new PutCommand({ TableName: TABLE, Item: { pk: "QCODE", sk: code, quoteId: id } }));
      await put(item);
      if (!prev.code) await addActivity(prev.companyId, { type: "메일", body: `견적서 링크 발송: "${prev.title}" v${prev.version} (${days}일 동안 유효)` }, user);
      return strip(item);
    }
    if (seg.length === 3 && seg[2] === "close" && method === "POST") {
      const prev = await get(id);
      const item = { ...prev, status: "closed", closedAt: now() };
      await put(item);
      return strip(item);
    }
    throw new HttpError(404, "not_found");
  }

  async function byCode(code) {
    if (!/^[A-Za-z0-9_-]{8,20}$/.test(code || "")) throw new HttpError(404, "not_found");
    const c = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: "QCODE", sk: code } }));
    if (!c.Item) throw new HttpError(404, "not_found");
    const q = await get(c.Item.quoteId).catch(() => null);
    if (!q || q.code !== code) throw new HttpError(404, "not_found");
    return q;
  }

  const publicShape = (q) => ({
    title: q.title,
    version: q.version,
    companyName: q.companyName,
    industry: q.industry,
    items: q.items,
    overheadPct: q.overheadPct,
    techFeePct: q.techFeePct,
    discount: q.discount,
    totals: q.totals,
    payment: q.payment,
    scope: q.scope,
    terms: q.terms,
    status: q.status,
    sentAt: q.sentAt,
    expiresAt: q.expiresAt,
    approvedAt: q.approvedAt,
    approvedBy: q.approvedBy,
  });

  // 공개 링크 (인증 없음). 승인된 견적은 기간이 지나도 확인용으로 열립니다.
  async function publicRoute(method, code, action, b, meta) {
    const q = await byCode(code);
    const open = q.status === "sent" && !(q.expiresAt && q.expiresAt < now());
    if (method === "GET" && !action) {
      if (!open && q.status !== "approved") throw new HttpError(410, "expired");
      if (!meta.preview && (q.views || 0) < MAX_VIEWS_LOGGED) {
        const at = now();
        await db.send(new PutCommand({ TableName: TABLE, Item: { pk: `QUOTEVIEW#${q.id}`, sk: `${at}#${newId().slice(0, 4)}`, at, device: s(meta.device, 20) } }));
        await put({ ...q, views: (q.views || 0) + 1, lastViewedAt: at, firstViewedAt: q.firstViewedAt || at });
        if (!q.firstViewedAt) await addActivity(q.companyId, { type: "메모", body: `고객이 견적서 "${q.title}" v${q.version}을(를) 처음 열람했습니다.` }, { email: "system" });
      }
      return publicShape(q);
    }
    if (method === "POST" && action === "approve") {
      if (!open) throw new HttpError(410, "expired");
      const name = s(b.name, 40);
      if (!name) throw new HttpError(400, "name_required");
      const item = { ...q, status: "approved", approvedAt: now(), approvedBy: name };
      await put(item);
      await addActivity(q.companyId, { type: "메모", body: `고객이 견적서 "${q.title}" v${q.version}을(를) 승인했습니다 (승인자: ${name}).` }, { email: "system" });
      return publicShape(item);
    }
    if (method === "POST" && action === "request") {
      if (!open) throw new HttpError(410, "expired");
      const text = s(b.text, 1000);
      if (!text) throw new HttpError(400, "body_required");
      const requests = [...(q.requests || []), { at: now(), name: s(b.name, 40), text }].slice(-20);
      await put({ ...q, requests });
      await addActivity(q.companyId, { type: "메모", body: `견적서 수정 요청 (v${q.version}): ${text.slice(0, 300)}` }, { email: "system" });
      return { ok: true };
    }
    throw new HttpError(405, "method_not_allowed");
  }

  return { authed, publicRoute };
}
