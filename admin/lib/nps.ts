// 공공데이터포털 "국민연금공단_국민연금 가입 사업장 내역"(월간 CSV)을 브라우저에서 읽어
// 닷메이트 타겟 산업에 해당하는 사업장만 골라냅니다. 파일은 서버로 올리지 않고, 고른 행만 API로 보냅니다.

export type Prospect = {
  industry: string;
  name: string;
  bizNo?: string;
  kind?: string;
  employees: number;
  region?: string;
  address?: string;
  corp: boolean;
  since?: string;
};

// 업종명(사업장업종코드명)으로 산업을 나눕니다. 위에서부터 먼저 맞는 규칙을 씁니다.
// minEmployees: 해당 산업에서 후보로 남길 최소 국민연금 가입자 수
export const INDUSTRY_RULES: { industry: string; pattern: RegExp; minEmployees: number; corpOnly?: boolean }[] = [
  { industry: "화장품·뷰티", pattern: /화장품|화장용품|미용|피부|네일|향수|두발/, minEmployees: 5 },
  { industry: "이커머스·유통", pattern: /전자상거래|통신\s?판매|무점포|온라인|홈\s?쇼핑/, minEmployees: 5 },
  { industry: "교육 서비스", pattern: /학원|교육|교습|훈련/, minEmployees: 10 },
  { industry: "미디어·콘텐츠", pattern: /출판|영화|비디오|방송|광고|음악|오디오|게임|콘텐츠|잡지|신문|사진/, minEmployees: 5 },
  { industry: "공유오피스·공간 운영", pattern: /비주거용 건물 임대|사무실|공유|오피스|부동산 관리|건물 관리|공간/, minEmployees: 5 },
  {
    industry: "전문 서비스",
    pattern: /법무|변호사|회계|세무|변리|컨설팅|엔지니어링|건축 설계|디자인|시장\s?조사|인력 공급|고용 알선/,
    minEmployees: 10,
  },
  { industry: "프랜차이즈·다지점", pattern: /음식점|커피|제과|주점|편의점|체인|가맹|외식|피자|치킨|햄버거/, minEmployees: 30, corpOnly: true },
  { industry: "B2B 제조·수출", pattern: /제조업/, minEmployees: 20, corpOnly: true },
];

// 방문판매원 알선처럼 업종명에 "화장품"이 들어가도 타겟이 아닌 업종은 뺍니다.
const EXCLUDE = /외판원|방문판매원/;

export function classify(kind: string): (typeof INDUSTRY_RULES)[number] | undefined {
  if (!kind || EXCLUDE.test(kind)) return undefined;
  return INDUSTRY_RULES.find((r) => r.pattern.test(kind));
}

const SIDO: Record<string, string> = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  광주광역시: "광주",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기",
  강원도: "강원",
  강원특별자치도: "강원",
  충청북도: "충북",
  충청남도: "충남",
  전라북도: "전북",
  전북특별자치도: "전북",
  전라남도: "전남",
  경상북도: "경북",
  경상남도: "경남",
  제주특별자치도: "제주",
};
export const REGIONS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];

export function regionOf(address: string): string | undefined {
  const first = address.trim().split(/\s+/)[0] || "";
  if (SIDO[first]) return SIDO[first];
  const short = REGIONS.find((r) => first.startsWith(r));
  return short;
}

const toDate = (v: string) => {
  const d = v.replace(/[^0-9]/g, "");
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : undefined;
};

// 머리글 이름으로 열을 찾습니다. 머리글에 "사업장가입상태코드 1 등록 2 탈퇴"처럼 설명이 붙어 있어도 찾도록 앞부분으로 비교합니다.
const COLUMNS = {
  ym: ["자료생성년월"],
  name: ["사업장명"],
  bizNo: ["사업자등록번호"],
  status: ["사업장가입상태코드"],
  road: ["사업장도로명상세주소"],
  lot: ["사업장지번상세주소"],
  style: ["사업장형태구분코드"],
  kind: ["사업장업종코드명"],
  since: ["적용일자"],
  left: ["탈퇴일자"],
  count: ["가입자수"],
} as const;
type Col = keyof typeof COLUMNS;

function mapColumns(header: string[]): Partial<Record<Col, number>> {
  const clean = header.map((h) => h.replace(/^﻿/, "").replace(/\s+/g, ""));
  const out: Partial<Record<Col, number>> = {};
  for (const [col, names] of Object.entries(COLUMNS) as [Col, readonly string[]][]) {
    const i = clean.findIndex((h) => names.some((n) => h.startsWith(n)));
    if (i >= 0) out[col] = i;
  }
  return out;
}

async function detectEncoding(file: Blob): Promise<string> {
  const head = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
  // 마지막 몇 바이트는 글자 중간에서 잘렸을 수 있어 빼고 검사합니다.
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(head.subarray(0, Math.max(0, head.length - 4)));
    return "utf-8";
  } catch {
    return "euc-kr";
  }
}

// 따옴표를 지원하는 CSV 줄 단위 파서. 큰 파일도 조각씩 읽습니다.
async function* csvRows(file: Blob, encoding: string, onBytes: (n: number) => void): AsyncGenerator<string[]> {
  const decoder = new TextDecoder(encoding);
  const reader = file.stream().getReader();
  let field = "";
  let row: string[] = [];
  let quoted = false;
  let pendingQuote = false;
  for (;;) {
    const { value, done } = await reader.read();
    const text = done ? decoder.decode() : decoder.decode(value, { stream: true });
    if (value) onBytes(value.byteLength);
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (pendingQuote) {
          pendingQuote = false;
          if (ch === '"') {
            field += '"';
            continue;
          }
          quoted = false;
        } else if (ch === '"') {
          pendingQuote = true;
          continue;
        } else {
          field += ch;
          continue;
        }
      }
      if (ch === '"' && field === "") quoted = true;
      else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field.replace(/\r$/, ""));
        yield row;
        row = [];
        field = "";
      } else field += ch;
    }
    if (done) break;
  }
  if (pendingQuote) quoted = false;
  if (field !== "" || row.length) {
    row.push(field.replace(/\r$/, ""));
    yield row;
  }
}

export type ReadResult = { ym: string; total: number; counts: Record<string, number> };

// 파일을 끝까지 읽으며 후보를 batchSize개씩 onBatch로 넘깁니다.
export async function readNpsFile(
  file: File,
  onBatch: (rows: Prospect[], ym: string) => Promise<void>,
  onProgress: (ratio: number, matched: number) => void,
  batchSize = 500,
): Promise<ReadResult> {
  const encoding = await detectEncoding(file);
  let read = 0;
  let cols: Partial<Record<Col, number>> | null = null;
  let ym = "";
  let total = 0;
  let matched = 0;
  const counts: Record<string, number> = {};
  let batch: Prospect[] = [];
  let lastTick = 0;
  const fallbackYm = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  for await (const r of csvRows(file, encoding, (n) => (read += n))) {
    if (!cols) {
      cols = mapColumns(r);
      if (cols.name === undefined || cols.kind === undefined || cols.count === undefined) throw new Error("not_nps_file");
      continue;
    }
    if (r.length < 3) continue;
    total++;
    const get = (c: Col) => (cols![c] === undefined ? "" : (r[cols![c]!] || "").trim());
    if (!ym) {
      const d = get("ym").replace(/[^0-9]/g, "");
      if (d.length >= 6) ym = `${d.slice(0, 4)}-${d.slice(4, 6)}`;
    }
    if (get("status") && get("status") !== "1") continue;
    if (get("left")) continue;
    const kind = get("kind");
    const rule = classify(kind);
    if (!rule) continue;
    const employees = Number(get("count").replace(/[^0-9]/g, "")) || 0;
    const corp = get("style") === "1";
    if (employees < rule.minEmployees || (rule.corpOnly && !corp)) continue;
    const address = get("road") || get("lot");
    batch.push({
      industry: rule.industry,
      name: get("name"),
      bizNo: get("bizNo") || undefined,
      kind,
      employees,
      region: regionOf(address),
      address: address || undefined,
      corp,
      since: toDate(get("since")),
    });
    counts[rule.industry] = (counts[rule.industry] || 0) + 1;
    matched++;
    if (batch.length >= batchSize) {
      await onBatch(batch, ym || fallbackYm());
      batch = [];
    }
    const t = Date.now();
    if (t - lastTick > 250) {
      lastTick = t;
      onProgress(read / file.size, matched);
    }
  }
  if (!cols) throw new Error("not_nps_file");
  if (!ym) ym = fallbackYm();
  if (batch.length) await onBatch(batch, ym);
  onProgress(1, matched);
  return { ym, total, counts };
}
