import type { Metadata } from "next";
import Link from "next/link";
import Phrase from "@/components/Phrase";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="svc-hero">
      <div className="wrap svc-hero-inner">
        <p className="hero-kicker">404</p>
        <h1>
          <Phrase text="페이지를|찾을 수 없습니다." />
        </h1>
        <p className="hero-sub">주소가 바뀌었거나 없어진 페이지입니다.</p>
        <div className="hero-actions">
          <Link href="/" className="btn btn-lg">
            홈으로 가기
          </Link>
          <Link href="/diagnosis/" className="text-link">
            무료 .AX 진단 <span aria-hidden="true">›</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
