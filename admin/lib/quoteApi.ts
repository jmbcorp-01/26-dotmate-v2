import { useEffect, useState } from "react";
import { api } from "./api";
import type { Company } from "./types";
import { DEFAULT_SETTINGS, DEFAULT_TERMS, calcTotals, defaultPayment, type Quote, type QuoteSettings } from "./quote";

// 견적 설정(단가표, 제경비·기술료). 저장한 적이 없으면 기본값을 씁니다.
export function useQuoteSettings() {
  const [settings, setSettings] = useState<QuoteSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api<{ settings: QuoteSettings | null }>("/settings/quote")
      .then((r) => {
        if (r.settings?.rates?.length) {
          setSettings({ ...DEFAULT_SETTINGS, ...r.settings });
          setSaved(true);
        }
      })
      .catch(() => {});
  }, []);
  return { settings, setSettings, saved };
}

export function createQuote(company: Company, s: QuoteSettings) {
  const payment = defaultPayment(company.industry);
  return api<Quote>("/quotes", {
    method: "POST",
    body: {
      companyId: company.id,
      title: `${company.name} AX 견적서`,
      items: [],
      overheadPct: s.overheadPct,
      techFeePct: s.techFeePct,
      discount: 0,
      totals: calcTotals([], s.overheadPct, s.techFeePct, 0),
      payment,
      terms: DEFAULT_TERMS,
      validDays: s.validDays,
    },
  });
}
