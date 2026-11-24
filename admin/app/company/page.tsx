"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorText, won } from "@/lib/api";
import { useData } from "@/lib/useData";
import {
  ACTIVITY_TYPES,
  INDUSTRIES,
  PRODUCTS,
  SCORE_ITEMS,
  STAGES,
  type Activity,
  type Company,
  type Contact,
  type Deal,
} from "@/lib/types";

type Detail = { company: Company; contacts: Contact[]; activities: Activity[]; deals: Deal[] };

export default function CompanyPage() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => setId(new URLSearchParams(window.location.search).get("id")), []);
  const { data, error, reload } = useData<Detail>(id ? `/companies/${id}` : null);
  const router = useRouter();

  if (error) return <p className="notice">{error}</p>;
  if (!data) return <p className="muted">불러오는 중...</p>;
  const { company } = data;

  async function remove() {
    if (!confirm(`${company.name}과(와) 담당자, 활동 기록, 영업 건을 모두 삭제할까요? 되돌릴 수 없습니다.`)) return;
    try {
      await api(`/companies/${company.id}`, { method: "DELETE" });
      router.push("/companies/");
    } catch (e) {
      alert(errorText(e));
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <p className="small muted">
            <Link href="/companies/">타겟 기업</Link> / {company.industry}
          </p>
          <h1>
            {company.name} {company.grade && <span className={`badge ${company.grade}`}>{company.grade} · {company.scoreTotal}점</span>}
          </h1>
          {company.website && (
            <a className="small muted" href={company.website} target="_blank" rel="noreferrer">
              {company.website}
            </a>
          )}
        </div>
        <button className="btn danger" onClick={remove}>
          삭제
        </button>
      </div>

      <div className="grid grid-2">
        <div className="grid">
          <Lookup company={company} onSaved={reload} />
          <CompanyForm key={company.updatedAt} company={company} onSaved={reload} />
        </div>
        <div className="grid">
          <Deals company={company} deals={data.deals} onChange={reload} />
          <Contacts company={company} contacts={data.contacts} onChange={reload} />
          <Activities company={company} activities={data.activities} onChange={reload} />
        </div>
      </div>
    </>
  );
}

function CompanyForm({ company, onSaved }: { company: Company; onSaved: () => void }) {
  const [f, setF] = useState(company);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => setF(company), [company]);
  const set = (k: keyof Company) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });
  const total = SCORE_ITEMS.reduce((s, i) => s + (Number(f.score?.[i.key]) || 0), 0);
  const scored = SCORE_ITEMS.some((i) => f.score?.[i.key] !== undefined && String(f.score[i.key]) !== "");
  const grade = !scored ? "미채점" : total >= 80 ? "A · 직접 영업" : total >= 60 ? "B · 맞춤 제안" : "C · 장기 관리";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const score = Object.fromEntries(
        Object.entries(f.score || {}).filter(([, v]) => v !== undefined && String(v) !== "").map(([k, v]) => [k, Number(v)]),
      );
      await api(`/companies/${company.id}`, { method: "PUT", body: { ...f, score } });
      setMsg("저장했습니다.");
      onSaved();
    } catch (err) {
      setMsg(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form" onSubmit={save}>
      <h2>기업 정보</h2>
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
          사업자번호
          <input value={f.bizNo || ""} onChange={set("bizNo")} />
        </label>
        <label className="field">
          대표자
          <input value={f.ceo || ""} onChange={set("ceo")} />
        </label>
        <label className="field">
          설립일
          <input placeholder="예: 2015-03-01" value={f.founded || ""} onChange={set("founded")} />
        </label>
        <label className="field">
          지역
          <input value={f.region || ""} onChange={set("region")} />
        </label>
        <label className="field">
          매출
          <input placeholder="예: 약 120억" value={f.revenue || ""} onChange={set("revenue")} />
        </label>
        <label className="field">
          인원
          <input placeholder="예: 45명" value={f.employees || ""} onChange={set("employees")} />
        </label>
        <label className="field">
          홈페이지
          <input value={f.website || ""} onChange={set("website")} />
        </label>
        <label className="field">
          사용 플랫폼
          <input placeholder="예: 카페24, 자체 개발" value={f.platform || ""} onChange={set("platform")} />
        </label>
      </div>
      <label className="field">
        주소
        <input value={f.address || ""} onChange={set("address")} />
      </label>
      <label className="field">
        발굴 출처
        <input value={f.source || ""} onChange={set("source")} />
      </label>
      <label className="field">
        메모
        <textarea rows={4} value={f.memo || ""} onChange={set("memo")} />
      </label>

      <div className="spread" style={{ marginTop: 8 }}>
        <h2 style={{ margin: 0 }}>스코어링</h2>
        <span className="small">
          <strong>{scored ? `${total}점` : "-"}</strong> · {grade}
        </span>
      </div>
      {SCORE_ITEMS.map((i) => (
        <label className="score-row field" key={i.key}>
          <span>
            {i.label} (0~{i.max})
          </span>
          <input
            type="number"
            min={0}
            max={i.max}
            value={f.score?.[i.key] ?? ""}
            onChange={(e) => setF({ ...f, score: { ...f.score, [i.key]: e.target.value === "" ? undefined : Number(e.target.value) } })}
          />
        </label>
      ))}

      <div className="row">
        <button className="btn" disabled={busy}>
          저장
        </button>
        {msg && <span className="small muted">{msg}</span>}
      </div>
    </form>
  );
}

function Deals({ company, deals, onChange }: { company: Company; deals: Deal[]; onChange: () => void }) {
  const blank = { title: "", product: "무료 AX 진단", stage: "발굴", amount: "", nextAction: "", nextDate: "" };
  const [f, setF] = useState(blank);
  const [open, setOpen] = useState(deals.length === 0);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/deals", {
        method: "POST",
        body: { ...f, title: f.title || `${company.name} ${f.product}`, companyId: company.id, amount: f.amount ? Number(f.amount) : undefined },
      });
      setF(blank);
      setOpen(false);
      onChange();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function update(d: Deal, patch: Partial<Deal>) {
    try {
      await api(`/deals/${d.id}`, { method: "PUT", body: { ...d, ...patch } });
      onChange();
    } catch (err) {
      alert(errorText(err));
    }
  }

  return (
    <section className="card">
      <div className="spread">
        <h2>영업 건</h2>
        <button className="btn ghost small" onClick={() => setOpen((v) => !v)}>
          {open ? "닫기" : "추가"}
        </button>
      </div>
      {open && (
        <form className="form" onSubmit={add} style={{ marginBottom: 12 }}>
          <div className="form-2">
            <label className="field">
              상품
              <select value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })}>
                {PRODUCTS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="field">
              단계
              <select value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })}>
                {STAGES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="field">
              이름 (비우면 &quot;회사명 + 상품&quot;)
              <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            </label>
            <label className="field">
              예상 금액 (원, 부가세 별도)
              <input type="number" min={0} step={10000} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
            </label>
            <label className="field">
              다음 할 일
              <input value={f.nextAction} onChange={(e) => setF({ ...f, nextAction: e.target.value })} />
            </label>
            <label className="field">
              날짜
              <input type="date" value={f.nextDate} onChange={(e) => setF({ ...f, nextDate: e.target.value })} />
            </label>
          </div>
          {error && <p className="notice">{error}</p>}
          <div>
            <button className="btn">영업 건 추가</button>
          </div>
        </form>
      )}
      {deals.length === 0 && !open && <p className="muted">아직 영업 건이 없습니다.</p>}
      <div className="timeline">
        {deals.map((d) => (
          <div key={d.id} className="tl-item">
            <div className="spread">
              <strong>{d.title}</strong>
              <select
                style={{ width: "auto" }}
                value={d.stage}
                onChange={(e) => update(d, { stage: e.target.value as Deal["stage"] })}
                aria-label="단계 변경"
              >
                {STAGES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <p className="small muted">
              {d.product || "-"} · {won(d.amount)}
              {d.nextAction && ` · 다음: ${d.nextAction}`}
              {d.nextDate && ` (${d.nextDate})`}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Contacts({ company, contacts, onChange }: { company: Company; contacts: Contact[]; onChange: () => void }) {
  const blank = { name: "", title: "", phone: "", email: "", consent: false, optOut: false };
  const [f, setF] = useState(blank);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(`/companies/${company.id}/contacts`, { method: "POST", body: f });
      setF(blank);
      setOpen(false);
      onChange();
    } catch (err) {
      setError(errorText(err));
    }
  }
  async function toggle(c: Contact, patch: Partial<Contact>) {
    await api(`/companies/${company.id}/contacts/${c.id}`, { method: "PUT", body: { ...c, ...patch } }).catch((e) => alert(errorText(e)));
    onChange();
  }
  async function remove(c: Contact) {
    if (!confirm(`${c.name} 담당자를 삭제할까요?`)) return;
    await api(`/companies/${company.id}/contacts/${c.id}`, { method: "DELETE" }).catch((e) => alert(errorText(e)));
    onChange();
  }

  return (
    <section className="card">
      <div className="spread">
        <h2>담당자</h2>
        <button className="btn ghost small" onClick={() => setOpen((v) => !v)}>
          {open ? "닫기" : "추가"}
        </button>
      </div>
      {open && (
        <form className="form" onSubmit={add} style={{ marginBottom: 12 }}>
          <div className="form-2">
            <label className="field">
              이름
              <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </label>
            <label className="field">
              직책
              <input placeholder="예: 대표, 이커머스 사업부장" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            </label>
            <label className="field">
              공식 연락처
              <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            </label>
            <label className="field">
              공식 이메일
              <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />
            광고성 정보(영업 메일) 수신에 동의함
          </label>
          {error && <p className="notice">{error}</p>}
          <div>
            <button className="btn">담당자 추가</button>
          </div>
        </form>
      )}
      {contacts.length === 0 && !open && <p className="muted">등록된 담당자가 없습니다.</p>}
      <div className="timeline">
        {contacts.map((c) => (
          <div key={c.id} className="tl-item">
            <div className="spread">
              <strong>
                {c.name} <span className="muted small">{c.title}</span>
              </strong>
              <button className="btn danger small" onClick={() => remove(c)}>
                삭제
              </button>
            </div>
            <p className="small">{[c.phone, c.email].filter(Boolean).join(" · ") || "-"}</p>
            <div className="row small">
              <label className="check">
                <input type="checkbox" checked={!!c.consent} onChange={(e) => toggle(c, { consent: e.target.checked })} />
                수신 동의
              </label>
              <label className="check">
                <input type="checkbox" checked={!!c.optOut} onChange={(e) => toggle(c, { optOut: e.target.checked })} />
                수신 거부
              </label>
              {c.optOut ? <span className="badge A">연락 금지</span> : c.consent ? <span className="badge good">메일 가능</span> : <span className="badge">메일 전 동의 필요</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Activities({ company, activities, onChange }: { company: Company; activities: Activity[]; onChange: () => void }) {
  const [type, setType] = useState<string>("메모");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(`/companies/${company.id}/activities`, { method: "POST", body: { type, body } });
      setBody("");
      onChange();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <section className="card">
      <h2>활동 기록</h2>
      <form className="form" onSubmit={add} style={{ marginBottom: 14 }}>
        <div className="row">
          <select style={{ width: "auto" }} value={type} onChange={(e) => setType(e.target.value)} aria-label="종류">
            {ACTIVITY_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <textarea rows={3} required placeholder="통화 내용, 미팅 메모, 다음 약속 등" value={body} onChange={(e) => setBody(e.target.value)} />
        {error && <p className="notice">{error}</p>}
        <div>
          <button className="btn small">기록</button>
        </div>
      </form>
      <div className="timeline">
        {activities.map((a) => (
          <div key={a.id} className="tl-item">
            <p className="small muted">
              {a.at} · {a.type}
            </p>
            <p>{a.body}</p>
          </div>
        ))}
        {activities.length === 0 && <p className="muted">아직 기록이 없습니다.</p>}
      </div>
    </section>
  );
}

type CorpHit = {
  crno: string;
  name: string;
  ceo?: string;
  bizNo?: string;
  address?: string;
  kind?: string;
  employees?: number;
  founded?: string;
  listed?: string;
};

// 금융위원회 기업기본정보에서 회사명으로 법인을 찾아 대표자·사업자번호·주소·직원 수·매출을 채웁니다.
function Lookup({ company, onSaved }: { company: Company; onSaved: () => void }) {
  const [hits, setHits] = useState<CorpHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // 기업 추가 직후(?lookup=1)에는 바로 찾아봅니다.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("lookup") === "1" && !company.crno) {
      p.delete("lookup");
      window.history.replaceState(null, "", `${window.location.pathname}?${p}`);
      find();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function find() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const r = await api<{ items: CorpHit[] }>(`/companies/${company.id}/lookup`);
      setHits(r.items);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function pick(h: CorpHit) {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ finance: { year: string } | null; financeError?: string }>(`/companies/${company.id}/lookup`, {
        method: "POST",
        body: { crno: h.crno },
      });
      setHits(null);
      setMsg(
        r.finance
          ? `기업 정보와 ${r.finance.year}년 매출을 채웠습니다.`
          : r.financeError === "data_not_approved"
            ? "기업 정보를 채웠습니다. 매출은 공공데이터포털에서 \"금융위원회_기업 재무정보\" 활용신청이 승인되면 함께 채워집니다."
            : "기업 정보를 채웠습니다. 공개된 재무정보가 없어 매출은 비워 두었습니다.",
      );
      onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card form">
      <div className="spread">
        <h2 style={{ margin: 0 }}>기업 정보 자동 채우기</h2>
        <button className="btn ghost small" disabled={busy} onClick={find}>
          {busy && !hits ? "찾는 중..." : company.crno ? "다시 찾기" : "공공데이터에서 찾기"}
        </button>
      </div>
      <p className="small muted">금융위원회 기업기본정보에서 &quot;{company.name}&quot;을(를) 찾아 대표자, 사업자번호, 주소, 직원 수, 매출을 채웁니다. 법인만 조회됩니다.</p>
      {hits && hits.length === 0 && <p className="notice">일치하는 법인을 찾지 못했습니다. 회사명을 정식 법인명으로 고친 뒤 다시 찾아보세요.</p>}
      {hits && hits.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>법인명</th>
                <th>대표자</th>
                <th>업종</th>
                <th>직원</th>
                <th>주소</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {hits.map((h) => (
                <tr key={h.crno}>
                  <td>
                    <strong>{h.name}</strong>
                    {h.listed && <span className="muted small"> {h.listed}</span>}
                  </td>
                  <td>{h.ceo || "-"}</td>
                  <td className="wrap small">{h.kind || "-"}</td>
                  <td>{h.employees ? `${h.employees}명` : "-"}</td>
                  <td className="wrap small muted">{h.address || "-"}</td>
                  <td>
                    <button className="btn small" disabled={busy} onClick={() => pick(h)}>
                      이 회사
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {msg && <p className="notice ok">{msg}</p>}
      {error && <p className="notice">{error}</p>}
    </section>
  );
}
