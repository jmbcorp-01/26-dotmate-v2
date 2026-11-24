"use client";

import Link from "next/link";
import { useData } from "@/lib/useData";
import { manwon } from "@/lib/api";
import { FUNNEL_TARGETS, STAGES, type Company, type Deal } from "@/lib/types";

const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

export default function Dashboard() {
  const deals = useData<{ items: Deal[] }>("/deals");
  const companies = useData<{ items: Company[] }>("/companies");
  const error = deals.error || companies.error;
  if (error) return <p className="notice">{error}</p>;
  if (!deals.data || !companies.data) return <p className="muted">불러오는 중...</p>;

  const ds = deals.data.items;
  const cs = companies.data.items;
  const month = today().slice(0, 7);
  const t = today();
  const active = ds.filter((d) => d.stage !== "보류");
  const thisMonth = ds.filter((d) => d.createdAt.slice(0, 7) === month);
  // 이번 달에 해당 단계 이상까지 온 영업 건 수 (퍼널 누적)
  const order = STAGES.filter((s) => s !== "보류");
  // 발굴은 이번 달 새로 등록한 기업 수, 나머지는 영업 건 기준
  const newCompanies = cs.filter((c) => c.createdAt.slice(0, 7) === month).length;
  const reached = (stage: string) =>
    stage === "발굴"
      ? newCompanies
      : thisMonth.filter((d) => d.stage !== "보류" && order.indexOf(d.stage) >= order.indexOf(stage as never)).length;
  const todo = active
    .filter((d) => d.nextDate || d.nextAction)
    .sort((a, b) => (a.nextDate || "9999").localeCompare(b.nextDate || "9999"))
    .slice(0, 12);
  const grades = { A: 0, B: 0, C: 0, "": 0 } as Record<string, number>;
  cs.forEach((c) => (grades[c.grade || ""] += 1));
  const pipelineAmount = active.filter((d) => d.stage !== "본계약·운영").reduce((s, d) => s + (d.amount || 0), 0);
  const won = ds.filter((d) => d.stage === "본계약·운영").reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <>
      <div className="head">
        <div>
          <h1>대시보드</h1>
          <p className="muted">{t} 기준</p>
        </div>
        <div className="row">
          <Link className="btn ghost" href="/inquiry/">
            문의 등록
          </Link>
          <Link className="btn" href="/companies/?new=1">
            기업 추가
          </Link>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="card">
          <p className="muted small">타겟 기업</p>
          <p className="stat">{cs.length}곳</p>
          <p className="small muted">
            A {grades.A} · B {grades.B} · C {grades.C} · 미채점 {grades[""]}
          </p>
        </div>
        <div className="card">
          <p className="muted small">진행 중 영업 예상 금액</p>
          <p className="stat">{manwon(pipelineAmount)}원</p>
          <p className="small muted">진행 중 {active.length - active.filter((d) => d.stage === "본계약·운영").length}건</p>
        </div>
        <div className="card">
          <p className="muted small">계약 금액 누적</p>
          <p className="stat">{manwon(won)}원</p>
          <p className="small muted">본계약·운영 {ds.filter((d) => d.stage === "본계약·운영").length}건</p>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h2>이번 달 퍼널 ({month})</h2>
          <p className="small muted" style={{ marginBottom: 12 }}>
            발굴은 이번 달 등록한 기업 수, 나머지는 이번 달 영업 건이 그 단계 이상까지 온 수입니다. 목표는 전략 문서 10장의 월간 퍼널입니다.
          </p>
          <div className="funnel">
            {order.map((s) => {
              const n = reached(s);
              const goal = FUNNEL_TARGETS[s] || 0;
              return (
                <div className="funnel-row" key={s}>
                  <span>{s}</span>
                  <div className="bar" aria-hidden>
                    <span style={{ width: `${goal ? Math.min(100, (n / goal) * 100) : 0}%` }} />
                  </div>
                  <span className="small">
                    {n} / {goal}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <div className="spread">
            <h2>다음 할 일</h2>
            <Link className="small muted" href="/pipeline/">
              파이프라인 보기
            </Link>
          </div>
          {todo.length === 0 ? (
            <p className="empty">영업 건에 다음 할 일과 날짜를 적으면 여기에 모입니다.</p>
          ) : (
            <div className="timeline">
              {todo.map((d) => (
                <Link key={d.id} href={`/company/?id=${d.companyId}`} className="tl-item" style={{ textDecoration: "none" }}>
                  <div className="spread small">
                    <strong>{d.companyName}</strong>
                    <span className={d.nextDate && d.nextDate < t ? "overdue" : "muted"}>{d.nextDate || "날짜 없음"}</span>
                  </div>
                  <p>{d.nextAction || d.title}</p>
                  <p className="small muted">
                    {d.stage} · {d.title}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
