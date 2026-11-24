import { freshSession, signOut } from "./auth";

const API = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

const MESSAGES: Record<string, string> = {
  name_required: "이름을 입력해 주세요.",
  title_required: "영업 건 이름을 입력해 주세요.",
  company_required: "기업을 선택해 주세요.",
  body_required: "내용을 입력해 주세요.",
  not_found: "찾을 수 없습니다. 이미 삭제되었을 수 있습니다.",
  forbidden: "이 계정은 관리자 화면을 쓸 권한이 없습니다.",
  data_key_missing: "공공데이터포털 인증키가 서버에 설정되지 않았습니다.",
  data_not_approved: "공공데이터포털에서 이 API 활용신청이 아직 승인되지 않았습니다. 승인 후 1~2시간 뒤 다시 시도해 주세요.",
  data_limit: "공공데이터포털 하루 조회 한도를 넘었습니다. 내일 다시 시도해 주세요.",
  data_unreachable: "공공데이터포털에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  data_error: "공공데이터포털 조회 중 오류가 났습니다. 잠시 후 다시 시도해 주세요.",
  ai_key_missing: "Claude API 키가 아직 서버에 설정되지 않았습니다.",
  ai_key_invalid: "Claude API 키가 올바르지 않거나 사용이 막혀 있습니다.",
  ai_billing: "Claude API 결제 정보나 크레딧을 확인해 주세요.",
  ai_budget: "이번 달 AI 사용 예산을 다 썼습니다. 다음 달에 다시 쓸 수 있습니다.",
  ai_rate_limited: "AI 요청이 몰렸습니다. 잠시 후 다시 시도해 주세요.",
  ai_unreachable: "Claude API에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  ai_refused: "AI가 이 요청을 처리하지 않았습니다. 기업 정보나 메모를 확인해 주세요.",
  ai_error: "AI 초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
  proposal_unverified: "확인하지 않은 AI 초안 블록이 있습니다. 모든 블록을 확인한 뒤 발송해 주세요.",
  proposal_closed: "닫힌 문서입니다. 다시 열고 고쳐 주세요.",
  expired: "열람 기간이 끝난 링크입니다.",
  quote_locked: "발송했거나 승인된 견적은 고칠 수 없습니다. \"수정본 만들기\"로 새 버전을 만드세요.",
  quote_empty: "견적 금액이 0원입니다. 항목을 먼저 넣어 주세요.",
};
export const errorText = (e: unknown) =>
  e instanceof ApiError ? MESSAGES[e.code] || `요청을 처리하지 못했습니다 (${e.code}).` : "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!API) throw new ApiError(0, "api_url_missing");
  const send = async (force: boolean) => {
    const s = await freshSession(force);
    if (!s) {
      signOut();
      window.dispatchEvent(new Event("dotmate-signed-out"));
      throw new ApiError(401, "unauthorized");
    }
    return fetch(API + path, {
      method: init.method || "GET",
      headers: { Authorization: `Bearer ${s.idToken}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  };
  let res = await send(false);
  if (res.status === 401) res = await send(true);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    signOut();
    window.dispatchEvent(new Event("dotmate-signed-out"));
  }
  if (!res.ok) throw new ApiError(res.status, data.error || "error");
  return data as T;
}

export const won = (n?: number) => (n ? n.toLocaleString("ko-KR") + "원" : "-");
export const manwon = (n?: number) => (n ? Math.round(n / 10000).toLocaleString("ko-KR") + "만" : "0");

// 고객용 공개 링크 (로그인 없음)
export async function publicApi<T>(path: string): Promise<T> {
  if (!API) throw new ApiError(0, "api_url_missing");
  const res = await fetch(API + path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || "error");
  return data as T;
}

export async function publicPost<T>(path: string, body: unknown): Promise<T> {
  if (!API) throw new ApiError(0, "api_url_missing");
  const res = await fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || "error");
  return data as T;
}
