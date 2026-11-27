"use client";

// 스크롤 모션. <html class="js-motion">일 때만 동작합니다(layout의 인라인 스크립트가 붙이며,
// '동작 줄이기' 설정 사용자에게는 붙이지 않습니다).
// - .rv: 화면에 들어오면 is-in을 붙여 아래에서 떠오르게 합니다.
// - .mf: 소개 문장의 단어가 스크롤에 따라 하나씩 밝아집니다.
// - [data-reel]: 대표 사례 화면이 스크롤에 따라 커집니다.
// - [data-peek]: 작업 목록에서 커서를 따라다니는 미리보기(마우스 사용 기기만).
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STAGGER_MS = 90;
const MAX_STAGGER = 4;

function splitWords(el: HTMLElement) {
  if (el.dataset.split) return;
  el.dataset.split = "1";
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = (child.textContent ?? "").split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const p of parts) {
          if (!p) continue;
          if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
          else {
            const s = document.createElement("span");
            s.className = "w";
            s.textContent = p;
            frag.appendChild(s);
          }
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  };
  walk(el);
}

export default function Motion() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    (window as unknown as { __motionReady?: boolean }).__motionReady = true;
    if (!root.classList.contains("js-motion")) return;
    const cleanups: (() => void)[] = [];

    // 1) 등장
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".rv:not(.is-in)"));
    const order = new Map<Element, number>();
    for (const el of targets) {
      const parent = el.parentElement;
      if (!parent) continue;
      const i = order.get(parent) ?? 0;
      el.style.transitionDelay = `${Math.min(i, MAX_STAGGER) * STAGGER_MS}ms`;
      order.set(parent, i + 1);
    }
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );
      targets.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    } else {
      targets.forEach((el) => el.classList.add("is-in"));
    }

    // 2) 소개 문장 + 3) 대표 사례 크기
    const mfs = Array.from(document.querySelectorAll<HTMLElement>(".mf"));
    mfs.forEach(splitWords);
    const mfWords = mfs.map((m) => Array.from(m.querySelectorAll<HTMLElement>(".w")));
    const reels = Array.from(document.querySelectorAll<HTMLElement>("[data-reel]"));

    let ticking = false;
    const update = () => {
      ticking = false;
      const h = window.innerHeight || 800;
      mfs.forEach((m, idx) => {
        const r = m.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (h * 0.85 - r.top) / (r.height + h * 0.35)));
        const n = Math.round(p * mfWords[idx].length);
        mfWords[idx].forEach((w, i) => w.classList.toggle("on", i < n));
      });
      reels.forEach((reel) => {
        const r = reel.getBoundingClientRect();
        const q = Math.max(0, Math.min(1, (h - r.top) / (h * 0.9)));
        reel.style.transform = `scale(${(0.82 + 0.18 * q).toFixed(4)})`;
        const img = reel.querySelector<HTMLElement>("img");
        if (img) img.style.transform = `scale(${(1.12 - 0.12 * q).toFixed(4)}) translateY(${((1 - q) * -3).toFixed(2)}%)`;
      });
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    if (mfs.length || reels.length) {
      update();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        reels.forEach((reel) => {
          reel.style.transform = "";
          const img = reel.querySelector<HTMLElement>("img");
          if (img) img.style.transform = "";
        });
      });
    }

    // 4) 미리보기
    const list = document.querySelector<HTMLElement>("[data-peek]");
    const peek = document.querySelector<HTMLElement>(".peek");
    const peekImg = peek?.querySelector<HTMLImageElement>("img");
    if (list && peek && peekImg && window.matchMedia("(pointer: fine)").matches) {
      let px = 0;
      let py = 0;
      let cx = 0;
      let cy = 0;
      let raf = 0;
      const loop = () => {
        cx += (px - cx) * 0.15;
        cy += (py - cy) * 0.15;
        const on = peek.classList.contains("on");
        peek.style.transform = `translate(${cx - 180}px, ${cy - 112}px) scale(${on ? 1 : 0.85})`;
        raf = on || Math.abs(px - cx) > 0.5 ? requestAnimationFrame(loop) : 0;
      };
      const onMove = (e: PointerEvent) => {
        px = e.clientX;
        py = e.clientY;
        const a = (e.target as HTMLElement).closest<HTMLElement>("a[data-img]");
        if (a) {
          const src = a.dataset.img!;
          if (peekImg.getAttribute("src") !== src) peekImg.setAttribute("src", src);
          if (!peek.classList.contains("on")) {
            cx = px;
            cy = py;
          }
          peek.classList.add("on");
        }
        if (!raf) raf = requestAnimationFrame(loop);
      };
      const onLeave = () => peek.classList.remove("on");
      list.addEventListener("pointermove", onMove);
      list.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        cancelAnimationFrame(raf);
        list.removeEventListener("pointermove", onMove);
        list.removeEventListener("pointerleave", onLeave);
        peek.classList.remove("on");
      });
    }

    return () => cleanups.forEach((f) => f());
  }, [pathname]);

  return null;
}
