import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { services, getService } from "@/lib/services";
import Phrase from "@/components/Phrase";
import AxName from "@/components/AxName";
import CtaBand from "@/components/CtaBand";
import JsonLd from "@/components/JsonLd";
import KeyVisual from "@/components/KeyVisual";
import { projects } from "@/lib/portfolio";
import { site, pageMeta, orgId } from "@/lib/site";

// 받침에 따라 "과/와"를 고릅니다. 한글이 아니면(예: ERP) "와".
function withGwa(word: string) {
  const c = word.charCodeAt(word.length - 1);
  const hangul = c >= 0xac00 && c <= 0xd7a3;
  return hangul && (c - 0xac00) % 28 !== 0 ? "과" : "와";
}

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) return {};
  return pageMeta({ title: s.seoTitle, description: s.seoDescription, path: `/services/${s.slug}/`, image: s.slug });
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) notFound();

  const others = services.filter((o) => o.slug !== s.slug);
  const cases = projects.filter((p) => p.service === s.slug);
  const [feature, ...rest] = cases;
  const idx = services.findIndex((o) => o.slug === s.slug);
  const url = `${site.url}/services/${s.slug}/`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: `.AX ${s.name}`,
        alternateName: s.serviceType,
        serviceType: s.serviceType,
        description: `${s.summary}. ${s.after.join(" ")}`,
        url,
        image: `${site.url}/og/${s.slug}.png`,
        provider: { "@id": orgId },
        areaServed: { "@type": "Country", name: "대한민국" },
        audience: { "@type": "BusinessAudience", audienceType: s.fit.join(", ") },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: `.AX ${s.name}에서 만드는 것`,
          itemListElement: s.build.map((b) => ({
            "@type": "Offer",
            itemOffered: { "@type": "Service", name: b.title, description: b.body },
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "홈", item: `${site.url}/` },
          { "@type": "ListItem", position: 2, name: `.AX ${s.name}`, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <JsonLd data={ld} />
      <section className="hero hero-sub-page" aria-label={`.AX ${s.name} 소개`}>
        <KeyVisual pos={{ dx: 0.8, dy: 0.3, mdx: 0.78, mdy: 0.22 }} />
        <div className="wrap">
          <nav className="crumb mono" aria-label="현재 위치">
            <Link href="/">dotmate</Link>
            <span aria-hidden="true">/</span>
            <span>서비스</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">.AX {s.name}</span>
          </nav>
          <p className="svc-name">
            <AxName name={s.name} />
          </p>
          <h1>
            {s.question.split("|").map((line) => (
              <span key={line} className="line">
                {line}
              </span>
            ))}
          </h1>
          <div className="hero-row">
            <p>
              {s.summary}. 쓰던 데이터는 그대로 옮기고, AI가 일하는 구조로 다시 만듭니다.
            </p>
            <Link href="/diagnosis/" className="btn-ghost">
              {s.system} 무료 진단 받기 <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="sec cmp">
        <div className="wrap">
          <div className="sec-top rv">
            <h2>
              지금의 {s.system}
              {withGwa(s.system)}
              <br />
              AX 이후의 {s.system}.
            </h2>
            <span className="mono">Before / After</span>
          </div>
          <div className="cmp-head mono" aria-hidden="true">
            <span>지금</span>
            <span />
            <span>.AX 이후</span>
          </div>
          <ol className="cmp-list">
            {s.now.map((t, i) => (
              <li key={t} className="rv">
                <p className="b">
                  <span className="mono">지금 {String(i + 1).padStart(2, "0")}</span>
                  {t}
                </p>
                <span className="link" aria-hidden="true">
                  <i />
                </span>
                <p className="a">
                  <span className="mono">.AX 이후 {String(i + 1).padStart(2, "0")}</span>
                  {s.after[i]}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec outcome">
        <div className="wrap">
          <p className="mono">달라지는 것</p>
          <p className="big rv">
            {s.outcome.split("|").map((line, i) => (
              <span key={line} className="phrase" style={{ display: "block", color: i > 0 ? "var(--mute)" : undefined }}>
                {line}
              </span>
            ))}
          </p>
        </div>
      </section>

      <section className="sec build">
        <div className="wrap">
          <div className="sec-top rv">
            <h2>이렇게 만듭니다.</h2>
            <span className="mono">.AX {s.name} 구성</span>
          </div>
          <ul className="build-grid">
            {s.build.map((b, i) => (
              <li key={b.title} className="rv">
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                <h3>{b.title}</h3>
                <p>{b.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {feature && (
        <section className="sec cases">
          <div className="wrap">
            <div className="sec-top rv">
              <h2>{s.name} 구축 사례</h2>
              <span className="mono">공개 사례 {cases.length}건</span>
            </div>
            <Link href={`/portfolio/${feature.slug}/`} className="feature">
              <div className="reel-frame" data-reel>
                <img src={feature.thumb ?? feature.image} alt={`${feature.client} 로고`} />
              </div>
              <div className="reel-cap">
                <div>
                  <p className="mono">
                    {feature.client} · {feature.industry} · {feature.year}
                  </p>
                  <h3>{feature.title}</h3>
                </div>
                {feature.metrics && (
                  <div className="metric-pair">
                    {feature.metrics.slice(0, 2).map((m) => (
                      <div key={m.label}>
                        <b>{m.value}</b>
                        <span>{m.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Link>
            {rest.length > 0 && (
              <div className="pair">
                {rest.map((p) => (
                  <Link key={p.slug} href={`/portfolio/${p.slug}/`} className="card rv">
                    <div className="ph">
                      <img src={p.thumb ?? p.image} alt={`${p.client} 로고`} loading="lazy" />
                    </div>
                    <p className="mono">
                      {p.client} · {p.industry}
                    </p>
                    <h3>{p.title}</h3>
                    {p.metrics?.[0] && (
                      <p className="m">
                        <b>{p.metrics[0].value}</b>
                        {p.metrics[0].label}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="sec fit">
        <div className="wrap">
          <div className="fit-grid">
            <div className="rv">
              <h2 className="h2">
                이런 회사에
                <br />
                맞습니다.
              </h2>
            </div>
            <ul>
              {s.fit.map((f) => (
                <li key={f} className="rv">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="sec others">
        <div className="wrap">
          <div className="sec-top rv">
            <h2>다른 .AX 서비스</h2>
          </div>
          <ul className="svc-list">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/services/${o.slug}/`}>
                  <span className="no mono">{String(services.indexOf(o) + 1).padStart(2, "0")}</span>
                  <AxName name={o.name} className="nm" />
                  <span className="q">{o.summary}.</span>
                  <span className="arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand
        title={`우리 ${s.system}부터|진단해 보세요.`}
        body={`지금 ${s.system}에서 AI로 바뀌는 업무와 예상 비용,|정부 AX 지원사업 가능 여부를|무료로 알려드립니다.`}
        label={`${s.system} 무료 진단 받기`}
      />
    </>
  );
}
