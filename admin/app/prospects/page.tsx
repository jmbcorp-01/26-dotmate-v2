"use client";

import { useEffect, useMemo, useState } from "react";
import { api, errorText } from "@/lib/api";
import { INDUSTRIES } from "@/lib/types";
import Pager from "@/components/Pager";
import { INDUSTRY_RULES, REGIONS, readNpsFile, type Prospect } from "@/lib/nps";

type Meta = { ym: string; counts: Record<string, number>; fileName?: string; loadedAt: string } | null;
type Row = Prospect & {
  key: string;
  registered: boolean;
  sales?: number;
  profit?: number;
  finYear?: string;
  finStatus?: string;
};
type FinResult = { key: string; status: string; sales?: number; profit?: number; finYear?: string };

const eok = (n?: number) => (n === undefined || !Number.isFinite(n) ? "" : `${(n / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: n >= 1e9 ? 0 : 1 })}억`);
const FIN_STATUS: Record<string, string> = {
  no_corp: "법인 정보 없음",
  ambiguous: "동명 법인 여러 곳",
  no_finance: "재무 공시 없음",
  data_not_approved: "재무 API 승인 대기",
  data_limit: "조회 한도 초과",
};
type SearchResult = { meta: Meta; total: number; page?: number; pages?: number; items: Row[] };

const SOURCE_URL = "https://www.data.go.kr/data/15083277/fileData.do";

// 타겟 DB: 국민연금 가입 사업장 자료에서 산업별 후보 기업을 찾고, 골라서 "타겟 기업"으로 넘깁니다.
export default function ProspectsPage() {
  const [industry, setIndustry] = useState<string>(INDUSTRIES[0]);
  const [region, setRegion] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [q, setQ] = useState("");
  const [corp, setCorp] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showLoad, setShowLoad] = useState(false);
  const [page, setPage] = useState(1);

  const filters = useMemo(() => {
    const p = new URLSearchParams({ industry });
    if (region) p.set("region", region);
    if (min) p.set("min", min);
    if (max) p.set("max", max);
    if (q.trim()) p.set("q", q.trim());
    if (corp) p.set("corp", "1");
    return p.toString();
  }, [industry, region, min, max, q, corp]);
  // 조건이 바뀌면 1쪽부터, 고른 기업도 비웁니다.
  useEffect(() => {
    setPage(1);
    setPicked(new Set());
  }, [filters]);
  const query = `${filters}&page=${page}&size=50`;

  async function search() {
    setBusy(true);
    setError("");
    try {
      const r = await api<SearchResult>(`/prospects?${query}`);
      setResult(r);
      if (!r.meta) setShowLoad(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(search, q || min || max ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function lookupFinance() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const keys = [...picked];
      const all: FinResult[] = [];
      for (let i = 0; i < keys.length; i += 10) {
        const r = await api<{ results: FinResult[] }>("/prospects/finance", {
          method: "POST",
          body: { items: keys.slice(i, i + 10).map((key) => ({ industry, key })) },
        });
        all.push(...r.results);
        const byKey = new Map(all.map((x) => [x.key, x]));
        setResult((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((it) => {
                  const f = byKey.get(it.key);
                  return f ? { ...it, finStatus: f.status, sales: f.sales, profit: f.profit, finYear: f.finYear } : it;
                }),
              }
            : prev,
        );
        setNotice(`매출 조회 중... ${all.length}/${keys.length}`);
      }
      const ok = all.filter((x) => x.status === "ok").length;
      const notApproved = all.some((x) => x.status === "data_not_approved");
      setNotice(
        `${all.length}곳 중 ${ok}곳의 매출을 찾았습니다.` +
          (notApproved ? " 재무정보 API 승인이 아직 반영되지 않아 일부는 비어 있습니다. 1~2시간 뒤 다시 눌러 보세요." : " 비상장 소기업은 재무 공시가 없을 수 있습니다."),
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function promote() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const items = [...picked].map((key) => ({ industry, key }));
      const r = await api<{ created: number; skipped: string[] }>("/prospects/promote", { method: "POST", body: { items } });
      setNotice(
        `${r.created}곳을 타겟 기업에 등록했습니다.` + (r.skipped.length ? ` 이미 있는 ${r.skipped.length}곳은 건너뛰었습니다.` : "") + " 타겟 기업 화면에서 점수를 매겨 주세요.",
      );
      setPicked(new Set());
      await search();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const rows = result?.items || [];
  const selectable = rows.filter((r) => !r.registered);
  // "모두 선택"은 이 쪽의 기업을 고릅니다. 다른 쪽에서 고른 것은 그대로 둡니다(최대 100곳).
  const allPicked = selectable.length > 0 && selectable.every((r) => picked.has(r.key));
  const toggle = (key: string) => {
    const next = new Set(picked);
    if (next.has(key)) next.delete(key);
    else if (next.size < 100) next.add(key);
    setPicked(next);
  };
  const meta = result?.meta;

  return (
    <>
      <div className="head">
        <div>
          <h1>타겟 DB</h1>
          <p className="muted">
            {meta
              ? `국민연금 가입 사업장 ${meta.ym} 자료 · ${industry} 후보 ${(meta.counts[industry] || 0).toLocaleString("ko-KR")}곳`
              : "아직 불러온 자료가 없습니다. 먼저 국민연금 가입 사업장 파일을 불러와 주세요."}
          </p>
        </div>
        <button className="btn ghost" onClick={() => setShowLoad(!showLoad)}>
          {showLoad ? "닫기" : "자료 불러오기"}
        </button>
      </div>

      {showLoad && <Loader meta={meta ?? null} onDone={search} />}

      <div className="row" style={{ marginBottom: 12 }}>
        <select style={{ maxWidth: 200 }} value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="산업">
          {INDUSTRIES.filter((i) => i !== "기타").map((i) => (
            <option key={i} value={i}>
              {i}
              {meta?.counts[i] ? ` (${meta.counts[i].toLocaleString("ko-KR")})` : ""}
            </option>
          ))}
        </select>
        <select style={{ maxWidth: 120 }} value={region} onChange={(e) => setRegion(e.target.value)} aria-label="지역">
          <option value="">전국</option>
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <input style={{ maxWidth: 110 }} inputMode="numeric" placeholder="직원 최소" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} aria-label="최소 직원 수" />
        <input style={{ maxWidth: 110 }} inputMode="numeric" placeholder="직원 최대" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} aria-label="최대 직원 수" />
        <input style={{ maxWidth: 220 }} placeholder="회사명, 업종, 주소 검색" value={q} onChange={(e) => setQ(e.target.value)} aria-label="검색" />
        <label className="check">
          <input type="checkbox" checked={corp} onChange={(e) => setCorp(e.target.checked)} /> 법인만
        </label>
      </div>

      {error && <p className="notice" style={{ marginBottom: 12 }}>{error}</p>}
      {notice && <p className="notice ok" style={{ marginBottom: 12 }}>{notice}</p>}

      <div className="spread" style={{ marginBottom: 8 }}>
        <p className="muted small">
          {result ? `조건에 맞는 ${result.total.toLocaleString("ko-KR")}곳 · 직원 수 많은 순` : "불러오는 중..."}
          {busy && " · 불러오는 중..."}
          {picked.size > 0 && ` · ${picked.size}곳 선택`}
        </p>
        <div className="row">
          <button className="btn ghost" disabled={busy || picked.size === 0} onClick={lookupFinance} title="금융위원회 재무정보에서 매출을 조회합니다">
            선택한 기업 매출 조회
          </button>
          <button className="btn" disabled={busy || picked.size === 0} onClick={promote}>
            선택한 기업 타겟 등록
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="이 쪽 모두 선택"
                  title="이 쪽 모두 선택 (전체 최대 100곳)"
                  checked={allPicked}
                  disabled={!selectable.length}
                  onChange={() => {
                    const next = new Set(picked);
                    if (allPicked) selectable.forEach((r) => next.delete(r.key));
                    else for (const r of selectable) if (next.size < 100) next.add(r.key);
                    setPicked(next);
                  }}
                />
              </th>
              <th>회사명</th>
              <th>업종</th>
              <th>직원 수</th>
              <th>매출</th>
              <th>지역</th>
              <th>주소</th>
              <th>국민연금 적용일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={r.registered ? "" : "link"} onClick={() => !r.registered && toggle(r.key)}>
                <td>
                  {r.registered ? (
                    <span className="badge good">등록됨</span>
                  ) : (
                    <input type="checkbox" aria-label={`${r.name} 선택`} checked={picked.has(r.key)} onChange={() => toggle(r.key)} onClick={(e) => e.stopPropagation()} />
                  )}
                </td>
                <td>
                  <strong>{r.name}</strong>
                  {r.corp && <span className="muted small"> 법인</span>}
                </td>
                <td className="wrap">{r.kind}</td>
                <td>{r.employees.toLocaleString("ko-KR")}명</td>
                <td>
                  {r.sales !== undefined && r.sales !== null ? (
                    <span title={r.profit !== undefined ? `영업이익 ${eok(r.profit)}` : undefined}>
                      {eok(r.sales)} <span className="muted small">{r.finYear}</span>
                    </span>
                  ) : r.finStatus && r.finStatus !== "ok" ? (
                    <span className="muted small">{FIN_STATUS[r.finStatus] || "조회 실패"}</span>
                  ) : (
                    <span className="muted">-</span>
                  )}
                </td>
                <td>{r.region || "-"}</td>
                <td className="wrap muted small">{r.address || "-"}</td>
                <td className="muted">{r.since || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {result && rows.length === 0 && <p className="empty">{meta ? "조건에 맞는 기업이 없습니다." : "자료를 불러오면 여기에 후보 기업이 나옵니다."}</p>}
      </div>
      <Pager page={result?.page || page} pages={result?.pages || 1} onPage={(p) => (setPage(p), window.scrollTo(0, 0))} />
      <p className="muted small" style={{ marginTop: 8 }}>
        직원 수는 국민연금 가입자 수 기준입니다. 매출은 회사를 골라 "선택한 기업 매출 조회"를 누르면 금융위원회 재무정보에서 가져옵니다(한 번에 최대 100곳, 하루 약 5,000곳). 국민연금 자료에는 가입자 3명 이상 법인과 10명 이상 개인사업장만 들어 있습니다.
      </p>
    </>
  );
}

function Loader({ meta, onDone }: { meta: Meta; onDone: () => void }) {
  const [state, setState] = useState<{ ratio: number; matched: number; saved: number } | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function load(file: File) {
    setError("");
    setDone("");
    setState({ ratio: 0, matched: 0, saved: 0 });
    let saved = 0;
    try {
      const pending: Promise<void>[] = [];
      const send = async (rows: Prospect[], ym: string) => {
        const r = await api<{ saved: number }>("/prospects/load", { method: "POST", body: { ym, rows } });
        saved += r.saved;
        setState((s) => (s ? { ...s, saved } : s));
      };
      const res = await readNpsFile(
        file,
        async (rows, ym) => {
          // 서버에 동시에 3개까지 보냅니다.
          const p = send(rows, ym).finally(() => pending.splice(pending.indexOf(p), 1));
          pending.push(p);
          if (pending.length >= 3) await Promise.race(pending);
        },
        (ratio, matched) => setState((s) => ({ ratio, matched, saved: s?.saved ?? 0 })),
      );
      await Promise.all(pending);
      await api("/prospects/load", { method: "POST", body: { ym: res.ym, rows: [], done: true, counts: res.counts, fileName: file.name } });
      setDone(`${res.ym} 자료 ${res.total.toLocaleString("ko-KR")}곳 중 타겟 산업 후보 ${saved.toLocaleString("ko-KR")}곳을 저장했습니다.`);
      onDone();
    } catch (e) {
      setError(e instanceof Error && e.message === "not_nps_file" ? "국민연금 가입 사업장 CSV 파일이 아닌 것 같습니다. 파일을 다시 확인해 주세요." : errorText(e));
    }
  }

  return (
    <div className="card form" style={{ marginBottom: 16 }}>
      <h2>국민연금 가입 사업장 자료 불러오기</h2>
      <ol className="muted" style={{ margin: 0, paddingLeft: 18 }}>
        <li>
          <a href={SOURCE_URL} target="_blank" rel="noreferrer">
            공공데이터포털 국민연금 가입 사업장 내역
          </a>
          에서 CSV 파일을 내려받습니다. 로그인 없이 받을 수 있고, 매달 22일쯤 새 자료가 올라옵니다.
        </li>
        <li>아래에서 그 파일을 고르면 이 브라우저가 파일을 읽어 타겟 산업에 해당하는 사업장만 저장합니다. 파일 전체는 서버로 올라가지 않습니다.</li>
      </ol>
      {meta && (
        <p className="small muted">
          지금 자료: {meta.ym} ({meta.fileName || "파일명 없음"}) · {new Date(meta.loadedAt).toLocaleString("ko-KR")} 불러옴
        </p>
      )}
      <details className="small muted">
        <summary>산업 분류 기준 보기</summary>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          {INDUSTRY_RULES.map((r) => (
            <li key={r.industry}>
              {r.industry}: 업종명에 {r.pattern.source.replaceAll("|", ", ").replaceAll("\\s?", " ")} 포함, 가입자 {r.minEmployees}명 이상
              {r.corpOnly ? ", 법인만" : ""}
            </li>
          ))}
        </ul>
      </details>
      <input type="file" accept=".csv,text/csv" disabled={!!state && !done && !error} onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
      {state && !done && !error && (
        <div className="grid" style={{ gap: 6 }}>
          <div className="bar">
            <span style={{ width: `${Math.round(state.ratio * 100)}%` }} />
          </div>
          <p className="small muted">
            {Math.round(state.ratio * 100)}% 읽음 · 후보 {state.matched.toLocaleString("ko-KR")}곳 찾음 · {state.saved.toLocaleString("ko-KR")}곳 저장
          </p>
        </div>
      )}
      {done && <p className="notice ok">{done}</p>}
      {error && <p className="notice">{error}</p>}
    </div>
  );
}
