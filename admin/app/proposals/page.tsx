"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { errorText } from "@/lib/api";
import { useData } from "@/lib/useData";
import type { Company } from "@/lib/types";
import { STATUS_LABEL, type Proposal } from "@/lib/proposal";
import { createProposal } from "@/lib/proposalApi";

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" }) : "-");

export default function Proposals() {
  const router = useRouter();
  const { data, error } = useData<{ items: Proposal[] }>("/proposals");
  const companies = useData<{ items: Company[] }>("/companies");
  const [status, setStatus] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const rows = useMemo(() => (data?.items || []).filter((p) => !status || p.status === status), [data, status]);
  const sortedCompanies = useMemo(
    () => [...(companies.data?.items || [])].sort((a, b) => b.scoreTotal - a.scoreTotal || a.name.localeCompare(b.name)),
    [companies.data],
  );

  async function create(kind: "mini" | "intro") {
    const c = sortedCompanies.find((x) => x.id === companyId);
    if (!c) return setErr("기업을 먼저 고르세요.");
    setBusy(true);
    setErr("");
    try {
      const p = await createProposal(c, kind);
      router.push(`/proposal/?id=${p.id}`);
    } catch (e) {
      setErr(errorText(e));
      setBusy(false);
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>제안서</h1>
          <p className="muted">기업별 미니 제안서와 회사소개서. 발송한 링크를 고객이 열면 여기서 열람 기록을 볼 수 있습니다.</p>
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
          <button className="btn" disabled={busy} onClick={() => create("mini")}>
            미니 제안서 만들기
          </button>
          <button className="btn ghost" disabled={busy} onClick={() => create("intro")}>
            회사소개서 만들기
          </button>
        </div>
        {err && <p className="notice">{err}</p>}
      </section>

      <div className="row" style={{ marginBottom: 12 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="상태">
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <span className="small muted">{data ? `${rows.length}건` : ""}</span>
      </div>

      {error && <p className="notice">{error}</p>}
      {!data && !error && <p className="muted">불러오는 중...</p>}
      {data && rows.length === 0 && <p className="empty">아직 제안서가 없습니다. 위에서 기업을 고르거나 기업 상세에서 만들 수 있습니다.</p>}
      {rows.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>제목</th>
                <th>기업</th>
                <th>종류</th>
                <th>상태</th>
                <th>열람</th>
                <th>마지막 열람</th>
                <th>수정</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const unverified = Object.keys(p.flags || {}).length;
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/proposal/?id=${p.id}`}>{p.title}</Link>
                      {unverified > 0 && <span className="badge warn"> 확인 필요 {unverified}</span>}
                    </td>
                    <td>
                      <Link href={`/company/?id=${p.companyId}`}>{p.companyName}</Link>
                    </td>
                    <td>{p.kind === "intro" ? "회사소개서" : "미니 제안"}</td>
                    <td>
                      <span className={`badge ${p.status === "sent" ? "good" : ""}`}>{STATUS_LABEL[p.status]}</span>
                    </td>
                    <td>{p.views || 0}회</td>
                    <td>{fmt(p.lastViewedAt)}</td>
                    <td>{fmt(p.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
