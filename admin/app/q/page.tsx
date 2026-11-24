"use client";

// 고객용 견적서 링크: admin.dotmate.co.kr/q/?c=코드 (로그인 없음). 고객은 여기서 승인하거나 수정을 요청합니다.
import { useEffect, useState } from "react";
import { ApiError, publicApi, publicPost } from "@/lib/api";
import type { PublicQuote } from "@/lib/quote";
import QuoteDoc from "@/components/QuoteDoc";

export default function PublicQuotePage() {
  const [code, setCode] = useState("");
  const [q, setQ] = useState<PublicQuote | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"" | "approve" | "request">("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const c = sp.get("c") || "";
    setCode(c);
    if (!c) return setError("링크 주소가 올바르지 않습니다.");
    publicApi<PublicQuote>(`/public/q/${encodeURIComponent(c)}${sp.get("preview") ? "?preview=1" : ""}`)
      .then((d) => {
        setQ(d);
        document.title = `${d.title} | 닷메이트 견적서`;
      })
      .catch((e) =>
        setError(
          e instanceof ApiError && e.status === 410
            ? "유효 기간이 끝났거나 새 버전으로 바뀐 견적서입니다. dotmate@dotmate.co.kr 로 연락해 주시면 다시 보내 드립니다."
            : e instanceof ApiError && e.status === 404
              ? "견적서를 찾을 수 없습니다. 링크 주소를 다시 확인해 주세요."
              : "견적서를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.",
        ),
      );
  }, []);

  async function submit() {
    if (!name.trim()) return setMsg("성함을 입력해 주세요.");
    if (mode === "request" && !text.trim()) return setMsg("요청 내용을 입력해 주세요.");
    setBusy(true);
    setMsg("");
    try {
      if (mode === "approve") {
        setQ(await publicPost<PublicQuote>(`/public/q/${encodeURIComponent(code)}/approve`, { name }));
        setMode("");
      } else {
        await publicPost(`/public/q/${encodeURIComponent(code)}/request`, { name, text });
        setText("");
        setMode("");
        setMsg("수정 요청을 보냈습니다. 확인 후 새 버전으로 다시 보내 드리겠습니다.");
      }
    } catch (e) {
      setMsg(e instanceof ApiError && e.status === 410 ? "유효 기간이 끝난 견적서입니다." : "보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="public">
      {error && (
        <div className="qd">
          <p className="slide-mark">
            <i aria-hidden /> 닷메이트
          </p>
          <p style={{ marginTop: 24 }}>{error}</p>
        </div>
      )}
      {!q && !error && <p className="muted" style={{ textAlign: "center" }}>불러오는 중...</p>}
      {q && (
        <>
          <div className="public-bar" style={{ maxWidth: 880 }}>
            <span>{q.status === "approved" ? "승인된 견적서입니다." : q.expiresAt && `${new Date(q.expiresAt).toLocaleDateString("ko-KR")}까지 유효합니다.`}</span>
            <button className="btn ghost small" onClick={() => window.print()}>
              PDF로 저장
            </button>
          </div>
          <QuoteDoc q={q} />
          <section className={`qd-actions${q.status === "approved" ? " qd-done" : ""}`}>
            {q.status === "approved" ? (
              <p style={{ margin: 0 }}>
                {q.approvedBy}님이 {new Date(q.approvedAt!).toLocaleString("ko-KR")}에 승인했습니다. 계약서를 준비해 연락드리겠습니다.
              </p>
            ) : (
              <>
                <h2>이 견적으로 진행할까요?</h2>
                {mode === "" && (
                  <div className="row">
                    <button className="btn" onClick={() => setMode("approve")}>
                      견적 승인
                    </button>
                    <button className="btn ghost" onClick={() => setMode("request")}>
                      수정 요청
                    </button>
                  </div>
                )}
                {mode !== "" && (
                  <div className="form grid" style={{ gap: 8 }}>
                    <label>
                      <span className="small muted">성함</span>
                      <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                    </label>
                    {mode === "request" && (
                      <label>
                        <span className="small muted">바꾸고 싶은 내용</span>
                        <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
                      </label>
                    )}
                    {mode === "approve" && <p className="small muted">승인하시면 이 금액과 지급 방식으로 계약서를 준비합니다. 계약은 서명으로 확정됩니다.</p>}
                    <div className="row">
                      <button className="btn" disabled={busy} onClick={submit}>
                        {busy ? "보내는 중..." : mode === "approve" ? "승인하기" : "요청 보내기"}
                      </button>
                      <button className="btn ghost" disabled={busy} onClick={() => setMode("")}>
                        취소
                      </button>
                    </div>
                  </div>
                )}
                {msg && <p className="small">{msg}</p>}
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}
