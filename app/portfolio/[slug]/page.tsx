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
      <section className="page-head case-head">
        <div className="wrap">
          <Link href="/portfolio/" className="case-back mono">
            <span aria-hidden="true">←</span> 포트폴리오
          </Link>
          <div className="pf-meta">
            {svc ? <AxName name={svc.name} /> : <span className="ax-name">{p.category}</span>}
            {p.ax && <span className="badge">AX 전환</span>}
            {p.status && <span className="badge">{p.status}</span>}
          </div>
          <h1>{p.title}</h1>
          <p className="lead">{p.summary}</p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
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
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
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
              <div className="reel-frame" data-reel>
                <img src={p.image} alt={`${p.client} ${p.title} 대표 화면`} />
              </div>
              {p.imageNote && <figcaption className="muted">{p.imageNote}</figcaption>}
            </figure>
          )}
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-top rv">
            <h2>
              무엇이 문제였고,
              <br />
              무엇을 바꿨나요.
            </h2>
            <span className="mono">Problem / Solution</span>
          </div>
          <div className="ps-grid">
            <div className="b rv">
              <h3 className="mono">고객이 겪던 문제</h3>
              <ul>
                {p.problem.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="a rv">
              <h3 className="mono">닷메이트가 바꾼 점</h3>
              <ul>
                {p.solution.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-top rv">
            <h2>성과</h2>
            <span className="mono">Results</span>
          </div>
          {p.metrics && p.metrics.length > 0 && (
            <div className="case-metrics">
              {p.metrics.map((m) => (
                <div key={m.label} className="rv">
                  <b className="num">{m.value}</b>
                  <span>{m.label}</span>
                </div>
              ))}
            </div>
          )}
          <ol className="result-list">
            {p.results.map((r, i) => (
              <li key={r} className="rv">
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                {r}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-top rv">
            <h2>사용 기술과 AI 적용</h2>
            <span className="mono">Build</span>
          </div>
          <ul className="build-grid">
            {p.tech.map((t, i) => (
              <li key={t.title} className="rv">
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {p.testimonial && (
        <section className="sec case-quote">
          <div className="wrap">
            <figure className="rv">
              <blockquote>
                <p>“{p.testimonial.quote}”</p>
              </blockquote>
              <figcaption className="mono">{p.testimonial.author}</figcaption>
            </figure>
          </div>
        </section>
      )}

      {p.note && (
        <div className="wrap sec">
          <p className="case-note muted">{p.note}</p>
        </div>
      )}

      {others.length > 0 && (
        <section className="sec">
          <div className="wrap">
            <div className="sec-top rv">
              <h2>다른 사례</h2>
              <Link href="/portfolio/" className="mono">
                전체 보기 →
              </Link>
            </div>
            <ul className="work-list">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link href={`/portfolio/${o.slug}/`}>
                    <span className="th" aria-hidden="true">
                      {(o.image ?? o.thumb) && <img src={o.image ?? o.thumb} alt="" loading="lazy" />}
                    </span>
                    <span className="cl">{o.client}</span>
                    <span className="ct">{o.title}</span>
                    <span className="yr mono">
                      {o.year} · {o.category}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <CtaBand
        title={svc ? `우리 ${svc.system}도|이렇게 바뀔 수|있을까요?` : "우리 회사 업무도|이렇게 바뀔 수|있을까요?"}
        body="지금 쓰는 시스템을 알려주시면,|바뀌는 업무와 예상 비용을|무료로 정리해 드립니다."
      />
    </>
  );
}
