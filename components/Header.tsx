import Link from "next/link";
import { services } from "@/lib/services";
import MobileNav from "@/components/MobileNav";

const links = [
  ...services.map((s) => ({ href: `/services/${s.slug}/`, label: `.AX ${s.name}` })),
  { href: "/portfolio/", label: "포트폴리오" },
];

export default function Header() {
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link href="/" className="brand" aria-label="닷메이트 홈">
          <img src="/logo.png" alt=".mate" width={84} height={23} />
        </Link>
        <nav className="nav" aria-label="주요 메뉴">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/diagnosis/" className="btn btn-sm">
          무료 진단
        </Link>
        <MobileNav links={links} />
      </div>
    </header>
  );
}
