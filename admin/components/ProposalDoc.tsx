// 고객에게 보이는 제안서·회사소개서 화면. 편집기 미리보기와 공개 링크(/p/)가 같은 화면을 씁니다.
// 한 섹션이 인쇄 시 한 쪽이 되도록 나눴습니다 (브라우저 인쇄 → PDF 저장).
import {
  ABOUT,
  CONTACT,
  EXTRA_REFERENCES,
  PROCESS,
  SITE_URL,
  imageUrl,
  referencesFor,
  services,
  templateFor,
  type BlockKey,
  type Blocks,
} from "@/lib/proposal";

type Props = {
  kind: "mini" | "intro";
  companyName: string;
  industry?: string;
  blocks: Blocks;
  flags?: Partial<Record<BlockKey, true>>; // 편집기 미리보기에서만: 확인 안 된 블록 표시
};

const has = (v: unknown) => (Array.isArray(v) ? v.length > 0 : !!v);

function Page({ n, label, children, flagged }: { n?: string; label: string; children: React.ReactNode; flagged?: boolean }) {
  return (
    <section className={`doc-page${flagged ? " doc-flag" : ""}`}>
      <p className="doc-eyebrow">
        {n && <span>{n}</span>} {label}
        {flagged && <em> · 확인 필요</em>}
      </p>
      {children}
    </section>
  );
}

function Contact() {
  return (
    <section className="doc-page doc-end">
      <p className="doc-eyebrow">문의</p>
      <h2>무료 AX 진단으로 시작하세요</h2>
      <p>현재 시스템과 업무를 30분 동안 들려주시면, AI로 바꿀 곳 3~5개를 1주 안에 정리해 드립니다.</p>
      <dl className="doc-contact">
        <dt>메일</dt>
        <dd>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </dd>
        <dt>홈페이지</dt>
        <dd>
          <a href={SITE_URL} target="_blank" rel="noreferrer">
            {CONTACT.web}
          </a>
        </dd>
        <dt>사업자등록번호</dt>
        <dd>{CONTACT.bizNo}</dd>
      </dl>
      <p className="doc-brand">
        <i aria-hidden /> 닷메이트
      </p>
    </section>
  );
}

function References({ industry, limit }: { industry?: string; limit: number }) {
  const list = referencesFor(templateFor(industry)).slice(0, limit);
  return (
    <>
      <div className="doc-refs">
        {list.map((p) => (
          <a key={p.slug} className="doc-ref" href={`${SITE_URL}/portfolio/${p.slug}/`} target="_blank" rel="noreferrer">
            {imageUrl(p) && <img src={imageUrl(p)} alt={`${p.client} 화면`}/>}
            <span className="doc-ref-body">
              <small>
                {p.client} · {p.category}
              </small>
              <strong>{p.title}</strong>
              {p.metrics?.[0] && (
                <span className="doc-metric">
                  <b>{p.metrics[0].value}</b> {p.metrics[0].label}
                </span>
              )}
            </span>
          </a>
        ))}
      </div>
      <ul className="doc-extra">
        {EXTRA_REFERENCES.map((r) => (
          <li key={r.client}>
            <strong>{r.title}</strong> {r.body}
          </li>
        ))}
      </ul>
    </>
  );
}

function Process() {
  return (
    <ol className="doc-steps">
      {PROCESS.map((s) => (
        <li key={s.step}>
          <strong>{s.step}</strong>
          <span>{s.body}</span>
          <small>
            {s.period} · {s.price}
          </small>
        </li>
      ))}
    </ol>
  );
}

export default function ProposalDoc({ kind, companyName, industry, blocks: b, flags = {} }: Props) {
  const cover = (
    <section className={`doc-page doc-cover${flags.cover ? " doc-flag" : ""}`}>
      <p className="doc-brand">
        <i aria-hidden /> 닷메이트
      </p>
      <p className="doc-to">{companyName} 귀하</p>
      <h1>{b.cover?.title || ABOUT.slogan}</h1>
      {b.cover?.subtitle && <p className="doc-sub">{b.cover.subtitle}</p>}
      {flags.cover && <p className="doc-flag-note">확인 필요</p>}
    </section>
  );

  if (kind === "intro") {
    return (
      <article className="doc">
        {cover}
        <Page n="01" label="회사 개요">
          <h2>{ABOUT.slogan}</h2>
          <p className="doc-lead">{ABOUT.intro}</p>
          <div className="doc-two">
            {ABOUT.dxToAx.map((x) => (
              <div key={x.title} className="doc-box">
                <strong>{x.title}</strong>
                <p>{x.body}</p>
              </div>
            ))}
          </div>
        </Page>
        <Page n="02" label="닷메이트의 경쟁력">
          <div className="doc-grid">
            {ABOUT.strengths.map((s) => (
              <div key={s.title} className="doc-box">
                <strong>{s.title}</strong>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </Page>
        <Page n="03" label="레퍼런스">
          <References industry={industry} limit={6} />
        </Page>
        <Page n="04" label="4대 AX 서비스">
          <div className="doc-grid">
            {services.map((s) => (
              <div key={s.slug} className="doc-box">
                <strong>.AX {s.name}</strong>
                <p>{s.summary}</p>
                <ul>
                  {s.after.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Page>
        <Page n="05" label="수행 방법과 상품">
          <Process />
        </Page>
        <Contact />
      </article>
    );
  }

  let n = 0;
  const no = () => String(++n).padStart(2, "0");
  return (
    <article className="doc">
      {cover}
      {(has(b.situation) || has(b.problems)) && (
        <Page n={no()} label="현황과 문제" flagged={flags.situation || flags.problems}>
          {has(b.situation) && (
            <ul className="doc-list">
              {b.situation!.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          {has(b.problems) && (
            <table className="doc-table">
              <thead>
                <tr>
                  <th>지금의 문제</th>
                  <th>AI로 바꾸는 방법</th>
                </tr>
              </thead>
              <tbody>
                {b.problems!.map((p, i) => (
                  <tr key={i}>
                    <td>{p.problem}</td>
                    <td>{p.solution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Page>
      )}
      {(has(b.areas) || has(b.beforeAfter)) && (
        <Page n={no()} label="AX 적용 영역" flagged={flags.areas || flags.beforeAfter}>
          {has(b.areas) && (
            <div className="doc-grid">
              {b.areas!.map((a, i) => (
                <div key={i} className="doc-box">
                  <strong>{a.title}</strong>
                  <p>{a.body}</p>
                </div>
              ))}
            </div>
          )}
          {has(b.beforeAfter) && (
            <table className="doc-table doc-ba">
              <thead>
                <tr>
                  <th>도입 전</th>
                  <th>도입 후</th>
                </tr>
              </thead>
              <tbody>
                {b.beforeAfter!.map((x, i) => (
                  <tr key={i}>
                    <td>{x.before}</td>
                    <td>{x.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Page>
      )}
      {(has(b.roi?.items) || b.roi?.note) && (
        <Page n={no()} label="기대 효과" flagged={flags.roi}>
          {has(b.roi?.items) && (
            <div className="doc-stats">
              {b.roi!.items.map((x, i) => (
                <div key={i}>
                  <b>{x.value}</b>
                  <span>{x.label}</span>
                </div>
              ))}
            </div>
          )}
          {b.roi?.note && <p className="doc-note">{b.roi.note}</p>}
        </Page>
      )}
      <Page n={no()} label="관련 레퍼런스">
        <References industry={industry} limit={3} />
      </Page>
      {(has(b.plan) || has(b.cost?.items)) && (
        <Page n={no()} label="추진 방안과 예상 비용" flagged={flags.plan || flags.cost}>
          {has(b.plan) && (
            <ol className="doc-steps">
              {b.plan!.map((p, i) => (
                <li key={i}>
                  <strong>{p.phase}</strong>
                  <span>{p.body}</span>
                  <small>{p.period}</small>
                </li>
              ))}
            </ol>
          )}
          {has(b.cost?.items) && (
            <table className="doc-table">
              <thead>
                <tr>
                  <th>항목</th>
                  <th>예상 비용</th>
                  <th>비고</th>
                </tr>
              </thead>
              <tbody>
                {b.cost!.items.map((c, i) => (
                  <tr key={i}>
                    <td>{c.item}</td>
                    <td className="doc-nowrap">{c.amount}</td>
                    <td>{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {b.cost?.note && <p className="doc-note">{b.cost.note}</p>}
        </Page>
      )}
      {has(b.nextStep) && (
        <Page n={no()} label="다음 단계" flagged={flags.nextStep}>
          <ol className="doc-list">
            {b.nextStep!.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </Page>
      )}
      <Contact />
    </article>
  );
}
