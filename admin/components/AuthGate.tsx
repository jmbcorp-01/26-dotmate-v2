"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AuthError,
  DEV_FAKE_AUTH,
  answerMfa,
  loadSession,
  otpauthUri,
  setNewPassword,
  signIn,
  signOut,
  verifyMfaSetup,
  type Session,
  type Step,
} from "@/lib/auth";

const NAV = [
  { href: "/", label: "대시보드" },
  { href: "/pipeline/", label: "영업 파이프라인" },
  { href: "/companies/", label: "타겟 기업" },
  { href: "/inquiry/", label: "문의 등록" },
  { href: "/import/", label: "일괄 등록" },
];

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const path = usePathname();

  useEffect(() => {
    setSession(loadSession());
    const out = () => setSession(null);
    window.addEventListener("dotmate-signed-out", out);
    return () => window.removeEventListener("dotmate-signed-out", out);
  }, []);

  if (session === undefined) return null;
  if (!session) return <Login onDone={setSession} />;

  const current = (href: string) => (href === "/" ? path === "/" : path.startsWith(href) || (href === "/companies/" && path.startsWith("/company")));

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <i aria-hidden /> 닷메이트 영업
        </div>
        <nav className="nav" aria-label="관리자 메뉴">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={current(n.href) ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <div>{session.email}</div>
          {!DEV_FAKE_AUTH && (
            <button
              className="btn ghost small"
              style={{ marginTop: 8 }}
              onClick={() => {
                signOut();
                setSession(null);
              }}
            >
              로그아웃
            </button>
          )}
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Login({ onDone }: { onDone: (s: Session) => void }) {
  const [step, setStep] = useState<Step | null>(null);
  const [email, setEmail] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<Step>) {
    setBusy(true);
    setError("");
    try {
      const next = await fn();
      setValue("");
      if (next.kind === "done") onDone(next.session);
      else setStep(next);
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "로그인 서버에 연결하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!step) return run(() => signIn(email.trim(), value));
    if (step.kind === "newPassword") return run(() => setNewPassword(step, value));
    if (step.kind === "mfaSetup") return run(() => verifyMfaSetup(step, value.replace(/\s/g, "")));
    if (step.kind === "mfa") return run(() => answerMfa(step, value.replace(/\s/g, "")));
  }

  return (
    <div className="login">
      <form className="card" onSubmit={submit}>
        <div className="brand" style={{ padding: 0 }}>
          <i aria-hidden /> 닷메이트 영업 관리
        </div>
        {!step && (
          <>
            <label className="field">
              이메일
              <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field">
              비밀번호
              <input type="password" autoComplete="current-password" required value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
          </>
        )}
        {step?.kind === "newPassword" && (
          <>
            <p>처음 로그인하셨습니다. 앞으로 쓸 비밀번호를 정해 주세요.</p>
            <label className="field">
              새 비밀번호 (12자 이상, 영문 소문자와 숫자 포함)
              <input type="password" autoComplete="new-password" minLength={12} required value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
          </>
        )}
        {step?.kind === "mfaSetup" && (
          <>
            <p>
              2단계 인증을 등록합니다. 휴대폰의 Google Authenticator 같은 인증 앱에서 &quot;설정 키 입력&quot;을 고르고 아래 키를 넣은 뒤, 앱에 뜨는 6자리
              숫자를 입력해 주세요.
            </p>
            <div className="secret">{step.secret}</div>
            <a className="small muted" href={otpauthUri(step.email, step.secret)}>
              휴대폰에서 보고 있다면 여기를 눌러 인증 앱에 바로 추가
            </a>
            <label className="field">
              인증 앱의 6자리 숫자
              <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
          </>
        )}
        {step?.kind === "mfa" && (
          <label className="field">
            인증 앱의 6자리 숫자
            <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
        )}
        {error && <p className="notice">{error}</p>}
        <button className="btn" disabled={busy}>
          {busy ? "확인 중..." : step ? "다음" : "로그인"}
        </button>
        {step && (
          <button type="button" className="btn ghost" onClick={() => setStep(null)}>
            처음부터 다시
          </button>
        )}
      </form>
    </div>
  );
}
