import Link from "next/link";
import { services } from "@/lib/services";

export default function Header() {
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link href="/" className="brand" aria-label="닷메이트 홈">
          <img src="/logo.png" alt=".mate" width={84} height={23} />
        </Link>
        <nav className="nav" aria-label="서비스">
          {services.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}/`}>
              .AX {s.name}
            </Link>
          ))}
        </nav>
        <Link href="/diagnosis/" className="btn btn-sm">
          무료 진단
        </Link>
      </div>
    </header>
  );
}
