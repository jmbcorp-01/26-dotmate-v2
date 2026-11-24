"use client";

// 모바일 햄버거 메뉴.
// 헤더는 layout에 있어 페이지를 옮겨도 다시 그려지지 않습니다. 그래서 열림 상태를 직접 관리하고
// 페이지 이동, 링크 탭, 바깥(배경) 탭, ESC, 화면이 넓어질 때 메뉴를 닫습니다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type NavLink = { href: string; label: string };

export default function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) toggleRef.current?.focus();
  }, []);

  // 페이지가 바뀌면 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const html = document.documentElement;
    if (!open) {
      html.removeAttribute("data-menu-open");
      return;
    }
    // 배경 스크롤 잠금과 헤더 스타일은 CSS의 [data-menu-open]이 맡습니다.
    html.setAttribute("data-menu-open", "");
    panelRef.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
        return;
      }
      // 메뉴가 열린 동안 Tab 포커스를 토글 버튼과 메뉴 안에서만 돌게 합니다.
      if (e.key === "Tab" && panelRef.current && toggleRef.current) {
        const items = [toggleRef.current, ...panelRef.current.querySelectorAll<HTMLElement>("a")];
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
    // 메뉴 바깥(헤더의 로고·무료 진단 버튼 포함)을 누르면 닫기
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    // 데스크톱 폭으로 넓어지면 닫기 (globals.css의 860px 기준과 같게)
    const mq = window.matchMedia("(min-width: 861px)");
    const onMq = () => mq.matches && close();

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    mq.addEventListener("change", onMq);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
      mq.removeEventListener("change", onMq);
      html.removeAttribute("data-menu-open");
    };
  }, [open, close]);

  return (
    <div className="mnav" ref={rootRef} data-open={open ? "" : undefined}>
      <button
        ref={toggleRef}
        type="button"
        className="mnav-toggle"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
      </button>
      <div className="mnav-backdrop" aria-hidden="true" onClick={() => close()} />
      <nav id="mobile-menu" ref={panelRef} className="mnav-panel" aria-label="모바일 메뉴" inert={!open}>
        {links.map((l) => {
          const current = pathname === l.href || pathname === l.href.replace(/\/$/, "");
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={current ? "page" : undefined}
              // 지금 보고 있는 페이지 링크를 눌러도 경로가 바뀌지 않으므로 직접 닫습니다.
              onClick={() => close()}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
