"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { parseInquiry } from "@/lib/parse";
import { INDUSTRIES, type Company } from "@/lib/types";

// 홈페이지 무료 진단 신청 메일(dotmate@dotmate.co.kr 수신)을 붙여넣어 기업·담당자·영업 건을 한 번에 등록합니다.
export default function InquiryPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [industry, setIndustry] = useState("기타");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const p = useMemo(() => parseInquiry(text), [text]);
  const ready = !!p.company && !!p.name;

  async function save() {
    setBusy(true);
    setError("");
    try {
      const c = await api<Company>("/companies", {
        method: "POST",
        body: { name: p.company, industry, source: "홈페이지 무료 진단 신청", memo: p.systems ? `바꾸고 싶은 시스템: ${p.systems}` : "" },
      });
      await api(`/companies/${c.id}/contacts`, { method: "POST", body: { name: p.name, phone: p.phone, email: p.email, consent: false } });
      await api(`/companies/${c.id}/activities`, {
        method: "POST",
        body: { type: "문의 접수", body: [`바꾸고 싶은 시스템: ${p.systems || "-"}`, `가장 불편한 점: ${p.pain || "-"}`].join("\n") },
      });
      await api("/deals", {
        method: "POST",
        body: { companyId: c.id, title: `${p.company} 무료 AX 진단`, product: "무료 AX 진단", stage: "진단", nextAction: "신청자에게 연락" },
      });
      router.push(`/company/?id=${c.id}`);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>문의 등록</h1>
          <p className="muted">무료 진단 신청 메일 본문을 그대로 붙여넣으면 기업, 담당자, 영업 건(진단 단계)이 함께 만들어집니다.</p>
        </div>
      </div>
      <div className="grid grid-2">
        <section className="card form">
          <label className="field">
            메일 본문
            <textarea
              rows={14}
              placeholder={"회사명: ...\n담당자: ...\n연락처: ...\n이메일: ...\n바꾸고 싶은 시스템: ...\n가장 불편한 점: ..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
        </section>
        <section className="card form">
          <h2>읽어 낸 내용</h2>
          <dl className="form" style={{ margin: 0 }}>
            {(
              [
                ["회사명", p.company],
                ["담당자", p.name],
                ["연락처", p.phone],
                ["이메일", p.email],
                ["바꾸고 싶은 시스템", p.systems],
                ["가장 불편한 점", p.pain],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="small muted">{k}</dt>
                <dd style={{ margin: 0, whiteSpace: "pre-wrap" }}>{v || "-"}</dd>
              </div>
            ))}
          </dl>
          <label className="field">
            산업 (메일에는 없으니 골라 주세요)
            <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
              {INDUSTRIES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </label>
          <p className="small muted">신청자는 상담 연락에만 동의했으므로, 담당자는 &quot;광고성 메일 수신 동의 안 함&quot;으로 등록됩니다.</p>
          {error && <p className="notice">{error}</p>}
          <div>
            <button className="btn" disabled={!ready || busy} onClick={save}>
              등록하고 기업 상세 보기
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
