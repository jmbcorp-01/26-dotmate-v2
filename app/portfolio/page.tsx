import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import Link from "next/link";
import { sortedProjects } from "@/lib/portfolio";
import { services } from "@/lib/services";
import AxName from "@/components/AxName";
import Phrase from "@/components/Phrase";
import CtaBand from "@/components/CtaBand";

export const metadata: Metadata = pageMeta({
  title: "포트폴리오",
  description: "2017년부터 닷메이트가 만들어 온 쇼핑몰, ERP, 앱, 홈페이지 구축 사례와 AI 시스템(AX) 전환 사례를 모았습니다.",
  path: "/portfolio/",
  image: "portfolio",
});

const nameOf = (slug: string) => services.find((s) => s.slug === slug)?.name ?? "";

export default function PortfolioPage() {
  const sorted = sortedProjects();

  return (
    <>
      <section className="svc-hero">
        <div className="wrap svc-hero-inner">
          <p className="hero-kicker">포트폴리오</p>
          <h1>
            <Phrase text="시스템을 만들어 온 팀이|AI로 다시 만듭니다." />
          </h1>
          <p className="hero-sub">
            <Phrase text="문제가 무엇이었고, 무엇을 바꿨고,|어떤 결과가 났는지 정리했습니다." />
          </p>
        </div>
      </section>

      <section className="portfolio">
        <div className="wrap">
          {sorted.length === 0 ? (
            <div className="pf-empty">
              <h2>
                <Phrase text="사례를 정리하고 있습니다." />
              </h2>
              <p>
                <Phrase text="곧 이곳에 구축 사례와 AX 전환 사례를 올립니다.|비슷한 업종의 사례가 궁금하시면 진단 신청 때 남겨 주세요." />
              </p>
              <Link href="/diagnosis/" className="text-link">
                무료 진단 신청하기 <span aria-hidden="true">›</span>
              </Link>
            </div>
          ) : (
            <div className="pf-grid">
              {sorted.map((p) => (
                <Link key={p.slug} href={`/portfolio/${p.slug}/`} className="pf-card">
                  <div className="pf-thumb">
                    {p.image ? <img src={p.image} alt={`${p.client} ${p.title}`} loading="lazy" /> : <span>{p.client}</span>}
                  </div>
                  <div className="pf-meta">
                    {p.service ? <AxName name={nameOf(p.service)} /> : <span className="pf-cat">{p.category}</span>}
                    <span className="muted">
                      {p.client} · {p.period}
                    </span>
                    {p.ax && <span className="pf-badge">AX 전환</span>}
                  </div>
                  <h3>{p.title}</h3>
                  <p className="muted">{p.summary}</p>
                  <span className="pf-more">
                    사례 자세히 보기 <span aria-hidden="true">›</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <CtaBand title="우리 회사도|이렇게 바뀔 수 있을까요?" body="지금 쓰는 시스템을 알려주시면,|바뀌는 업무와 예상 비용을 무료로 정리해 드립니다." />
    </>
  );
}
