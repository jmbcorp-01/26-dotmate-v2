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
