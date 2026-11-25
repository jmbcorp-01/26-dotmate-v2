// 고객에게 보이는 견적서. 편집기 미리보기와 공개 링크(/q/)가 같은 화면을 씁니다. 인쇄하면 A4 세로 문서가 됩니다.
import { CONTACT } from "@/lib/proposal";
import { PAY_DESC, PAY_LABEL, eokMan, krw, planFor, type PayType, type PublicQuote } from "@/lib/quote";

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("ko-KR") : new Date().toLocaleDateString("ko-KR"));
const pct = (x?: number) => `${Number(x || 0).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;

function Headline({ q }: { q: PublicQuote }) {
  const plan = planFor(q.payment.type, q.totals.supply, q.payment);
  const p = q.payment;
  if (p.type === "lump")
    return (
      <div className="qd-hero">
        <p className="qd-figure">{eokMan(q.totals.supply)}</p>
        <p>공급가액, 부가세 별도{p.monthlyOps ? `. 운영·유지보수 월 ${eokMan(p.monthlyOps)}` : ""}</p>
      </div>
    );
  if (p.type === "subscription")
    return (
      <div className="qd-hero">
        <p className="qd-figure">월 {eokMan(plan.monthly)}</p>
        <p>
          처음 {eokMan(plan.upfront)}, 이후 {plan.months}개월 동안 구축과 운영을 포함한 월 이용료 (부가세 별도)
        </p>
      </div>
    );
  return (
    <div className="qd-hero">
      <p className="qd-figure">거래액의 {pct(plan.rate)}</p>
      <p>
        {plan.upfront ? `착수금 ${eokMan(plan.upfront)}, ` : "착수금 없이, "}
        {plan.months}개월 동안 월 수수료. 월 최저 {eokMan(plan.minMonthly || 0)}, 총 수수료 상한 {eokMan(plan.cap || 0)} (부가세 별도)
      </p>
    </div>
  );
}

function Compare({ q }: { q: PublicQuote }) {
  const types: PayType[] = ["lump", "subscription", "revenue", "hybrid"];
  const plans = types.map((t) => planFor(t, q.totals.supply, q.payment));
  return (
    <div className="qd-compare" role="table" aria-label="지급 방식 비교">
      <div role="row" className="qd-compare-row qd-compare-head">
        <span role="columnheader">지급 방식</span>
        <span role="columnheader">처음 내는 금액</span>
        <span role="columnheader">월 부담</span>
        <span role="columnheader">{q.payment.months}개월 예상 총액</span>
      </div>
      {plans.map((p) => (
        <div role="row" key={p.type} className={`qd-compare-row${p.type === q.payment.type ? " qd-chosen" : ""}`}>
          <span role="cell">
            {PAY_LABEL[p.type]}
            {p.type === q.payment.type && <em>제안</em>}
          </span>
          <span role="cell">{p.upfront ? eokMan(p.upfront) : "없음"}</span>
          <span role="cell">
            {p.type === "lump"
              ? q.payment.monthlyOps
                ? `운영비 ${eokMan(q.payment.monthlyOps)}`
                : "없음"
              : p.type === "subscription"
                ? eokMan(p.monthly)
                : `${pct(p.rate)} (예상 ${eokMan(p.monthly)})`}
          </span>
          <span role="cell">{eokMan(p.total)}</span>
        </div>
      ))}
      {q.payment.expectedSales > 0 && (
        <p className="qd-fine">성과 연동형과 혼합형의 월 부담과 총액은 월 거래액 {eokMan(q.payment.expectedSales)}을 가정한 예상치입니다. 총액은 상한을 넘지 않습니다.</p>
      )}
    </div>
  );
}

export default function QuoteDoc({ q }: { q: PublicQuote }) {
  const p = q.payment;
  const plan = planFor(p.type, q.totals.supply, p);
  const phases = [...new Set(q.items.map((i) => i.phase || "기타"))];
  const t = q.totals;

  return (
    <article className="qd">
      <header className="qd-top">
        <p className="slide-mark">
          <i aria-hidden /> 닷메이트
        </p>
        <dl>
          <dt>견적일</dt>
          <dd>{day(q.sentAt)}</dd>
          {q.expiresAt && (
            <>
              <dt>유효 기간</dt>
              <dd>{day(q.expiresAt)}까지</dd>
            </>
          )}
          <dt>버전</dt>
          <dd>v{q.version}</dd>
        </dl>
      </header>

      <p className="qd-to">{q.companyName} 귀하</p>
      <h1>{q.title}</h1>
      <Headline q={q} />

      <section className="qd-sec">
        <h2>지급 방식: {PAY_LABEL[p.type]}</h2>
        <p className="qd-desc">{PAY_DESC[p.type]}</p>
        {p.type === "lump" && plan.schedule && (
          <ul className="qd-schedule">
            {plan.schedule.map((s) => (
              <li key={s.label}>
                <span>{s.label}</span>
                <b>{krw(s.amount)}</b>
              </li>
            ))}
          </ul>
        )}
        {p.note && <p className="qd-desc">{p.note}</p>}
        {p.showAlternatives && <Compare q={q} />}
      </section>

      {q.scope && (
        <section className="qd-sec">
          <h2>범위</h2>
          <p className="qd-pre">{q.scope}</p>
        </section>
      )}

      <section className="qd-sec">
        <h2>산정 내역</h2>
        <div className="qd-table-wrap">
          <table className="qd-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>직무</th>
                <th className="num">투입</th>
                <th className="num">단가</th>
                <th className="num">금액</th>
              </tr>
            </thead>
            {phases.map((ph) => (
              <tbody key={ph}>
                <tr className="qd-phase">
                  <th colSpan={5}>{ph}</th>
                </tr>
                {q.items
                  .filter((i) => (i.phase || "기타") === ph)
                  .map((i, k) => (
                    <tr key={k}>
                      <td>
                        {i.name}
                        {i.note && <small>{i.note}</small>}
                      </td>
                      <td>{i.kind === "labor" ? i.role : "직접경비"}</td>
                      <td className="num">{i.kind === "labor" ? `${i.days}일` : `${i.qty || 1}`}</td>
                      <td className="num">{krw(i.unit)}</td>
                      <td className="num">{krw(i.amount)}</td>
                    </tr>
                  ))}
              </tbody>
            ))}
          </table>
        </div>
        <dl className="qd-sum">
          <dt>직접인건비</dt>
          <dd>{krw(t.labor)}</dd>
          <dt>제경비 (직접인건비의 {pct(q.overheadPct)})</dt>
          <dd>{krw(t.overhead)}</dd>
          <dt>기술료 (인건비와 제경비의 {pct(q.techFeePct)})</dt>
          <dd>{krw(t.techFee)}</dd>
          {t.expense > 0 && (
            <>
              <dt>직접경비</dt>
              <dd>{krw(t.expense)}</dd>
            </>
          )}
          {q.discount > 0 && (
            <>
              <dt>할인</dt>
              <dd>-{krw(q.discount)}</dd>
            </>
          )}
          {t.discount - (q.discount || 0) > 0 && (
            <>
              <dt>만 원 미만 절사</dt>
              <dd>-{krw(t.discount - (q.discount || 0))}</dd>
            </>
          )}
          <dt className="qd-strong">공급가액</dt>
          <dd className="qd-strong">{krw(t.supply)}</dd>
          <dt>부가세 10%</dt>
          <dd>{krw(t.vat)}</dd>
          <dt className="qd-strong">합계</dt>
          <dd className="qd-strong">{krw(t.total)}</dd>
        </dl>
        {p.type !== "lump" && <p className="qd-fine">위 금액은 지급 방식을 정하는 기준가입니다. 실제 지급은 위의 {PAY_LABEL[p.type]} 조건을 따릅니다.</p>}
      </section>

      {q.terms && (
        <section className="qd-sec">
          <h2>조건</h2>
          <ul className="qd-terms">
            {q.terms
              .split("\n")
              .filter(Boolean)
              .map((x, i) => (
                <li key={i}>{x}</li>
              ))}
          </ul>
        </section>
      )}

      <footer className="qd-foot">
        <span>공급자 닷메이트 · 사업자등록번호 {CONTACT.bizNo}</span>
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
      </footer>
    </article>
  );
}
