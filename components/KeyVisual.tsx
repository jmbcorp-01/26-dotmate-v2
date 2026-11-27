"use client";

// 메인 키비주얼: 점 연결.
// 빨간 점(닷메이트의 '.')에서 신호가 출발해 격자 위의 점들을 회로처럼 잇습니다.
// - 각 점은 빨간 점 쪽으로 한 칸 가까운 점(부모)과 선으로 이어집니다.
// - 신호는 맨해튼 거리 순서로 퍼지고, 3.4초마다 다시 출발합니다.
// - '동작 줄이기' 설정이면 한 장면만 그리고 멈춥니다. 화면 밖에 있으면 그리기를 쉽니다.
import { useEffect, useRef } from "react";

type Pos = { dx: number; dy: number; mdx: number; mdy: number };
type Node = { x: number; y: number; px: number; py: number; d: number; jit: number };

const INK = "245,245,247";
const RED = "216,46,40";

export default function KeyVisual({ pos = { dx: 0.72, dy: 0.38, mdx: 0.7, mdy: 0.3 } }: { pos?: Pos }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { dx, dy, mdx, mdy } = pos;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let net: Node[] = [];
    let G = { s: 44, c0: 0, r0: 0 };
    let raf = 0;
    let visible = true;
    const t0 = performance.now();
    const mob = () => W < 760;

    const setup = () => {
      const m = mob();
      const s = m ? 30 : 44;
      const c0 = Math.round((W * (m ? mdx : dx)) / s);
      const r0 = Math.round((H * (m ? mdy : dy)) / s);
      G = { s, c0, r0 };
      net = [];
      for (let yy = 0; yy * s < H + s; yy++) {
        for (let xx = 0; xx * s < W + s; xx++) {
          const dc = xx - c0;
          const dr = yy - r0;
          const h = ((xx * 73856093) ^ (yy * 19349663)) >>> 0;
          let px = xx;
          let py = yy;
          if (dc !== 0 && (dr === 0 || h % 2 === 0)) px = xx - Math.sign(dc);
          else if (dr !== 0) py = yy - Math.sign(dr);
          net.push({ x: xx * s, y: yy * s, px: px * s, py: py * s, d: Math.abs(dc) + Math.abs(dr), jit: (h % 100) / 100 });
        }
      }
    };

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setup();
      if (reduce) draw(performance.now());
    };

    const circle = (x: number, y: number, r: number, c: string) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      const m = mob();
      const fx = G.c0 * G.s;
      const fy = G.r0 * G.s;
      const per = 3.4;
      const k = reduce ? 2 : t % per;
      const front = k * (m ? 7 : 9);
      const w = 8;
      const R = m ? 11 : 15;
      ctx.clearRect(0, 0, W, H);

      for (const p of net) {
        const e = front - p.d - p.jit;
        const on = e > 0 ? Math.exp(-e / w) : 0;
        const hot = e > 0 ? Math.exp(-e / 1.2) : 0;
        const near = Math.max(0, 1 - p.d / R);
        circle(p.x, p.y, 1.1 + (hot * 2.2 + on * 0.6) * near, `rgba(${INK},${(0.1 + 0.12 * near + on * 0.8 * near).toFixed(3)})`);
      }

      ctx.lineWidth = 1.3;
      for (const q of net) {
        if (q.d === 0) continue;
        const nr = Math.max(0, 1 - q.d / R);
        if (nr <= 0) continue;
        const e = front - q.d - q.jit;
        let a = Math.max(0.09 * nr, e < 0 ? 0 : Math.exp(-e / w) * nr);
        const g = e < 0 ? 1 : Math.min(1, Math.max(e * 1.6, a > 0.09 * nr + 0.001 ? 0 : 1));
        if (e < 0) a = 0.09 * nr;
        ctx.strokeStyle = `rgba(${INK},${(a * 0.8).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(q.px, q.py);
        ctx.lineTo(q.px + (q.x - q.px) * g, q.py + (q.y - q.py) * g);
        ctx.stroke();
      }

      const r = (m ? 9 : 13) * (1 + 0.15 * Math.exp(-k * 3));
      const gr = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 6);
      gr.addColorStop(0, `rgba(${RED},.32)`);
      gr.addColorStop(1, `rgba(${RED},0)`);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(fx, fy, r * 6, 0, Math.PI * 2);
      ctx.fill();
      circle(fx, fy, r, `rgb(${RED})`);
    };

    const loop = (now: number) => {
      draw(now);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };

    size();
    window.addEventListener("resize", size);
    if (reduce) {
      return () => window.removeEventListener("resize", size);
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    });
    io.observe(cv);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", size);
    };
  }, [dx, dy, mdx, mdy]);

  return <canvas ref={ref} className="kv" aria-hidden="true" />;
}
