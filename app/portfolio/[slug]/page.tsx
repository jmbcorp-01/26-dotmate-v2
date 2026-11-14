import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects, getProject, sortedProjects } from "@/lib/portfolio";
import { services } from "@/lib/services";
import AxName from "@/components/AxName";
import CtaBand from "@/components/CtaBand";
import JsonLd from "@/components/JsonLd";
import { site, pageMeta, orgId } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return {};
  return pageMeta({
    title: p.title,
    description: p.summary,
    path: `/portfolio/${p.slug}/`,
    image: "portfolio",
  });
}

const serviceOf = (slug?: string) => services.find((s) => s.slug === slug);

export default async function CasePage({ params }: Props) {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) notFound();

  const svc = serviceOf(p.service);
  const others = sortedProjects()
    .filter((o) => o.slug !== p.slug)
    .slice(0, 3);
  const url = `${site.url}/portfolio/${p.slug}/`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": `${url}#case`,
        name: p.title,
        headline: p.title,
        description: p.summary,
        url,
        ...(p.image ? { image: `${site.url}${p.image}` } : {}),
        dateCreated: `${p.year}-${String(p.month).padStart(2, "0")}`,
        inLanguage: "ko-KR",
        genre: p.category,
        creator: { "@id": orgId },
        ...(p.url ? { sameAs: p.url } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "홈", item: `${site.url}/` },
          { "@type": "ListItem", position: 2, name: "포트폴리오", item: `${site.url}/portfolio/` },
          { "@type": "ListItem", position: 3, name: p.title, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <JsonLd data={ld} />
      <section className="case-hero">
        <div className="wrap">
          <Link href="/portfolio/" className="case-back">
            <span aria-hidden="true">‹</span> 포트폴리오
          </Link>
          <div className="case-head">
            <div className="pf-meta">
              {svc ? <AxName name={svc.name} /> : <span className="pf-cat">{p.category}</span>}
              {p.ax && <span className="pf-badge">AX 전환</span>}
            </div>
            <h1>{p.title}</h1>
            <p className="hero-sub">{p.summary}</p>
          </div>
          <dl className="case-facts">
            <div>
              <dt>고객사</dt>
              <dd>{p.client}</dd>
            </div>
            <div>
              <dt>서비스 구분</dt>
              <dd>{p.category}</dd>
            </div>
            <div>
              <dt>업종</dt>
              <dd>{p.industry}</dd>
            </div>
            <div>
              <dt>진행 시기</dt>
              <dd>{p.period}</dd>
            </div>
            <div>
              <dt>사이트</dt>
              <dd>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="case-site">
                    {p.url.replace(/^https?:\/\//, "").replace(/\/$/, "")} <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  "비공개"
                )}
              </dd>
            </div>
          </dl>
          {p.image && (
            <figure className="case-figure">
              <img src={p.image} alt={`${p.client} ${p.title} 대표 화면`} />
              {p.imageNote && <figcaption className="muted">{p.imageNote}</figcaption>}
            </figure>
          )}
        </div>
      </section>

      <section className="compare">
        <div className="wrap">
          <div className="compare-grid">
            <div className="compare-col before">
              <p className="compare-label">고객이 겪던 문제</p>
              <ul>
                {p.problem.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="compare-col after">
              <p className="compare-label">닷메이트가 바꾼 점</p>
              <ul>
                {p.solution.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="case-results">
        <div className="wrap">
          <h2 className="section-title">성과</h2>
          {p.metrics && p.metrics.length > 0 && (
            <div className="case-metrics">
              {p.metrics.map((m) => (
                <div key={m.label} className="stat">
                  <div className="stat-value">{m.value}</div>
                  <div className="stat-label">{m.label}</div>
                </div>
              ))}
            </div>
          )}
          <ul className="fit-list case-result-list">
            {p.results.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="build case-tech">
        <div className="wrap">
          <h2 className="section-title">사용 기술과 AI 적용</h2>
          <div className="build-grid">
            {p.tech.map((t) => (
              <div key={t.title} className="build-item">
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {p.testimonial && (
        <section className="case-quote">
          <div className="wrap">
            <figure>
              <blockquote>
                <p>{p.testimonial.quote}</p>
              </blockquote>
              <figcaption>{p.testimonial.author}</figcaption>
            </figure>
          </div>
        </section>
      )}

      {p.note && (
        <div className="wrap">
          <p className="case-note muted">{p.note}</p>
        </div>
      )}

      {others.length > 0 && (
        <section className="others">
          <div className="wrap">
            <p className="others-title">다른 사례</p>
            <div className="others-row">
              {others.map((o) => (
                <Link key={o.slug} href={`/portfolio/${o.slug}/`} className="others-link">
                  <span className="others-case">{o.title}</span>
                  <span className="muted">
                    {o.client} · {o.category}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBand
        title={svc ? `우리 ${svc.system}도|이렇게 바뀔 수 있을까요?` : "우리 회사 업무도|이렇게 바뀔 수 있을까요?"}
        body="지금 쓰는 시스템을 알려주시면,|바뀌는 업무와 예상 비용을 무료로 정리해 드립니다."
      />
    </>
  );
}
