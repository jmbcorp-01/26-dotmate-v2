import Link from "next/link";
import { services } from "@/lib/services";
import AxName from "@/components/AxName";
import CtaBand from "@/components/CtaBand";
import Phrase from "@/components/Phrase";

const stats = [
  { value: "71.4%", label: "AI 도입이 필요하다고 답한 중소기업" },
  { value: "17.6%", label: "2년 안에 구체적인 계획이 있는 곳" },
  { value: "49.2%", label: "어디에 써야 할지 모르겠다는 곳" },
];

const steps = [
  { title: "무료 .AX 진단", body: "지금 쓰는 시스템을 보고, AI로 바뀌는 업무와 예상 비용을 알려드립니다. 정부 AX 지원사업을 쓸 수 있는지도 함께 확인합니다." },
  { title: "전환 설계", body: "가장 효과가 큰 업무부터 순서를 정합니다. 쓰던 데이터는 그대로 옮겨옵니다." },
  { title: "AI 시스템 구축", body: "시스템을 만들어 온 팀이 직접 만듭니다. AI를 덧붙이지 않고 AI 중심으로 다시 짭니다." },
  { title: "운영과 개선", body: "오픈 후에도 함께 봅니다. 쓰면서 쌓이는 데이터로 AI를 계속 고칩니다." },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-inner">
          <p className="hero-kicker">
            dotmate <AxName name="" />
          </p>
          <h1>
            낡은 시스템을
            <br />
            AI 시스템으로.
          </h1>
          <p className="hero-sub">
            <Phrase text="쇼핑몰, ERP, 앱, 홈페이지.|닷메이트가 AX로 다시 만듭니다." />
          </p>
          <div className="hero-actions">
            <Link href="/diagnosis/" className="btn btn-lg">
              무료 .AX 진단 받기
            </Link>
            <a href="#services" className="text-link">
              서비스 보기 <span aria-hidden="true">›</span>
            </a>
          </div>
        </div>
      </section>

      <section className="why">
        <div className="wrap">
          <h2 className="statement">
            필요한 건 압니다.
            <br />
            <span className="muted">
              <Phrase text="어디서부터 할지|모를 뿐입니다." />
            </span>
          </h2>
          <div className="stats">
            {stats.map((s) => (
              <div key={s.value} className="stat">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="source">출처: 메인비즈협회, 2026년 중소기업 AI 도입·활용 실태조사 (2026년 11월 발표)</p>
        </div>
      </section>

      <section className="belief">
        <div className="wrap belief-inner">
          <h2>
            AI를 붙이지 않습니다.
            <br />
            <Phrase text="시스템을 AI로|다시 만듭니다." />
          </h2>
          <p>
            중소기업이 AI 도입에서 가장 많이 막히는 곳은 지금 쓰는 시스템에 맞추는 일입니다. 닷메이트는 웹, 앱, 쇼핑몰, 사내 시스템을 직접 만들어 온 팀입니다. 그래서 낡은 시스템에 AI 기능을 덧대는 대신, 처음부터 AI가 일하는 구조로 다시 만듭니다.
          </p>
        </div>
      </section>

      <section id="services" className="services">
        <div className="wrap">
          <h2 className="section-title">어떤 시스템을 바꿀까요?</h2>
          <div className="svc-grid">
            {services.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}/`} className="svc-card">
                <AxName name={s.name} className="svc-card-name" />
                <p className="svc-card-q">
                  <Phrase text={s.question} />
                </p>
                <p className="svc-card-sum">{s.summary}</p>
                <span className="svc-card-more">
                  자세히 보기 <span aria-hidden="true">›</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="process">
        <div className="wrap">
          <h2 className="section-title">진단부터 운영까지, 한 팀이.</h2>
          <ol className="steps">
            {steps.map((st, i) => (
              <li key={st.title} className="step">
                <span className="step-no">{String(i + 1).padStart(2, "0")}</span>
                <h3>{st.title}</h3>
                <p>{st.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand
        title="우리 회사 시스템은|몇 년 전에 멈춰 있나요?"
        body="무료 .AX 진단으로|AI로 바뀌는 업무와 비용을 먼저 확인해 보세요."
      />
    </>
  );
}
