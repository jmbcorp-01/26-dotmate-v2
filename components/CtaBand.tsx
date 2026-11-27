import Link from "next/link";
import Phrase from "@/components/Phrase";

// 페이지 마지막의 무료 진단 안내. title의 "|"는 줄바꿈 위치입니다.
export default function CtaBand({ title, body, label = "무료 .AX 진단 받기" }: { title: string; body: string; label?: string }) {
  return (
    <section className="close">
      <div className="wrap">
        <p className="mono">시작하기</p>
        <h2>
          {title.split("|").map((line, i) => (
            <span key={i} style={{ display: "block" }}>
              {line}
            </span>
          ))}
        </h2>
        <div className="close-row">
          <p>
            <Phrase text={body} />
          </p>
          <Link href="/diagnosis/" className="btn">
            {label} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
