"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { useData } from "@/lib/useData";
import { useQuoteSettings } from "@/lib/quoteApi";
import {
  PAY_DESC,
  PAY_LABEL,
  PRESETS,
  QUOTE_STATUS,
  calcTotals,
  eokMan,
  itemAmount,
  krw,
  planFor,
  presetItems,
  suggestRate,
  type PayType,
  type Payment,
  type Quote,
  type QuoteItem,
} from "@/lib/quote";
import QuoteDoc from "@/components/QuoteDoc";

type Detail = {
  quote: Quote;
  views: { at: string; device?: string }[];
  versions: { id: string; version: number; status: Quote["status"]; updatedAt: string }[];
};

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" }) : "-");
const PAY_TYPES: PayType[] = ["lump", "subscription", "revenue", "hybrid"];

function Num({ label, value, onChange, suffix, hint, step }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; hint?: string; step?: number }) {
  return (
    <label>
      <span className="small muted">{label}</span>
      <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
        <input type="number" step={step} value={value || ""} placeholder={hint} onChange={(e) => onChange(Number(e.target.value))} style={{ minWidth: 0, flex: 1 }} />
        {suffix && <span className="small muted">{suffix}</span>}
      </span>
    </label>
  );
}

export default function QuoteEditor() {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => setId(new URLSearchParams(window.location.search).get("id")), []);
  const { data, error, reload } = useData<Detail>(id ? `/quotes/${id}` : null);
  const { settings } = useQuoteSettings();

  const [q, setQ] = useState<Quote | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [days, setDays] = useState(14);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (data?.quote) {
      setQ(data.quote);
      setDays(data.quote.validDays || 14);
      setDirty(false);
    }
  }, [data]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const totals = useMemo(() => (q ? calcTotals(q.items, q.overheadPct, q.techFeePct, q.discount) : null), [q]);

  if (error) return <p className="notice">{error}</p>;
  if (!q || !data || !totals) return <p className="muted">불러오는 중...</p>;

  const locked = q.status !== "draft";
  const link = q.code ? `${window.location.origin}/q/?c=${q.code}` : "";
  const upd = (patch: Partial<Quote>) => {
    setQ({ ...q, ...patch });
    setDirty(true);
  };
  const updPay = (patch: Partial<Payment>) => upd({ payment: { ...q.payment, ...patch } });
  const setItems = (items: QuoteItem[]) => upd({ items: items.map((i) => ({ ...i, amount: itemAmount(i) })) });
  const setItem = (k: number, patch: Partial<QuoteItem>) => setItems(q.items.map((i, j) => (j === k ? { ...i, ...patch } : i)));
  const plan = planFor(q.payment.type, totals.supply, q.payment);
  const cost = q.costMemo.labor + q.costMemo.outsource + q.costMemo.api + q.costMemo.other;
  const phases = [...new Set(q.items.map((i) => i.phase))];

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy("");
    }
  }
  const payload = () => ({ ...q, totals });
  const save = () =>
    run("save", async () => {
      await api(`/quotes/${q.id}`, { method: "PUT", body: payload() });
      reload();
    });
  const send = () =>
    run("send", async () => {
      if (dirty && !locked) await api(`/quotes/${q.id}`, { method: "PUT", body: payload() });
      await api(`/quotes/${q.id}/send`, { method: "POST", body: { days } });
      reload();
    });
  const revise = () =>
    run("revise", async () => {
      const r = await api<Quote>(`/quotes/${q.id}/revise`, { method: "POST" });
      router.push(`/quote/?id=${r.id}`);
      setId(r.id);
    });
  const close = () =>
    run("close", async () => {
      await api(`/quotes/${q.id}/close`, { method: "POST" });
      reload();
    });
  const remove = () =>
    run("delete", async () => {
      if (!confirm("이 버전과 열람 기록을 삭제할까요? 보낸 링크도 더 이상 열리지 않습니다.")) return;
      await api(`/quotes/${q.id}`, { method: "DELETE" });
      router.push("/quotes/");
    });
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("링크를 복사하세요", link);
    }
  }

  const addRow = (kind: "labor" | "expense") => {
    const role = settings.rates.find((r) => r.role === "응용SW개발자") || settings.rates[0];
    setItems([
      ...q.items,
      kind === "labor"
        ? { kind, phase: phases[phases.length - 1] || "AX PoC", name: "", role: role.role, days: 5, unit: role.daily, qty: 1, amount: 0, note: "" }
        : { kind, phase: phases[phases.length - 1] || "AX PoC", name: "", role: "", days: 0, unit: 0, qty: 1, amount: 0, note: "" },
    ]);
  };

  return (
    <>
      <div className="head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="small muted">
            <Link href="/quotes/">견적서</Link> / <Link href={`/company/?id=${q.companyId}`}>{q.companyName}</Link> · v{q.version}
            {data.versions.length > 1 &&
              data.versions
                .filter((v) => v.id !== q.id)
                .map((v) => (
                  <span key={v.id}>
                    {" "}
                    · <Link href={`/quote/?id=${v.id}`} onClick={() => setId(v.id)}>v{v.version}</Link>
                  </span>
                ))}
          </p>
          <input aria-label="제목" value={q.title} disabled={locked} onChange={(e) => upd({ title: e.target.value })} style={{ fontSize: 20, fontWeight: 700, width: "100%" }} />
          <p className="small muted" style={{ marginTop: 6 }}>
            <span className={`badge ${q.status === "approved" ? "good" : q.status === "sent" ? "B" : ""}`}>{QUOTE_STATUS[q.status]}</span> 열람 {q.views || 0}회
            {q.lastViewedAt && ` · 마지막 ${fmt(q.lastViewedAt)}`}
            {q.approvedAt && ` · ${q.approvedBy}님 승인 ${fmt(q.approvedAt)}`}
          </p>
        </div>
        <div className="row">
          {!locked && (
            <button className="btn" disabled={!!busy || !dirty} onClick={save}>
              {busy === "save" ? "저장 중..." : dirty ? "저장" : "저장됨"}
            </button>
          )}
          {locked && q.status !== "closed" && (
            <button className="btn" disabled={!!busy} onClick={revise}>
              수정본 만들기 (v{Math.max(...data.versions.map((v) => v.version)) + 1})
            </button>
          )}
        </div>
      </div>
      {err && <p className="notice">{err}</p>}

      {(q.requests?.length || 0) > 0 && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>고객 수정 요청</h2>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {q.requests!.map((r) => (
              <li key={r.at}>
                {fmt(r.at)} {r.name && `· ${r.name}`}: {r.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card form" style={{ marginBottom: 16 }}>
        <div className="spread">
          <div>
            <strong style={{ fontSize: 20 }}>{eokMan(totals.supply)}</strong> <span className="small muted">공급가액 (부가세 별도 {krw(totals.vat)})</span>
            <div className="small muted">
              {PAY_LABEL[q.payment.type]}:{" "}
              {q.payment.type === "lump"
                ? plan.schedule?.map((s) => `${s.label} ${eokMan(s.amount)}`).join(", ")
                : q.payment.type === "subscription"
                  ? `처음 ${eokMan(plan.upfront)}, 월 ${eokMan(plan.monthly)} × ${plan.months}개월`
                  : `처음 ${eokMan(plan.upfront)}, 거래액 ${plan.rate}% (월 최저 ${eokMan(plan.minMonthly || 0)}, 상한 ${eokMan(plan.cap || 0)})`}
            </div>
          </div>
          {q.status === "draft" || q.status === "sent" ? (
            <div className="row">
              <label className="row small">
                유효 기간
                <input type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 64 }} />일
              </label>
              <button className="btn" disabled={!!busy} onClick={send}>
                {busy === "send" ? "만드는 중..." : q.code ? "유효 기간 늘리기" : "발송 링크 만들기"}
              </button>
            </div>
          ) : null}
        </div>
        {link && (
          <div className="row" style={{ marginTop: 8 }}>
            <input readOnly value={link} aria-label="고객용 링크" style={{ flex: 1, minWidth: 200 }} onFocus={(e) => e.target.select()} />
            <button className="btn ghost small" onClick={copy}>
              {copied ? "복사됨" : "링크 복사"}
            </button>
            <a className="btn ghost small" href={`/q/?c=${q.code}&preview=1`} target="_blank" rel="noreferrer">
              고객 화면 열기
            </a>
          </div>
        )}
        {link && q.status === "sent" && <p className="small muted">고객은 링크에서 견적을 승인하거나 수정을 요청할 수 있습니다. 발송한 견적을 고치려면 수정본을 만드세요.</p>}
      </section>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "edit"} onClick={() => setTab("edit")}>
          편집
        </button>
        <button role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>
          고객 화면 미리보기
        </button>
      </div>

      {tab === "preview" && <QuoteDoc q={{ ...q, totals, expiresAt: q.expiresAt }} />}

      {tab === "edit" && (
        <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0 }} className="grid">
          <section className="card form">
            <div className="spread">
              <h2 style={{ margin: 0, fontSize: 16 }}>산정 항목</h2>
              <div className="row">
                {PRESETS.map((p) => (
                  <button key={p.key} type="button" className="btn ghost small" onClick={() => setItems([...q.items, ...presetItems(p.key, settings.rates)])}>
                    + {p.label} 기본 구성
                  </button>
                ))}
              </div>
            </div>
            {q.items.length === 0 && <p className="small muted">위 버튼으로 단계별 기본 구성을 넣고 투입 일수를 고치세요. 개발 인건비는 직무를 고르면 일 단가가 자동으로 들어갑니다.</p>}
            {q.items.length > 0 && (
              <div className="table-wrap">
                <table className="quote-items">
                  <thead>
                    <tr>
                      <th>단계</th>
                      <th>항목</th>
                      <th>직무 / 구분</th>
                      <th>투입 일수 / 수량</th>
                      <th>단가</th>
                      <th>금액</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {q.items.map((i, k) => (
                      <tr key={k}>
                        <td>
                          <input aria-label="단계" value={i.phase} onChange={(e) => setItem(k, { phase: e.target.value })} style={{ width: 120 }} />
                        </td>
                        <td>
                          <input aria-label="항목" value={i.name} onChange={(e) => setItem(k, { name: e.target.value })} style={{ width: 200 }} />
                        </td>
                        <td>
                          {i.kind === "labor" ? (
                            <select
                              aria-label="직무"
                              value={i.role}
                              onChange={(e) => setItem(k, { role: e.target.value, unit: settings.rates.find((r) => r.role === e.target.value)?.daily || i.unit })}
                            >
                              {settings.rates.map((r) => (
                                <option key={r.role}>{r.role}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="small muted">직접경비</span>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            aria-label="투입 일수"
                            value={i.kind === "labor" ? i.days : i.qty}
                            onChange={(e) => setItem(k, i.kind === "labor" ? { days: Number(e.target.value) } : { qty: Number(e.target.value) })}
                            style={{ width: 80 }}
                          />
                        </td>
                        <td>
                          <input type="number" aria-label="단가" value={i.unit} onChange={(e) => setItem(k, { unit: Number(e.target.value) })} style={{ width: 120 }} />
                        </td>
                        <td className="small">{krw(i.amount)}</td>
                        <td>
                          <button type="button" className="btn ghost small" onClick={() => setItems(q.items.filter((_, j) => j !== k))}>
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="row">
              <button type="button" className="btn ghost small" onClick={() => addRow("labor")}>
                + 인건비 줄
              </button>
              <button type="button" className="btn ghost small" onClick={() => addRow("expense")}>
                + 직접경비 줄 (AI API, 서버, 라이선스 등)
              </button>
            </div>
            <div className="grid grid-3">
              <Num label="제경비 (%)" value={q.overheadPct} onChange={(v) => upd({ overheadPct: v })} suffix="%" />
              <Num label="기술료 (%)" value={q.techFeePct} onChange={(v) => upd({ techFeePct: v })} suffix="%" />
              <Num label="할인 금액" value={q.discount} onChange={(v) => upd({ discount: v })} suffix="원" />
            </div>
            <p className="small muted">
              직접인건비 {krw(totals.labor)} + 제경비 {krw(totals.overhead)} + 기술료 {krw(totals.techFee)} + 직접경비 {krw(totals.expense)} = {krw(totals.subtotal)} → 공급가액{" "}
              <strong>{krw(totals.supply)}</strong> (만 원 미만 절사)
            </p>
          </section>

          <section className="card form">
            <h2 style={{ margin: 0, fontSize: 16 }}>지급 방식</h2>
            <div className="pay-pick" role="radiogroup" aria-label="지급 방식">
              {PAY_TYPES.map((t) => {
                const p = planFor(t, totals.supply, q.payment);
                return (
                  <button
                    type="button"
                    key={t}
                    role="radio"
                    aria-checked={q.payment.type === t}
                    className="pay-opt"
                    onClick={() => updPay({ type: t, upfront: 0, monthly: 0, rate: 0, minMonthly: 0, cap: 0 })}
                  >
                    <strong>{PAY_LABEL[t]}</strong>
                    <span>처음 {p.upfront ? eokMan(p.upfront) : "0원"}</span>
                    <span>
                      {t === "lump" ? (q.payment.monthlyOps ? `월 운영 ${eokMan(q.payment.monthlyOps)}` : "월 부담 없음") : t === "subscription" ? `월 ${eokMan(p.monthly)}` : `거래액 ${p.rate}%`}
                    </span>
                    <span className="small muted">{q.payment.months}개월 총 {eokMan(p.total)}</span>
                  </button>
                );
              })}
            </div>
            <p className="small muted">{PAY_DESC[q.payment.type]}</p>

            {q.payment.type === "lump" && (
              <div className="grid grid-3">
                {q.payment.split.map((s, k) => (
                  <Num
                    key={k}
                    label={`${s.label} (%)`}
                    value={s.pct}
                    onChange={(v) => updPay({ split: q.payment.split.map((x, j) => (j === k ? { ...x, pct: v } : x)) })}
                    suffix="%"
                  />
                ))}
                <Num label="월 운영·유지보수비 (선택)" value={q.payment.monthlyOps} onChange={(v) => updPay({ monthlyOps: v })} suffix="원" />
              </div>
            )}
            {q.payment.type === "subscription" && (
              <div className="grid grid-3">
                <Num label="처음 받는 금액" value={q.payment.upfront} onChange={(v) => updPay({ upfront: v })} suffix="원" hint={`자동 ${eokMan(plan.upfront)}`} />
                <Num label="월 이용료" value={q.payment.monthly} onChange={(v) => updPay({ monthly: v })} suffix="원" hint={`자동 ${eokMan(plan.monthly)}`} />
                <Num label="기간" value={q.payment.months} onChange={(v) => updPay({ months: v })} suffix="개월" />
                <Num label="프리미엄 배수 (나눠 받는 대가)" value={q.payment.premium} onChange={(v) => updPay({ premium: v })} step={0.1} suffix="배" />
              </div>
            )}
            {(q.payment.type === "revenue" || q.payment.type === "hybrid") && (
              <>
                <div className="grid grid-3">
                  <Num label="고객 예상 월 거래액" value={q.payment.expectedSales} onChange={(v) => updPay({ expectedSales: v })} suffix="원" hint="예: 300000000" />
                  <Num label="착수금" value={q.payment.upfront} onChange={(v) => updPay({ upfront: v })} suffix="원" hint={`자동 ${eokMan(plan.upfront)}`} />
                  <Num
                    label="수수료율"
                    value={q.payment.rate}
                    onChange={(v) => updPay({ rate: v })}
                    step={0.1}
                    suffix="%"
                    hint={`제안 ${suggestRate(totals.supply, q.payment, plan.upfront)}%`}
                  />
                  <Num label="월 최저 보장액" value={q.payment.minMonthly} onChange={(v) => updPay({ minMonthly: v })} suffix="원" hint={`자동 ${eokMan(plan.minMonthly || 0)}`} />
                  <Num label="총 수수료 상한" value={q.payment.cap} onChange={(v) => updPay({ cap: v })} suffix="원" hint={`자동 ${eokMan(plan.cap || 0)}`} />
                  <Num label="기간" value={q.payment.months} onChange={(v) => updPay({ months: v })} suffix="개월" />
                  <Num label="프리미엄 배수" value={q.payment.premium} onChange={(v) => updPay({ premium: v })} step={0.1} suffix="배" />
                </div>
                <p className="small muted">
                  수수료율 제안 = (기준가 {eokMan(totals.supply)} × 프리미엄 - 착수금) ÷ ({q.payment.months}개월 × 예상 월 거래액). 비워 둔 칸은 자동 값을 씁니다.
                  {!q.payment.expectedSales && " 예상 월 거래액을 넣어야 수수료율이 계산됩니다."}
                </p>
              </>
            )}
            <label className="check-line">
              <input type="checkbox" checked={q.payment.showAlternatives} onChange={(e) => updPay({ showAlternatives: e.target.checked })} /> 고객 화면에 다른 지급 방식 비교표도 보여주기
            </label>
            <label>
              <span className="small muted">지급 방식 설명 (고객에게 보임, 선택)</span>
              <textarea rows={2} value={q.payment.note} onChange={(e) => updPay({ note: e.target.value })} />
            </label>
          </section>

          <section className="card form">
            <label>
              <span className="small muted">범위 (고객에게 보임)</span>
              <textarea rows={4} value={q.scope} onChange={(e) => upd({ scope: e.target.value })} placeholder="예: 자사몰 AI 상담과 상품 등록 에이전트 PoC. 기존 카페24 몰과 연동." />
            </label>
            <label>
              <span className="small muted">조건 (한 줄에 하나, 고객에게 보임)</span>
              <textarea rows={5} value={q.terms} onChange={(e) => upd({ terms: e.target.value })} />
            </label>
          </section>

          <section className="card form">
            <h2 style={{ margin: 0, fontSize: 16 }}>원가 메모 (고객에게 안 보임)</h2>
            <div className="grid grid-3">
              <Num label="내부 인력 비용" value={q.costMemo.labor} onChange={(v) => upd({ costMemo: { ...q.costMemo, labor: v } })} suffix="원" />
              <Num label="외주" value={q.costMemo.outsource} onChange={(v) => upd({ costMemo: { ...q.costMemo, outsource: v } })} suffix="원" />
              <Num label="AI API·서버" value={q.costMemo.api} onChange={(v) => upd({ costMemo: { ...q.costMemo, api: v } })} suffix="원" />
              <Num label="기타" value={q.costMemo.other} onChange={(v) => upd({ costMemo: { ...q.costMemo, other: v } })} suffix="원" />
            </div>
            {cost > 0 && (
              <p className="small">
                예상 원가 {eokMan(cost)} · {PAY_LABEL[q.payment.type]} 기간 전체 예상 수입 {eokMan(plan.total)} · 예상 마진{" "}
                <strong>
                  {eokMan(plan.total - cost)} ({plan.total ? Math.round(((plan.total - cost) / plan.total) * 100) : 0}%)
                </strong>
                {q.payment.type !== "lump" && ` · 처음 받는 금액으로 원가의 ${Math.round((plan.upfront / cost) * 100)}%를 충당`}
              </p>
            )}
            <textarea rows={2} aria-label="원가 메모" placeholder="메모" value={q.costMemo.note} onChange={(e) => upd({ costMemo: { ...q.costMemo, note: e.target.value } })} />
          </section>
        </fieldset>
      )}

      {data.views.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>열람 기록</h2>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {data.views.map((v) => (
              <li key={v.at}>
                {fmt(v.at)} · {v.device || "-"}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div style={{ marginTop: 24 }} className="row">
        {q.status === "sent" && (
          <button className="btn ghost small" disabled={!!busy} onClick={close}>
            링크 닫기
          </button>
        )}
        <button className="btn danger small" disabled={!!busy} onClick={remove}>
          이 버전 삭제
        </button>
      </div>
    </>
  );
}
