import type { Metadata } from "next";
import DiagnosisForm from "./DiagnosisForm";
import Phrase from "@/components/Phrase";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "무료 .AX 진단 · AI 전환 무료 상담",
  description:
    "지금 쓰는 쇼핑몰, ERP, 앱, 홈페이지를 알려주시면 AI로 바뀌는 업무 목록, 우선순위와 예상 비용, 정부 AX 지원사업 연계 가능 여부를 무료로 정리해 드립니다.",
  path: "/diagnosis/",
  image: "diagnosis",
});

const gets = [
  "AI로 바뀌는 업무 목록",
  "우선순위와 예상 비용",
  "정부 AX 지원사업 연계 가능 여부",
];

export default function DiagnosisPage() {
  return (
    <section className="diag">
      <div className="wrap diag-inner">
        <div className="diag-intro">
          <p className="hero-kicker">무료 .AX 진단</p>
          <h1>
            <Phrase text="지금 시스템을|알려주세요." />
          </h1>
          <p className="hero-sub">어디서부터 바꾸면 좋을지 정리해 드립니다.</p>
          <ul className="diag-gets">
            {gets.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
        <DiagnosisForm />
      </div>
    </section>
  );
}
