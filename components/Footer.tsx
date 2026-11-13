import Link from "next/link";
import { services } from "@/lib/services";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-inner">
        <img src="/logo.png" alt=".mate" width={72} height={19} />
        <nav className="footer-nav" aria-label="하단 메뉴">
          {services.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}/`}>
              .AX {s.name}
            </Link>
          ))}
          <Link href="/portfolio/">포트폴리오</Link>
          <Link href="/diagnosis/">무료 .AX 진단</Link>
        </nav>
        <dl className="footer-info">
          <div>
            <dt>회사명</dt>
            <dd>닷메이트</dd>
          </div>
          <div>
            <dt>사업자등록번호</dt>
            <dd>328-31-00498</dd>
          </div>
          <div>
            <dt>설립</dt>
            <dd>2017년</dd>
          </div>
          <div>
            <dt>문의</dt>
            <dd>
              <a href="mailto:dotmate@dotmate.co.kr">dotmate@dotmate.co.kr</a>
            </dd>
          </div>
        </dl>
        <p className="fine">
          <Link href="/privacy/" className="footer-legal">
            개인정보 처리방침
          </Link>
        </p>
        <p className="fine">© {new Date().getFullYear()} dotmate. 낡은 시스템을 AI 시스템으로.</p>
      </div>
    </footer>
  );
}
