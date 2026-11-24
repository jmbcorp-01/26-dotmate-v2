"use client";

import { useState } from "react";
import Link from "next/link";
import { api, errorText, manwon } from "@/lib/api";
import { useData } from "@/lib/useData";
import { STAGES, type Deal, type Stage } from "@/lib/types";

const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

export default function Pipeline() {
  const { data, error, setData } = useData<{ items: Deal[] }>("/deals");
  const [over, setOver] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const t = today();

  async function move(id: string, stage: Stage) {
    const d = data?.items.find((x) => x.id === id);
    if (!d || d.stage === stage || !data) return;
    const prev = data;
    setData({ items: data.items.map((x) => (x.id === id ? { ...x, stage } : x)) });
    try {
      await api(`/deals/${id}`, { method: "PUT", body: { ...d, stage } });
      setMsg("");
    } catch (e) {
      setData(prev);
      setMsg(errorText(e));
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>영업 파이프라인</h1>
          <p className="muted">카드를 끌어 단계를 옮기거나, 카드 안에서 단계를 고르세요. 영업 건은 기업 상세에서 추가합니다.</p>
        </div>
      </div>
      {(error || msg) && <p className="notice">{error || msg}</p>}
      {!data ? (
        <p className="muted">불러오는 중...</p>
      ) : (
        <div className="board">
          {STAGES.map((s) => {
            const items = data.items.filter((d) => d.stage === s).sort((a, b) => (a.nextDate || "9999").localeCompare(b.nextDate || "9999"));
            const sum = items.reduce((n, d) => n + (d.amount || 0), 0);
            return (
              <section
                key={s}
                className={`col${over === s ? " over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(s);
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  move(e.dataTransfer.getData("text/plain"), s);
                }}
                aria-label={s}
              >
                <div className="col-head">
                  <span>{s}</span>
                  <span className="muted">
                    {items.length}
                    {sum ? ` · ${manwon(sum)}` : ""}
                  </span>
                </div>
                {items.map((d) => (
                  <article key={d.id} className="deal" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", d.id)}>
                    <Link href={`/company/?id=${d.companyId}`} style={{ textDecoration: "none" }}>
                      <strong>{d.companyName}</strong>
                    </Link>
                    <span className="small">{d.title}</span>
                    {d.amount ? <span className="small muted">{manwon(d.amount)}원</span> : null}
                    {(d.nextAction || d.nextDate) && (
                      <span className={`small ${d.nextDate && d.nextDate < t ? "overdue" : "muted"}`}>
                        {d.nextDate ? `${d.nextDate} ` : ""}
                        {d.nextAction}
                      </span>
                    )}
                    <select value={d.stage} onChange={(e) => move(d.id, e.target.value as Stage)} aria-label={`${d.companyName} 단계`}>
                      {STAGES.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
