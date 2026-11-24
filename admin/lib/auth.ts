// Cognito 로그인 (외부 라이브러리 없이 Cognito API를 직접 호출)
// 흐름: 이메일+비밀번호 → (처음) 새 비밀번호 → (처음) 인증 앱 등록 → (매번) 인증 앱 6자리 코드
const REGION = process.env.NEXT_PUBLIC_COGNITO_REGION || "ap-northeast-2";
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "";
const ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com/`;
const KEY = "dotmate-admin-session";

// 로컬 개발용: 모의 API(npm run mock)와 함께 쓸 때만 로그인 단계를 건너뜁니다.
export const DEV_FAKE_AUTH = process.env.NEXT_PUBLIC_DEV_FAKE_AUTH === "1" && process.env.NODE_ENV !== "production";

export type Session = { idToken: string; refreshToken: string; expiresAt: number; email: string };
export type Step =
  | { kind: "done"; session: Session }
  | { kind: "newPassword"; session: string; email: string }
  | { kind: "mfaSetup"; session: string; email: string; secret: string }
  | { kind: "mfa"; session: string; email: string };

type AuthResult = { IdToken: string; RefreshToken?: string; ExpiresIn: number };

export class AuthError extends Error {}

const MESSAGES: Record<string, string> = {
  NotAuthorizedException: "이메일 또는 비밀번호가 맞지 않습니다.",
  UserNotFoundException: "이메일 또는 비밀번호가 맞지 않습니다.",
  CodeMismatchException: "인증 코드가 맞지 않습니다. 앱에 표시된 최신 6자리를 넣어 주세요.",
  EnableSoftwareTokenMFAException: "인증 코드가 맞지 않습니다. 앱에 표시된 최신 6자리를 넣어 주세요.",
  InvalidPasswordException: "비밀번호는 12자 이상, 영문 소문자와 숫자를 포함해야 합니다.",
  ExpiredCodeException: "인증 시간이 지났습니다. 처음부터 다시 로그인해 주세요.",
  TooManyRequestsException: "시도가 너무 많습니다. 잠시 후 다시 해 주세요.",
  LimitExceededException: "시도가 너무 많습니다. 잠시 후 다시 해 주세요.",
};

async function call<T>(target: string, body: object): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const type = String(data.__type || "").split("#").pop() || "Error";
    throw new AuthError(MESSAGES[type] || "로그인 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.");
  }
  return data as T;
}

function emailFrom(idToken: string) {
  try {
    const p = JSON.parse(atob(idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return String(p.email || "");
  } catch {
    return "";
  }
}

function save(r: AuthResult, refreshToken?: string): Session {
  const s: Session = {
    idToken: r.IdToken,
    refreshToken: r.RefreshToken || refreshToken || "",
    expiresAt: Date.now() + (r.ExpiresIn - 60) * 1000,
    email: emailFrom(r.IdToken),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
  return s;
}

export function loadSession(): Session | null {
  if (DEV_FAKE_AUTH) return { idToken: "dev", refreshToken: "", expiresAt: Infinity, email: "dev@localhost" };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function signOut() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

type ChallengeResp = { ChallengeName?: string; Session?: string; AuthenticationResult?: AuthResult };

async function next(r: ChallengeResp, email: string): Promise<Step> {
  if (r.AuthenticationResult) return { kind: "done", session: save(r.AuthenticationResult) };
  if (r.ChallengeName === "NEW_PASSWORD_REQUIRED") return { kind: "newPassword", session: r.Session!, email };
  if (r.ChallengeName === "SOFTWARE_TOKEN_MFA") return { kind: "mfa", session: r.Session!, email };
  if (r.ChallengeName === "MFA_SETUP") {
    const a = await call<{ SecretCode: string; Session: string }>("AssociateSoftwareToken", { Session: r.Session });
    return { kind: "mfaSetup", session: a.Session, email, secret: a.SecretCode };
  }
  throw new AuthError("지원하지 않는 로그인 단계입니다. 관리자에게 문의해 주세요.");
}

export async function signIn(email: string, password: string): Promise<Step> {
  const r = await call<ChallengeResp>("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: { USERNAME: email, PASSWORD: password },
  });
  return next(r, email);
}

export async function setNewPassword(step: { session: string; email: string }, password: string) {
  const r = await call<ChallengeResp>("RespondToAuthChallenge", {
    ChallengeName: "NEW_PASSWORD_REQUIRED",
    ClientId: CLIENT_ID,
    Session: step.session,
    ChallengeResponses: { USERNAME: step.email, NEW_PASSWORD: password },
  });
  return next(r, step.email);
}

export async function verifyMfaSetup(step: { session: string; email: string }, code: string) {
  const v = await call<{ Session: string }>("VerifySoftwareToken", {
    Session: step.session,
    UserCode: code,
    FriendlyDeviceName: "authenticator",
  });
  const r = await call<ChallengeResp>("RespondToAuthChallenge", {
    ChallengeName: "MFA_SETUP",
    ClientId: CLIENT_ID,
    Session: v.Session,
    ChallengeResponses: { USERNAME: step.email },
  });
  return next(r, step.email);
}

export async function answerMfa(step: { session: string; email: string }, code: string) {
  const r = await call<ChallengeResp>("RespondToAuthChallenge", {
    ChallengeName: "SOFTWARE_TOKEN_MFA",
    ClientId: CLIENT_ID,
    Session: step.session,
    ChallengeResponses: { USERNAME: step.email, SOFTWARE_TOKEN_MFA_CODE: code },
  });
  return next(r, step.email);
}

let refreshing: Promise<Session | null> | null = null;
export async function freshSession(force = false): Promise<Session | null> {
  const s = loadSession();
  if (!s) return null;
  if (DEV_FAKE_AUTH || (!force && s.expiresAt > Date.now())) return s;
  if (!s.refreshToken) return null;
  refreshing ??= call<{ AuthenticationResult: AuthResult }>("InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: { REFRESH_TOKEN: s.refreshToken },
  })
    .then((r) => save(r.AuthenticationResult, s.refreshToken))
    .catch(() => {
      signOut();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export function otpauthUri(email: string, secret: string) {
  return `otpauth://totp/${encodeURIComponent("닷메이트 관리자:" + email)}?secret=${secret}&issuer=${encodeURIComponent("닷메이트 관리자")}`;
}
