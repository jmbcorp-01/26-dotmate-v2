import Link from "next/link";
import { services } from "@/lib/services";
import AxName from "@/components/AxName";
import KeyVisual from "@/components/KeyVisual";
import { sortedProjects, getProject } from "@/lib/portfolio";
import CtaBand from "@/components/CtaBand";
import Phrase from "@/components/Phrase";
import JsonLd from "@/components/JsonLd";
import { faqs } from "@/lib/faq";
import { site, pageMeta, orgId } from "@/lib/site";

export const metadata = pageMeta({
  description:
    "쇼핑몰, ERP, 앱, 홈페이지. 2017년부터 시스템을 만들어 온 닷메이트가 중소기업의 낡은 시스템을 AI 시스템으로 다시 만듭니다. 무료 .AX 진단으로 시작하세요.",
  path: "/",
});

const homeLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${site.url}/#webpage`,
      url: `${site.url}/`,
      name: site.defaultTitle,
      inLanguage: "ko-KR",
      isPartOf: { "@id": `${site.url}/#website` },
      about: { "@id": orgId },
    },
    {
      "@type": "ItemList",
      name: "닷메이트 .AX 서비스",
      itemListElement: services.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `.AX ${s.name} (${s.serviceType})`,
        url: `${site.url}/services/${s.slug}/`,
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

const steps = [
  { title: "무료 .AX 진단", body: "지금 쓰는 시스템을 보고 AI로 바뀌는 업무와 예상 비용, 정부 AX 지원사업 가능 여부를 알려드립니다." },
  { title: "전환 설계", body: "가장 효과가 큰 업무부터 순서를 정합니다. 쓰던 데이터는 그대로 옮겨옵니다." },
  { title: "AI 시스템 구축", body: "시스템을 만들어 온 팀이 직접 만듭니다. AI를 덧붙이지 않고 AI 중심으로 다시 짭니다." },
  { title: "운영과 개선", body: "오픈 후에도 함께 봅니다. 쓰면서 쌓이는 데이터로 AI를 계속 고칩니다." },
];

const serviceLabel: Record<string, string> = { commerce: "커머스", erp: "ERP", app: "앱", web: "웹" };
const shortClient = (c: string) => c.replace(/^\(주\)\s*/, "");

// 대표 사례와 수치. 숫자는 lib/portfolio.ts의 metrics에서 가져옵니다.
const reelSlug = "noriva";
const numSlugs: { slug: string; pick: string }[] = [
  { slug: "noriva", pick: "70%+" },
  { slug: "matchum", pick: "90%+" },
  { slug: "nongbujangteo", pick: "2개월" },
  { slug: "ai-trading", pick: "10+" },
];

export default function Home() {
  const works = sortedProjects();
  const reel = getProject(reelSlug);
  const reelMetric = reel?.metrics?.[0];
  const nums = numSlugs.flatMap(({ slug, pick }) => {
    const p = getProject(slug);
    const m = p?.metrics?.find((x) => x.value === pick);
    return p && m ? [{ ...m, client: shortClient(p.client), slug }] : [];
  });

  return (
    <>
      <JsonLd data={homeLd} />
      <section className="hero" aria-label="소개">
        <KeyVisual />
        <div className="wrap">
          <p className="mono hero-kicker">dotmate .AX · AI transformation since 2017</p>
          <h1>
            <span className="line">낡은 시스템을</span>
            <span className="line">AI 시스템으로.</span>
          </h1>
          <div className="hero-row">
            <p>
              <Phrase text="쇼핑몰, ERP, 앱, 홈페이지.|2017년부터 시스템을 만들어 온 팀이|AI가 일하는 구조로 다시 만듭니다." />
            </p>
            <a href="#services" className="scroll-cue mono">
              <i aria-hidden="true" />
              스크롤
            </a>
          </div>
        </div>
      </section>

      <section className="manifesto">
        <div className="wrap">
          <h2 className="mono">우리가 하는 일</h2>
          <p className="mf">
            AI를 붙이지 않습니다. 시스템을 AI로 다시 만듭니다. 웹, 앱, 쇼핑몰, 사내 시스템을 직접 만들어 온 팀이라서, 회사가 실제로 일하는 방식부터 다시 설계합니다
            <span className="dot-red">.</span>
          </p>
        </div>
      </section>

      {reel && (
        <section className="sec reel">
          <div className="wrap">
            <Link href={`/portfolio/${reel.slug}/`} className="feature">
              <div className="reel-frame" data-reel>
                <img src={reel.image} alt={`${reel.client} ${reel.category} 화면`} />
              </div>
              <div className="reel-cap">
                <div>
                  <p className="mono">
                    Case study · {reel.client} · {reel.year}
                  </p>
                  <h2>
                    <Phrase text={reel.title.replace("담은 ", "담은|")} />
                  </h2>
                </div>
                {reelMetric && (
                  <div className="metric-pair">
                    <div>
                      <b>{reelMetric.value}</b>
                      <span>{reelMetric.label}</span>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          </div>
        </section>
      )}

      <section id="services" className="sec svc">
        <div className="wrap">
          <div className="sec-top rv">
            <h2>
              어떤 시스템을
              <br />
              바꿀까요?
            </h2>
            <span className="mono">.AX 서비스 {services.length}종</span>
          </div>
          <ul className="svc-list">
            {services.map((s, i) => (
              <li key={s.slug} className="rv">
                <Link href={`/services/${s.slug}/`}>
                  <span className="no mono">{String(i + 1).padStart(2, "0")}</span>
                  <AxName name={s.name} className="nm" />
                  <span className="q">
                    {s.question.replace("|", " ")} {s.summary}.
                  </span>
                  <span className="arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sec work">
        <div className="wrap">
          <div className="sec-top rv">
            <h2>최근 작업</h2>
            <Link href="/portfolio/" className="mono">
              공개 사례 {works.length}건 · 전체 보기 →
            </Link>
          </div>
          <ul className="work-list" data-peek>
            {works.map((p) => {
              const img = p.thumb ?? p.image;
              return (
                <li key={p.slug}>
                  <Link href={`/portfolio/${p.slug}/`} data-img={img}>
                    <span className="th" aria-hidden="true">
                      {img && <img src={img} alt="" loading="lazy" />}
                    </span>
                    <span className="cl">{shortClient(p.client)}</span>
                    <span className="ct">{p.title}</span>
                    <span className="yr mono">
                      {p.year} · {p.service ? serviceLabel[p.service] : "AI"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <div className="peek" aria-hidden="true">
        <img alt="" src={works[0]?.thumb ?? works[0]?.image ?? ""} />
      </div>

      <section className="sec nums" aria-label="숫자로 보는 성과">
        <div className="wrap">
          <ul>
            {nums.map((n) => (
              <li key={n.slug} className="rv">
                <b className="num">{n.value}</b>
                <p>{n.label}</p>
                <small>{n.client}</small>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sec proc">
        <div className="wrap">
          <div className="sec-top rv">
            <h2>
              진단부터 운영까지,
              <br />
              한 팀이.
            </h2>
          </div>
          <ol>
            {steps.map((st, i) => (
              <li key={st.title} className="rv">
                <span className="mono">Step {String(i + 1).padStart(2, "0")}</span>
                <h3>{st.title}</h3>
                <p>{st.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec faq">
        <div className="wrap">
          <div className="sec-top rv">
            <h2>자주 묻는 질문</h2>
            <span className="mono">FAQ</span>
          </div>
          <div className="faq-list">
            {faqs.map((f) => (
              <details key={f.q} className="faq-item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="우리 회사는|몇 년 전에|멈춰 있나요?"
        body="무료 .AX 진단으로|AI로 바뀌는 업무와 비용을|먼저 확인해 보세요."
      />
    </>
  );
}
