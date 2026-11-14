"use client";

import { useState } from "react";
import Link from "next/link";
import { privacy } from "@/lib/privacy";

// 접수 주소: AWS Lambda Function URL (infra/diagnosis-form 참고). 값은 .env.production 의 NEXT_PUBLIC_FORM_ENDPOINT.
const ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT;
const SYSTEMS = ["쇼핑몰", "ERP", "앱", "홈페이지", "기타"];

type Status = "idle" | "sending" | "done" | "error";

export default function DiagnosisForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const systems = fd.getAll("systems");
    if (systems.length === 0) {
      setStatus("error");
      setError("바꾸고 싶은 시스템을 하나 이상 골라 주세요.");
      return;
    }
    if (!ENDPOINT) {
      setStatus("error");
      setError("접수 기능이 아직 연결되지 않았습니다. 사이트 배포 시 연결됩니다.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(fd.entries()), systems }),
      });
      if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        setStatus("error");
        setError(
          body.error === "email"
            ? "이메일 주소를 다시 확인해 주세요."
            : body.error === "phone"
              ? "연락처를 숫자로 다시 확인해 주세요."
              : "입력하지 않은 항목이 있습니다. 확인 후 다시 보내 주세요.",
        );
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setStatus("done");
      form.reset();
    } catch {
      setStatus("error");
      setError(`접수 중 문제가 생겼습니다. 잠시 후 다시 시도하시거나 ${privacy.email} 로 메일 주세요.`);
    }
  }

  if (status === "done") {
    return (
      <div className="diag-form diag-done" role="status">
        <h2>신청이 접수됐습니다.</h2>
        <p>담당자가 확인 후 연락드립니다.</p>
      </div>
    );
  }

  return (
    <form className="diag-form" onSubmit={onSubmit}>
      <div className="field-row">
        <label className="field">
          <span>회사명</span>
          <input id="company" name="company" required autoComplete="organization" />
        </label>
        <label className="field">
          <span>담당자 이름</span>
          <input id="name" name="name" required autoComplete="name" />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          <span>연락처</span>
          <input id="phone" name="phone" type="tel" required autoComplete="tel" placeholder="010-0000-0000" />
        </label>
        <label className="field">
          <span>이메일</span>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </label>
      </div>
      <fieldset className="field">
        <legend>바꾸고 싶은 시스템</legend>
        <div className="chips">
          {SYSTEMS.map((s) => (
            <label key={s} className="chip">
              <input type="checkbox" name="systems" value={s} id={`sys-${s}`} />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>지금 가장 불편한 점</span>
        <textarea id="pain" name="pain" rows={4} placeholder="예: 상품 등록에 하루 3시간씩 걸립니다." />
      </label>
      <div className="hp-field" aria-hidden="true">
        <label>
          웹사이트
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="consent" id="consent-notice">
        <dl>
          <dt>수집 목적</dt>
          <dd>{privacy.purpose}</dd>
          <dt>수집 항목</dt>
          <dd>
            필수: {privacy.required.join(", ")} / 선택: {privacy.optional.join(", ")}
          </dd>
          <dt>보유 기간</dt>
          <dd>{privacy.retention}</dd>
        </dl>
        <p>
          동의를 거부할 수 있으며, 거부하시면 진단 신청이 제한됩니다. 자세한 내용은{" "}
          <Link href="/privacy/" target="_blank">
            개인정보 처리방침
          </Link>
          에서 확인하실 수 있습니다.
        </p>
      </div>
      <label className="agree">
        <input type="checkbox" id="agree" name="agree" required aria-describedby="consent-notice" />
        <span>[필수] 위 개인정보 수집·이용에 동의합니다.</span>
      </label>
      {status === "error" && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-lg" disabled={status === "sending"}>
        {status === "sending" ? "보내는 중…" : "무료 진단 신청"}
      </button>
    </form>
  );
}
