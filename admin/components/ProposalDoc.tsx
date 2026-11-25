// 고객에게 보이는 제안서·회사소개서. 투자 IR 덱처럼 16:9 슬라이드 한 장에 메시지 하나를 둡니다.
// 편집기 미리보기와 공개 링크(/p/)가 같은 화면을 쓰고, 인쇄하면 슬라이드 한 장이 PDF 한 쪽이 됩니다.
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

type SlideDef = { key: string; section: string; flagged?: boolean; tone?: "red"; body: React.ReactNode };

const list = <T,>(v: T[] | undefined, max: number) => (v || []).slice(0, max);

function Deck({ slides, companyName }: { slides: SlideDef[]; companyName: string }) {
  return (
    <article className="deck" aria-label={`${companyName} 제안 자료`}>
      {slides.map((s, i) => (
        <section key={s.key} className={`slide${s.tone === "red" ? " slide-red" : ""}${s.flagged ? " slide-flag" : ""}`}>
          {s.flagged && <span className="slide-flag-tag">AI 초안 · 확인 필요</span>}
          <div className="slide-body">{s.body}</div>
          {i > 0 && (
            <footer className="slide-foot">
              <span className="slide-mark">
                <i aria-hidden /> 닷메이트
              </span>
              <span>{s.section}</span>
              <span>
                {i + 1} / {slides.length}
              </span>
            </footer>
          )}
        </section>
      ))}
    </article>
  );
}

function Cover({ companyName, title, sub }: { companyName: string; title: string; sub?: string }) {
  return (
    <div className="cover">
      <span className="cover-dot" aria-hidden />
      <p className="slide-mark cover-mark">
        <i aria-hidden /> 닷메이트
      </p>
      <div className="cover-text">
        <p className="cover-to">{companyName}</p>
        <h1>{title}</h1>
        {sub && <p className="cover-sub">{sub}</p>}
      </div>
    </div>
  );
}

function Closing({ steps = [] }: { steps?: string[] }) {
  return (
    <div className="closing">
      <h2>30분이면 시작할 수 있습니다</h2>
      {steps.length ? (
        <ol>
          {steps.slice(0, 3).map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ol>
      ) : (
        <p>지금 쓰시는 시스템과 업무를 들려주시면, AI로 바꿀 곳을 1주 안에 정리해 드립니다. 진단은 무료입니다.</p>
      )}
      <dl>
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
      </dl>
      <p className="closing-mark">
        <i aria-hidden /> 닷메이트
      </p>
    </div>
  );
}

function Refs({ industry, limit }: { industry?: string; limit: number }) {
  const items = referencesFor(templateFor(industry)).slice(0, limit);
  return (
    <>
      <div className={`refs refs-${limit}`}>
        {items.map((p) => (
          <a key={p.slug} className="ref" href={`${SITE_URL}/portfolio/${p.slug}/`} target="_blank" rel="noreferrer">
            {imageUrl(p) && <img src={imageUrl(p)} alt={`${p.client} 화면`} />}
            <strong>{p.title}</strong>
            <span>
              {p.metrics?.[0] ? (
                <>
                  <b>{p.metrics[0].value}</b> {p.metrics[0].label}
                </>
              ) : (
                p.category
              )}
            </span>
          </a>
        ))}
      </div>
      <p className="refs-extra">
        {EXTRA_REFERENCES.map((r) => r.title).join(", ")}도 닷메이트가 만들었습니다.
      </p>
    </>
  );
}

function miniSlides(companyName: string, industry: string | undefined, b: Blocks, f: Props["flags"] = {}): SlideDef[] {
  const problems = list(b.problems, 3);
  const areas = list(b.areas, 4);
  const ba = list(b.beforeAfter, 3);
  const roi = list(b.roi?.items, 3);
  const plan = list(b.plan, 4);
  const cost = list(b.cost?.items, 5);
  const s: SlideDef[] = [
    {
      key: "cover",
      section: "표지",
      flagged: f.cover,
      body: <Cover companyName={companyName} title={b.cover?.title || ABOUT.slogan} sub={b.cover?.subtitle} />,
    },
  ];
  if (problems.length)
    s.push({
      key: "problems",
      section: "문제",
      flagged: f.problems || f.situation,
      body: (
        <>
          <h2>지금 시간이 새는 곳</h2>
          {b.situation?.[0] && <p className="lede">{b.situation[0]}</p>}
          <div className="pairs">
            {problems.map((p, i) => (
              <div key={i} className="pair">
                <p className="pair-q">{p.problem}</p>
                <p className="pair-a">{p.solution}</p>
              </div>
            ))}
          </div>
        </>
      ),
    });
  if (areas.length)
    s.push({
      key: "areas",
      section: "해법",
      flagged: f.areas,
      body: (
        <>
          <h2>AI가 맡을 일</h2>
          <div className={`cols cols-${areas.length}`}>
            {areas.map((a, i) => (
              <div key={i}>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
              </div>
            ))}
          </div>
        </>
      ),
    });
  if (ba.length)
    s.push({
      key: "beforeAfter",
      section: "도입 전후",
      flagged: f.beforeAfter,
      body: (
        <>
          <h2>도입하면 이렇게 바뀝니다</h2>
          <div className="ba">
            <p className="ba-h">지금</p>
            <p className="ba-h ba-after">도입 후</p>
            {ba.map((x, i) => (
              <div key={i} className="ba-row">
                <p>{x.before}</p>
                <p className="ba-after">{x.after}</p>
              </div>
            ))}
          </div>
        </>
      ),
    });
  if (roi.length)
    s.push({
      key: "roi",
      section: "기대 효과",
      flagged: f.roi,
      body: (
        <>
          <h2>예상 효과</h2>
          <div className={`figures cols-${roi.length}`}>
            {roi.map((x, i) => (
              <div key={i}>
                <p className="figure">{x.value}</p>
                <p>{x.label}</p>
              </div>
            ))}
          </div>
          {b.roi?.note && <p className="fine">{b.roi.note}</p>}
        </>
      ),
    });
  s.push({
    key: "refs",
    section: "레퍼런스",
    body: (
      <>
        <h2>같은 일을 먼저 해냈습니다</h2>
        <Refs industry={industry} limit={3} />
      </>
    ),
  });
  if (plan.length || cost.length)
    s.push({
      key: "plan",
      section: "추진 방안",
      flagged: f.plan || f.cost,
      body: (
        <>
          <h2>작게 검증하고 넓힙니다</h2>
          <ol className="road">
            {plan.map((p, i) => {
              const c = cost.find((x) => x.item.replace(/\s/g, "") === p.phase.replace(/\s/g, "")) || cost[i];
              return (
                <li key={i}>
                  <p className="road-when">{p.period}</p>
                  <h3>{p.phase}</h3>
                  <p>{p.body}</p>
                  {c && <p className="road-cost">{c.amount}</p>}
                </li>
              );
            })}
          </ol>
          {b.cost?.note && <p className="fine">{b.cost.note}</p>}
        </>
      ),
    });
  s.push({ key: "closing", section: "다음 단계", tone: "red", flagged: f.nextStep, body: <Closing steps={b.nextStep} /> });
  return s;
}

function introSlides(companyName: string, industry: string | undefined, b: Blocks, f: Props["flags"] = {}): SlideDef[] {
  return [
    {
      key: "cover",
      section: "표지",
      flagged: f.cover,
      body: <Cover companyName={companyName} title={b.cover?.title || ABOUT.slogan} sub={b.cover?.subtitle} />,
    },
    {
      key: "about",
      section: "회사 소개",
      body: (
        <>
          <h2>시스템 안에서 AI가 일하게 만듭니다</h2>
          <p className="lede">{ABOUT.intro}</p>
          <div className="shift">
            {ABOUT.dxToAx.map((x) => (
              <div key={x.title}>
                <p className="shift-k">{x.title}</p>
                <p>{x.body}</p>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      key: "strengths",
      section: "경쟁력",
      body: (
        <>
          <h2>만들고, 검증하고, 끝까지 운영합니다</h2>
          <div className="cols cols-4">
            {ABOUT.strengths.map((x) => (
              <div key={x.title}>
                <h3>{x.title}</h3>
                <p>{x.body}</p>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      key: "refs",
      section: "레퍼런스",
      body: (
        <>
          <h2>지금도 돌아가는 시스템들</h2>
          <Refs industry={industry} limit={6} />
        </>
      ),
    },
    {
      key: "services",
      section: "서비스",
      body: (
        <>
          <h2>네 가지 시스템을 AI 시스템으로</h2>
          <div className="cols cols-4">
            {services.map((x) => (
              <div key={x.slug}>
                <h3>{x.system}</h3>
                <p>{x.summary}</p>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      key: "process",
      section: "진행 방식",
      body: (
        <>
          <h2>무료 진단에서 시작합니다</h2>
          <ol className="road road-5">
            {PROCESS.map((p) => (
              <li key={p.step}>
                <p className="road-when">{p.period}</p>
                <h3>{p.step}</h3>
                <p>{p.body}</p>
                <p className="road-cost">{p.price}</p>
              </li>
            ))}
          </ol>
        </>
      ),
    },
    { key: "closing", section: "문의", tone: "red", body: <Closing /> },
  ];
}

export default function ProposalDoc({ kind, companyName, industry, blocks, flags }: Props) {
  const slides = kind === "intro" ? introSlides(companyName, industry, blocks, flags) : miniSlides(companyName, industry, blocks, flags);
  return <Deck slides={slides} companyName={companyName} />;
}
