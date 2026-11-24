"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { useData } from "@/lib/useData";
import {
  BLOCKS,
  STATUS_LABEL,
  templateFor,
  templateForAi,
  type BlockKey,
  type Blocks,
  type Proposal,
  type ProposalView,
} from "@/lib/proposal";
import ProposalDoc from "@/components/ProposalDoc";

type Detail = { proposal: Proposal; views: ProposalView[] };
type Row = Record<string, string>;

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" }) : "-");

// 블록별 입력 칸
const ROWS: Partial<Record<BlockKey, { key: string; label: string }[]>> = {
  problems: [
    { key: "problem", label: "지금의 문제" },
    { key: "solution", label: "AI로 바꾸는 방법" },
  ],
  areas: [
    { key: "title", label: "영역" },
    { key: "body", label: "설명" },
  ],
  beforeAfter: [
    { key: "before", label: "도입 전" },
    { key: "after", label: "도입 후" },
  ],
  plan: [
    { key: "phase", label: "단계" },
    { key: "period", label: "기간" },
    { key: "body", label: "내용" },
  ],
};
const ROI_FIELDS = [
  { key: "label", label: "항목" },
  { key: "value", label: "예상 효과" },
];
const COST_FIELDS = [
  { key: "item", label: "항목" },
  { key: "amount", label: "예상 비용" },
  { key: "note", label: "비고" },
];

function RowsEdit({ fields, rows, onChange }: { fields: { key: string; label: string }[]; rows: Row[]; onChange: (r: Row[]) => void }) {
  const set = (i: number, k: string, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="grid" style={{ gap: 8 }}>
      {rows.map((r, i) => (
        <div key={i} className={`block-row${fields.length === 3 ? " three" : ""}`}>
          {fields.map((f) => (
            <textarea key={f.key} aria-label={f.label} placeholder={f.label} rows={2} value={r[f.key] || ""} onChange={(e) => set(i, f.key, e.target.value)} />
          ))}
          <button type="button" className="btn ghost small" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="줄 삭제">
            삭제
          </button>
        </div>
      ))}
      <div>
        <button type="button" className="btn ghost small" onClick={() => onChange([...rows, Object.fromEntries(fields.map((f) => [f.key, ""]))])}>
          줄 추가
        </button>
      </div>
    </div>
  );
}

function LinesEdit({ value, onChange, label }: { value: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <label>
      <span className="small muted">{label} (한 줄에 하나)</span>
      <textarea rows={Math.max(3, value.length + 1)} value={value.join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} />
    </label>
  );
}

function BlockEditor({ k, blocks, set }: { k: BlockKey; blocks: Blocks; set: (b: Blocks) => void }) {
  if (k === "cover")
    return (
      <div className="grid" style={{ gap: 8 }}>
        <label>
          <span className="small muted">제목</span>
          <input value={blocks.cover?.title || ""} onChange={(e) => set({ ...blocks, cover: { subtitle: "", ...blocks.cover, title: e.target.value } })} />
        </label>
        <label>
          <span className="small muted">부제</span>
          <input value={blocks.cover?.subtitle || ""} onChange={(e) => set({ ...blocks, cover: { title: "", ...blocks.cover, subtitle: e.target.value } })} />
        </label>
      </div>
    );
  if (k === "situation" || k === "nextStep")
    return <LinesEdit label={k === "situation" ? "고객 현황" : "다음 단계"} value={blocks[k] || []} onChange={(v) => set({ ...blocks, [k]: v })} />;
  if (k === "roi" || k === "cost") {
    const v = blocks[k] || { items: [], note: "" };
    return (
      <div className="grid" style={{ gap: 8 }}>
        <RowsEdit fields={k === "roi" ? ROI_FIELDS : COST_FIELDS} rows={v.items as Row[]} onChange={(items) => set({ ...blocks, [k]: { ...v, items } })} />
        <label>
          <span className="small muted">{k === "roi" ? "근거와 가정" : "비용 안내"}</span>
          <textarea rows={2} value={v.note} onChange={(e) => set({ ...blocks, [k]: { ...v, note: e.target.value } })} />
        </label>
      </div>
    );
  }
  const fields = ROWS[k]!;
  return <RowsEdit fields={fields} rows={(blocks[k] as Row[] | undefined) || []} onChange={(rows) => set({ ...blocks, [k]: rows })} />;
}

// 빈 줄을 지우고 저장
function tidy(b: Blocks): Blocks {
  const lines = (v?: string[]) => (v || []).map((s) => s.trim()).filter(Boolean);
  const rows = <T extends object>(v?: T[]) => (v || []).filter((r) => Object.values(r).some((x) => String(x).trim()));
  return {
    ...b,
    situation: lines(b.situation),
    nextStep: lines(b.nextStep),
    problems: rows(b.problems),
    areas: rows(b.areas),
    beforeAfter: rows(b.beforeAfter),
    plan: rows(b.plan),
    roi: b.roi && { ...b.roi, items: rows(b.roi.items) },
    cost: b.cost && { ...b.cost, items: rows(b.cost.items) },
  };
}

export default function ProposalEditor() {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => setId(new URLSearchParams(window.location.search).get("id")), []);
  const { data, error, reload } = useData<Detail>(id ? `/proposals/${id}` : null);

  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Blocks>({});
  const [flags, setFlags] = useState<Partial<Record<BlockKey, true>>>({});
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [days, setDays] = useState(30);
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState<{ usd: number; cap: number } | null>(null);

  const p = data?.proposal;
  const load = (x: Proposal) => {
    setTitle(x.title);
    setBlocks(x.blocks || {});
    setFlags(x.flags || {});
    setDirty(false);
  };
  useEffect(() => {
    if (p) load(p);
  }, [p]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (error) return <p className="notice">{error}</p>;
  if (!p) return <p className="muted">불러오는 중...</p>;

  const closed = p.status === "closed";
  const unverified = BLOCKS.filter((b) => flags[b.key]);
  const link = p.code ? `${window.location.origin}/p/?c=${p.code}` : "";
  const keys = p.kind === "intro" ? BLOCKS.filter((b) => b.key === "cover") : BLOCKS;

  const edit = (b: Blocks) => {
    setBlocks(b);
    setDirty(true);
  };

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

  const save = () =>
    run("save", async () => {
      const r = await api<Proposal>(`/proposals/${p.id}`, { method: "PUT", body: { title, blocks: tidy(blocks), flags } });
      load(r);
      reload();
    });

  const aiDraft = () =>
    run("ai", async () => {
      if (dirty && !confirm("저장하지 않은 수정 내용이 AI 초안으로 바뀝니다. 계속할까요?")) return;
      if (!dirty && !confirm("지금 맞춤 블록을 AI 초안으로 바꿀까요? (30초 정도 걸립니다)")) return;
      const r = await api<{ proposal: Proposal; usage: { usd: number; cap: number } }>(`/proposals/${p.id}/ai`, {
        method: "POST",
        body: { template: templateForAi(templateFor(p.industry)) },
      });
      setUsage(r.usage);
      load(r.proposal);
      reload();
    });

  const send = () =>
    run("send", async () => {
      if (dirty) {
        const r = await api<Proposal>(`/proposals/${p.id}`, { method: "PUT", body: { title, blocks: tidy(blocks), flags } });
        load(r);
      }
      await api(`/proposals/${p.id}/send`, { method: "POST", body: { days } });
      reload();
    });

  const setStatus = (action: "close" | "reopen") =>
    run(action, async () => {
      await api(`/proposals/${p.id}/${action}`, { method: "POST" });
      reload();
    });

  const remove = () =>
    run("delete", async () => {
      if (!confirm("이 문서와 열람 기록을 삭제할까요? 보낸 링크도 더 이상 열리지 않습니다.")) return;
      await api(`/proposals/${p.id}`, { method: "DELETE" });
      router.push("/proposals/");
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

  return (
    <>
      <div className="head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="small muted">
            <Link href="/proposals/">제안서</Link> / <Link href={`/company/?id=${p.companyId}`}>{p.companyName}</Link> ·{" "}
            {p.kind === "intro" ? "회사소개서" : `미니 제안 (${templateFor(p.industry).name} 템플릿)`}
          </p>
          <input
            className="title-input"
            aria-label="제목"
            value={title}
            disabled={closed}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            style={{ fontSize: 20, fontWeight: 700, width: "100%" }}
          />
          <p className="small muted" style={{ marginTop: 6 }}>
            <span className={`badge ${p.status === "sent" ? "good" : ""}`}>{STATUS_LABEL[p.status]}</span> 열람 {p.views || 0}회
            {p.lastViewedAt && ` · 마지막 ${fmt(p.lastViewedAt)}`}
            {p.aiAt && ` · AI 초안 ${fmt(p.aiAt)}`}
            {usage && ` · 이번 달 AI 사용 $${usage.usd.toFixed(2)} / $${usage.cap}`}
          </p>
        </div>
        <div className="row">
          {p.kind === "mini" && !closed && (
            <button className="btn ghost" disabled={!!busy} onClick={aiDraft}>
              {busy === "ai" ? "AI가 쓰는 중... (약 30초)" : "AI로 맞춤 블록 채우기"}
            </button>
          )}
          {!closed && (
            <button className="btn" disabled={!!busy || !dirty} onClick={save}>
              {busy === "save" ? "저장 중..." : dirty ? "저장" : "저장됨"}
            </button>
          )}
        </div>
      </div>

      {err && <p className="notice">{err}</p>}

      <section className="card form" style={{ marginBottom: 16 }}>
        {closed ? (
          <div className="spread">
            <span>닫힌 문서입니다. 고객 링크도 열리지 않습니다.</span>
            <button className="btn ghost small" disabled={!!busy} onClick={() => setStatus("reopen")}>
              다시 열기
            </button>
          </div>
        ) : unverified.length > 0 ? (
          <p className="notice" style={{ margin: 0 }}>
            AI가 쓴 블록 {unverified.length}개를 확인해야 발송할 수 있습니다: {unverified.map((b) => b.label).join(", ")}. 사실과 다른 내용이 없는지 보고 각 블록의 &quot;확인함&quot;을 누르세요.
          </p>
        ) : (
          <div className="row">
            <label className="row small">
              열람 기간
              <input type="number" min={1} max={180} value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 70 }} />일
            </label>
            <button className="btn" disabled={!!busy} onClick={send}>
              {busy === "send" ? "만드는 중..." : p.code ? "열람 기간 늘리기" : "발송 링크 만들기"}
            </button>
            {p.expiresAt && <span className="small muted">{fmt(p.expiresAt)}까지 열림</span>}
          </div>
        )}
        {link && (
          <div className="row" style={{ marginTop: 8 }}>
            <input readOnly value={link} aria-label="고객용 링크" style={{ flex: 1, minWidth: 200 }} onFocus={(e) => e.target.select()} />
            <button className="btn ghost small" onClick={copy}>
              {copied ? "복사됨" : "링크 복사"}
            </button>
            <a className="btn ghost small" href={`/p/?c=${p.code}&preview=1`} target="_blank" rel="noreferrer">
              고객 화면 열기
            </a>
          </div>
        )}
        {link && <p className="small muted">링크를 메일이나 메시지로 직접 보내세요. 고객이 열면 열람 기록이 남고, 처음 열었을 때 기업 활동 기록에도 남습니다.</p>}
      </section>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "edit"} onClick={() => setTab("edit")}>
          편집
        </button>
        <button role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>
          미리보기
        </button>
      </div>

      {tab === "edit" && (
        <div className="grid" style={{ gap: 12 }}>
          {keys.map(({ key, label }) => (
            <section key={key} className={`card form block-edit${flags[key] ? " doc-flag" : ""}`}>
              <div className="spread">
                <h2 style={{ margin: 0, fontSize: 16 }}>
                  {label} {flags[key] && <span className="badge warn">AI 초안 · 확인 필요</span>}
                </h2>
                {flags[key] && !closed && (
                  <button
                    className="btn small"
                    onClick={() => {
                      const { [key]: _, ...rest } = flags;
                      setFlags(rest);
                      setDirty(true);
                    }}
                  >
                    확인함
                  </button>
                )}
              </div>
              <fieldset disabled={closed} style={{ border: 0, padding: 0, margin: 0 }}>
                <BlockEditor k={key} blocks={blocks} set={edit} />
              </fieldset>
            </section>
          ))}
          {p.kind === "intro" && (
            <p className="small muted">회사소개서는 표지 말고는 모든 기업에 같은 표준 내용(회사 개요, 경쟁력, 레퍼런스, 서비스, 수행 방법)이 들어갑니다. 미리보기에서 확인하세요.</p>
          )}
        </div>
      )}
      {tab === "preview" && <ProposalDoc kind={p.kind} companyName={p.companyName} industry={p.industry} blocks={tidy(blocks)} flags={flags} />}

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
        {!closed && p.status === "sent" && (
          <button className="btn ghost small" disabled={!!busy} onClick={() => setStatus("close")}>
            링크 닫기
          </button>
        )}
        <button className="btn danger small" disabled={!!busy} onClick={remove}>
          삭제
        </button>
      </div>
    </>
  );
}
