"use client";

// 절제된 모션: 스크롤 등장(reveal)과 숫자 카운트업.
// - <html class="js-motion">이 있을 때만 동작합니다(layout의 인라인 스크립트가 붙이며,
//   '동작 줄이기' 설정 사용자에게는 붙이지 않습니다).
// - 대상 선택자는 globals.css의 "스크롤 등장" 규칙과 같아야 합니다.
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export const REVEAL_SELECTOR = [
  ".section-title",
  ".statement",
  ".stat",
  ".source",
  ".belief-inner > *",
  ".svc-card",
  ".step",
  ".cta-inner > *",
  ".compare-col",
  ".outcome",
  ".build-item",
  ".fit-inner > *",
  ".others-title",
  ".others-link",
  ".pf-empty",
  ".pf-card",
].join(",");

const STAGGER_MS = 90;
const MAX_STAGGER = 4;
const COUNT_MS = 1100;

function countUp(el: HTMLElement) {
  const final = el.dataset.final ?? el.textContent ?? "";
  el.dataset.final = final;
  const m = final.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return;
  const [, pre, num, post] = m;
  const target = parseFloat(num);
  const decimals = (num.split(".")[1] ?? "").length;
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / COUNT_MS);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = `${pre}${(target * eased).toFixed(decimals)}${post}`;
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = final;
  };
  requestAnimationFrame(tick);
}

export default function Motion() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    (window as unknown as { __motionReady?: boolean }).__motionReady = true;
    if (!root.classList.contains("js-motion")) return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)).filter(
      (el) => !el.classList.contains("is-in"),
    );

    // 같은 부모 안의 형제끼리 순서대로 살짝 늦게 등장
    const order = new Map<Element, number>();
    for (const el of targets) {
      const parent = el.parentElement;
      if (!parent) continue;
      const i = order.get(parent) ?? 0;
      el.style.setProperty("--reveal-delay", `${Math.min(i, MAX_STAGGER) * STAGGER_MS}ms`);
      order.set(parent, i + 1);
    }

    const show = (el: HTMLElement) => {
      el.classList.add("is-in");
      el.querySelectorAll<HTMLElement>("[data-countup]").forEach(countUp);
    };

    if (!("IntersectionObserver" in window)) {
      targets.forEach(show);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          show(e.target as HTMLElement);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
