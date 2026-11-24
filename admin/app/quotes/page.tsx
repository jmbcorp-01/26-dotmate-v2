"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { errorText } from "@/lib/api";
import { useData } from "@/lib/useData";
import type { Company } from "@/lib/types";
import { PAY_LABEL, QUOTE_STATUS, eokMan, type Quote } from "@/lib/quote";
import { createQuote, useQuoteSettings } from "@/lib/quoteApi";

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" }) : "-");

export default function Quotes() {
  const router = useRouter();
  const { data, error } = useData<{ items: Quote[] }>("/quotes");
  const companies = useData<{ items: Company[] }>("/companies");
  const { settings } = useQuoteSettings();
  const [status, setStatus] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const rows = useMemo(() => (data?.items || []).filter((q) => (status ? q.status === status : q.status !== "superseded")), [data, status]);
  const sortedCompanies = useMemo(() => [...(companies.data?.items || [])].sort((a, b) => b.scoreTotal - a.scoreTotal || a.name.localeCompare(b.name)), [companies.data]);
  const approvedSum = (data?.items || []).filter((q) => q.status === "approved").reduce((a, q) => a + (q.totals?.supply || 0), 0);

  async function create() {
    const c = sortedCompanies.find((x) => x.id === companyId);
    if (!c) return setErr("기업을 먼저 고르세요.");
    setBusy(true);
    setErr("");
    try {
      const q = await createQuote(c, settings);
      router.push(`/quote/?id=${q.id}`);
    } catch (e) {
      setErr(errorText(e));
      setBusy(false);
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>견적서</h1>
          <p className="muted">2026년 SW기술자 단가로 기준가를 계산하고, 지급 방식(일시불, 구독형, 성과 연동형, 혼합형)을 골라 보냅니다.{approvedSum > 0 && ` 승인된 견적 기준가 합계 ${eokMan(approvedSum)}.`}</p>
        </div>
      </div>

      <section className="card form" style={{ marginBottom: 16 }}>
        <div className="row">
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} aria-label="기업 선택" style={{ minWidth: 220 }}>
            <option value="">기업 선택</option>
            {sortedCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.grade ? `(${c.grade})` : ""} · {c.industry}
              </option>
            ))}
          </select>
          <button className="btn" disabled={busy} onClick={create}>
            견적 만들기
          </button>
        </div>
        {err && <p className="notice">{err}</p>}
      </section>

      <div className="row" style={{ marginBottom: 12 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="상태">
          <option value="">최신 버전 전체</option>
          {Object.entries(QUOTE_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <span className="small muted">{data ? `${rows.length}건` : ""}</span>
      </div>

      {error && <p className="notice">{error}</p>}
      {!data && !error && <p className="muted">불러오는 중...</p>}
      {data && rows.length === 0 && <p className="empty">아직 견적서가 없습니다. 위에서 기업을 고르거나 기업 상세에서 만들 수 있습니다.</p>}
      {rows.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>제목</th>
                <th>기업</th>
                <th>기준가</th>
                <th>지급 방식</th>
                <th>상태</th>
                <th>열람</th>
                <th>수정</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id}>
                  <td>
                    <Link href={`/quote/?id=${q.id}`}>{q.title}</Link> <span className="small muted">v{q.version}</span>
                    {(q.requests?.length || 0) > 0 && q.status === "sent" && <span className="badge warn"> 수정 요청</span>}
                  </td>
                  <td>
                    <Link href={`/company/?id=${q.companyId}`}>{q.companyName}</Link>
                  </td>
                  <td>{eokMan(q.totals?.supply || 0)}</td>
                  <td>{PAY_LABEL[q.payment?.type || "lump"]}</td>
                  <td>
                    <span className={`badge ${q.status === "approved" ? "good" : q.status === "sent" ? "B" : ""}`}>{QUOTE_STATUS[q.status]}</span>
                  </td>
                  <td>{q.views || 0}회</td>
                  <td>{fmt(q.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
