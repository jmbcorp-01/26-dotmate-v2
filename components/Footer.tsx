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
        <p className="fine">© {new Date().getFullYear()} dotmate. 낡은 시스템을 AI 시스템으로.</p>
      </div>
    </footer>
  );
}
