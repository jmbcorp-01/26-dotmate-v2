"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { useData } from "@/lib/useData";
import { INDUSTRIES, type Company } from "@/lib/types";

export default function Companies() {
  const router = useRouter();
  const { data, error, reload } = useData<{ items: Company[] }>("/companies");
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("");
  const [grade, setGrade] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new")) setAdding(true);
  }, []);

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (data?.items || [])
      .filter((c) => !industry || c.industry === industry)
      .filter((c) => !grade || (grade === "-" ? !c.grade : c.grade === grade))
      .filter((c) => !k || [c.name, c.region, c.platform, c.memo, c.website].some((v) => v?.toLowerCase().includes(k)))
      .sort((a, b) => b.scoreTotal - a.scoreTotal || b.updatedAt.localeCompare(a.updatedAt));
  }, [data, q, industry, grade]);

  return (
    <>
      <div className="head">
        <div>
          <h1>타겟 기업</h1>
          <p className="muted">
            {data ? `${rows.length} / ${data.items.length}곳` : "불러오는 중..."} · 점수 높은 순
          </p>
        </div>
        <button className="btn" onClick={() => setAdding((v) => !v)}>
          {adding ? "닫기" : "기업 추가"}
        </button>
      </div>

      {adding && (
        <NewCompany
          onCreated={(c) => {
            reload();
            router.push(`/company/?id=${c.id}&lookup=1`);
          }}
        />
      )}

      <div className="row" style={{ marginBottom: 12 }}>
        <input style={{ maxWidth: 260 }} placeholder="회사명, 지역, 플랫폼, 메모 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ maxWidth: 200 }} value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="산업">
          <option value="">전체 산업</option>
          {INDUSTRIES.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
        <select style={{ maxWidth: 140 }} value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="등급">
          <option value="">전체 등급</option>
          <option value="A">A (80점 이상)</option>
          <option value="B">B (60~79점)</option>
          <option value="C">C (60점 미만)</option>
          <option value="-">미채점</option>
        </select>
      </div>

      {error && <p className="notice">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>등급</th>
              <th>회사명</th>
              <th>산업</th>
              <th>점수</th>
              <th>지역</th>
              <th>매출</th>
              <th>플랫폼</th>
              <th>출처</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="link" onClick={() => router.push(`/company/?id=${c.id}`)}>
                <td>{c.grade ? <span className={`badge ${c.grade}`}>{c.grade}</span> : <span className="badge">-</span>}</td>
                <td>
                  <strong>{c.name}</strong>
                </td>
                <td>{c.industry}</td>
                <td>{c.grade ? c.scoreTotal : "-"}</td>
                <td>{c.region || "-"}</td>
                <td>{c.revenue || "-"}</td>
                <td>{c.platform || "-"}</td>
                <td className="muted">{c.source || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && rows.length === 0 && <p className="empty">조건에 맞는 기업이 없습니다.</p>}
      </div>
    </>
  );
}

function NewCompany({ onCreated }: { onCreated: (c: Company) => void }) {
  const [f, setF] = useState({ name: "", industry: "화장품·뷰티", website: "", region: "", source: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      onCreated(await api<Company>("/companies", { method: "POST", body: f }));
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form className="card form" style={{ marginBottom: 16 }} onSubmit={submit}>
      <div className="form-2">
        <label className="field">
          회사명
          <input required value={f.name} onChange={set("name")} />
        </label>
        <label className="field">
          산업
          <select value={f.industry} onChange={set("industry")}>
            {INDUSTRIES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </label>
        <label className="field">
          홈페이지
          <input type="url" placeholder="https://" value={f.website} onChange={set("website")} />
        </label>
        <label className="field">
          지역
          <input value={f.region} onChange={set("region")} />
        </label>
        <label className="field">
          발굴 출처
          <input placeholder="예: 대한화장품협회 회원사, 전시회" value={f.source} onChange={set("source")} />
        </label>
      </div>
      {error && <p className="notice">{error}</p>}
      <div>
        <button className="btn" disabled={busy}>
          추가하고 공공데이터에서 찾기
        </button>
      </div>
    </form>
  );
}
