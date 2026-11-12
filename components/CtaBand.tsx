import Link from "next/link";
import Phrase from "@/components/Phrase";

export default function CtaBand({ title, body }: { title: string; body: string }) {
  return (
    <section className="cta-band">
      <div className="wrap cta-inner">
        <h2>
          <Phrase text={title} />
        </h2>
        <p>
          <Phrase text={body} />
        </p>
        <Link href="/diagnosis/" className="btn btn-lg">
          무료 .AX 진단 받기
        </Link>
      </div>
    </section>
  );
}
