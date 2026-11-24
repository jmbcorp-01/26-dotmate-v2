import { INDUSTRIES } from "./types";

// 홈페이지 "무료 .AX 진단 신청" 메일 본문을 붙여넣으면 항목을 뽑아냅니다.
// 메일 형식: infra/diagnosis-form/index.mjs 의 "항목: 값" 줄
export type Inquiry = { company: string; name: string; phone: string; email: string; systems: string; pain: string };
const LABELS: Record<string, keyof Inquiry> = {
  회사명: "company",
  담당자: "name",
  연락처: "phone",
  이메일: "email",
  "바꾸고 싶은 시스템": "systems",
  "가장 불편한 점": "pain",
};

export function parseInquiry(text: string): Inquiry {
  const out: Inquiry = { company: "", name: "", phone: "", email: "", systems: "", pain: "" };
  let current: keyof Inquiry | null = null;
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.replace(/\t/g, " ").trim();
    const m = line.match(/^([^:：]{2,20})\s*[:：]\s*(.*)$/);
    const key = m ? Object.keys(LABELS).find((k) => m[1].replace(/\s+/g, " ").trim() === k) : undefined;
    if (m && key) {
      current = LABELS[key];
      out[current] = m[2].trim();
    } else if (/^개인정보|^이 메일에 회신/.test(line)) {
      current = null;
    } else if (current === "pain" && line) {
      out.pain += (out.pain ? "\n" : "") + line;
    }
  }
  if (out.pain === "(작성 안 함)") out.pain = "";
  return out;
}

// 엑셀·구글 시트에서 복사한 표(탭 구분) 또는 CSV를 행 배열로 바꿉니다.
export function parseTable(text: string): string[][] {
  const src = text.replace(/\r\n?/g, "\n").replace(/\n+$/, "");
  if (!src) return [];
  const delim = src.split("\n")[0].includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  rows.push(row);
  return rows.filter((r) => r.some((c) => c));
}

// 표 머리글 → 기업 항목
const HEADER_MAP: [RegExp, string][] = [
  [/^(회사명|기업명|상호|업체명|회사|기업)$/, "name"],
  [/사업자/, "bizNo"],
  [/산업|업종|분야/, "industry"],
  [/지역|소재지|주소/, "region"],
  [/매출/, "revenue"],
  [/인원|직원|종업원|임직원/, "employees"],
  [/홈페이지|웹사이트|사이트|url/i, "website"],
  [/플랫폼|쇼핑몰|솔루션/, "platform"],
  [/출처|발굴/, "source"],
  [/메모|비고|특이/, "memo"],
];
export const FIELD_LABELS: Record<string, string> = {
  name: "회사명",
  bizNo: "사업자번호",
  industry: "산업",
  region: "지역",
  revenue: "매출",
  employees: "인원",
  website: "홈페이지",
  platform: "플랫폼",
  source: "출처",
  memo: "메모",
};

export function mapHeaders(headers: string[]): (string | null)[] {
  const used = new Set<string>();
  return headers.map((h) => {
    const hit = HEADER_MAP.find(([re, f]) => !used.has(f) && re.test(h.replace(/\s/g, "")));
    if (!hit) return null;
    used.add(hit[1]);
    return hit[1];
  });
}

// 자유롭게 적힌 업종을 9개 산업 분류로 맞춥니다.
const INDUSTRY_HINTS: [RegExp, (typeof INDUSTRIES)[number]][] = [
  [/화장품|뷰티|코스메틱|스킨|미용/, "화장품·뷰티"],
  [/커머스|쇼핑|유통|도소매|소매|온라인 ?판매|리테일/, "이커머스·유통"],
  [/제조|수출|무역|공장|부품|소재|기계/, "B2B 제조·수출"],
  [/프랜차이즈|가맹|외식|카페|매장/, "프랜차이즈·다지점"],
  [/공유오피스|오피스|공간|시설|부동산|숙박/, "공유오피스·공간 운영"],
  [/교육|학원|에듀|강의/, "교육 서비스"],
  [/미디어|콘텐츠|방송|출판|엔터/, "미디어·콘텐츠"],
  [/법률|회계|세무|컨설팅|노무|병원|의료|전문/, "전문 서비스"],
];
export function guessIndustry(text = ""): (typeof INDUSTRIES)[number] {
  const exact = INDUSTRIES.find((i) => i === text.trim());
  if (exact) return exact;
  return INDUSTRY_HINTS.find(([re]) => re.test(text))?.[1] ?? "기타";
}
