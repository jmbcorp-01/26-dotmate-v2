import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="page-head" style={{ minHeight: "80svh" }}>
      <div className="wrap">
        <p className="mono hero-kicker">404</p>
        <h1>
          <span className="line">페이지를</span>
          <span className="line">찾을 수 없습니다.</span>
        </h1>
        <p className="lead">주소가 바뀌었거나 없어진 페이지입니다.</p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 48 }}>
          <Link href="/" className="btn">
            홈으로 가기 <span aria-hidden="true">→</span>
          </Link>
          <Link href="/diagnosis/" className="btn-ghost">
            무료 .AX 진단
          </Link>
        </div>
      </div>
    </section>
  );
}
