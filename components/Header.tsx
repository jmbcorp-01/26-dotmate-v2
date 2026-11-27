"use client";

// 헤더와 전체 화면 메뉴.
// - 헤더는 화면 위에 떠 있고(mix-blend-mode: difference) 검정·흰 바탕 어디서든 보입니다.
// - 메뉴는 헤더 밖에 따로 그려서 색 반전의 영향을 받지 않습니다.
// - 페이지 이동, 링크 클릭, ESC에 닫히고, 열린 동안 Tab 포커스는 메뉴 안에서만 돕니다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { services } from "@/lib/services";

const links = [
  { href: "/", label: "메인" },
  ...services.map((s) => ({ href: `/services/${s.slug}/`, label: `.AX ${s.name}` })),
  { href: "/portfolio/", label: "포트폴리오" },
  { href: "/diagnosis/", label: "무료 .AX 진단" },
];

const norm = (p: string) => (p.endsWith("/") ? p : `${p}/`);

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const openRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) openRef.current?.focus();
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const html = document.documentElement;
    if (!open) {
      html.removeAttribute("data-menu-open");
      return;
    }
    html.setAttribute("data-menu-open", "");
    closeRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
        return;
      }
      if (e.key === "Tab" && menuRef.current) {
        const items = Array.from(menuRef.current.querySelectorAll<HTMLElement>("a, button"));
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      html.removeAttribute("data-menu-open");
    };
  }, [open, close]);

  return (
    <>
      <a href="#main" className="skip">
        본문 바로가기
      </a>
      <header className="site-header">
        <div className="wrap header-inner">
          <Link href="/" className="brand" aria-label="닷메이트 홈">
            <img className="logo-light" src="/logo-white.png" alt=".mate" width={84} height={23} />
            <img className="logo-dark" src="/logo.png" alt="" width={84} height={23} />
          </Link>
          <button
            ref={openRef}
            type="button"
            className="menu-btn"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen(true)}
          >
            메뉴
            <i aria-hidden="true">
              <b />
              <b />
            </i>
          </button>
        </div>
      </header>

      <div
        id="site-menu"
        ref={menuRef}
        className="menu"
        role="dialog"
        aria-modal="true"
        aria-label="전체 메뉴"
        hidden={!open}
      >
        <div className="menu-top">
          <div className="wrap header-inner">
            <Link href="/" className="brand" aria-label="닷메이트 홈" onClick={() => close()}>
              <img src="/logo-white.png" alt=".mate" width={84} height={23} />
            </Link>
            <button ref={closeRef} type="button" className="menu-close mono" onClick={() => close(true)}>
              닫기 <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>
        <nav className="wrap" aria-label="주요 메뉴">
          <ul className="menu-list">
            {links.map((l, i) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={norm(pathname) === l.href ? "page" : undefined}
                  onClick={() => close()}
                >
                  <span className="mono">{String(i).padStart(2, "0")}</span>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="wrap menu-foot mono">
          <a href="mailto:dotmate@dotmate.co.kr">dotmate@dotmate.co.kr</a>
          <span>since 2017</span>
        </div>
      </div>
    </>
  );
}
