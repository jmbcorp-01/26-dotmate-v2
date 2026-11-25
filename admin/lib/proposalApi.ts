import { api } from "./api";
import type { Company } from "./types";
import { blankIntro, blankMini, templateFor, type Proposal } from "./proposal";

// 새 문서는 산업 템플릿으로 채운 초안에서 시작합니다. 미니 제안서는 편집기에서 AI로 맞춤 블록을 채울 수 있습니다.
export function createProposal(company: Company, kind: "mini" | "intro") {
  const blocks = kind === "intro" ? blankIntro(company.name) : blankMini(company.name, templateFor(company.industry));
  return api<Proposal>("/proposals", { method: "POST", body: { companyId: company.id, kind, blocks } });
}
