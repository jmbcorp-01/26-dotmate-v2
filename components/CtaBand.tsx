import Link from "next/link";

export default function CtaBand({ title, body }: { title: string; body: string }) {
  return (
    <section className="cta-band">
      <div className="wrap cta-inner">
        <h2>{title}</h2>
        <p>{body}</p>
        <Link href="/diagnosis/" className="btn btn-lg">
          무료 .AX 진단 받기
        </Link>
      </div>
    </section>
  );
}
