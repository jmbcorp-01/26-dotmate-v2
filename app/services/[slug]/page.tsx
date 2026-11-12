import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { services, getService } from "@/lib/services";
import AxName from "@/components/AxName";
import CtaBand from "@/components/CtaBand";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) return {};
  return { title: `.AX ${s.name}`, description: `${s.question} ${s.summary}.` };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) notFound();

  const others = services.filter((o) => o.slug !== s.slug);

  return (
    <>
      <section className="svc-hero">
        <div className="wrap svc-hero-inner">
          <AxName name={s.name} className="svc-hero-name" />
          <h1>{s.question}</h1>
          <p className="hero-sub">{s.summary}.</p>
          <div className="hero-actions">
            <Link href="/diagnosis/" className="btn btn-lg">
              {s.system} 무료 진단 받기
            </Link>
          </div>
        </div>
      </section>

      <section className="compare">
        <div className="wrap">
          <div className="compare-grid">
            <div className="compare-col before">
              <p className="compare-label">지금</p>
              <ul>
                {s.now.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="compare-col after">
              <p className="compare-label">
                <AxName name="이후" />
              </p>
              <ul>
                {s.after.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="outcome">{s.outcome}</p>
        </div>
      </section>

      <section className="build">
        <div className="wrap">
          <h2 className="section-title">이렇게 만듭니다.</h2>
          <div className="build-grid">
            {s.build.map((b) => (
              <div key={b.title} className="build-item">
                <h3>{b.title}</h3>
                <p>{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fit">
        <div className="wrap fit-inner">
          <h2 className="section-title">이런 회사에 맞습니다.</h2>
          <ul className="fit-list">
            {s.fit.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="others">
        <div className="wrap">
          <p className="others-title">다른 .AX 서비스</p>
          <div className="others-row">
            {others.map((o) => (
              <Link key={o.slug} href={`/services/${o.slug}/`} className="others-link">
                <AxName name={o.name} />
                <span className="muted">{o.summary}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title={`우리 ${s.system}, AI로 바꾸면 뭐가 달라질까요?`}
        body="지금 쓰는 시스템을 알려주시면, 바뀌는 업무와 예상 비용을 무료로 정리해 드립니다."
      />
    </>
  );
}
