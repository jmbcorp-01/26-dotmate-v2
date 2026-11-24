"use client";

// 고객용 제안서·회사소개서 링크: admin.dotmate.co.kr/p/?c=코드 (로그인 없음, 검색 노출 막음)
import { useEffect, useState } from "react";
import { ApiError, publicApi } from "@/lib/api";
import type { PublicProposal } from "@/lib/proposal";
import ProposalDoc from "@/components/ProposalDoc";

export default function PublicProposalPage() {
  const [doc, setDoc] = useState<PublicProposal | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("c") || "";
    if (!code) return setError("링크 주소가 올바르지 않습니다.");
    publicApi<PublicProposal>(`/public/p/${encodeURIComponent(code)}`)
      .then((d) => {
        setDoc(d);
        document.title = `${d.title} | 닷메이트`;
      })
      .catch((e) =>
        setError(
          e instanceof ApiError && e.status === 410
            ? "열람 기간이 끝난 문서입니다. 다시 받아보시려면 dotmate@dotmate.co.kr 로 연락해 주세요."
            : e instanceof ApiError && e.status === 404
              ? "문서를 찾을 수 없습니다. 링크 주소를 다시 확인해 주세요."
              : "문서를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.",
        ),
      );
  }, []);

  return (
    <main className="public">
      {error && (
        <div className="doc">
          <section className="doc-page">
            <p className="doc-brand">
              <i aria-hidden /> 닷메이트
            </p>
            <p>{error}</p>
          </section>
        </div>
      )}
      {!doc && !error && <p className="muted" style={{ textAlign: "center" }}>불러오는 중...</p>}
      {doc && (
        <>
          <div className="public-bar">
            <span>
              {doc.expiresAt && `${new Date(doc.expiresAt).toLocaleDateString("ko-KR")}까지 열람할 수 있습니다.`}
            </span>
            <button className="btn ghost small" onClick={() => window.print()}>
              PDF로 저장
            </button>
          </div>
          <ProposalDoc kind={doc.kind} companyName={doc.companyName} industry={doc.industry} blocks={doc.blocks} />
        </>
      )}
    </main>
  );
}
