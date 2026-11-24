"use client";

import { useMemo, useState } from "react";
import { api, errorText } from "@/lib/api";
import { FIELD_LABELS, guessIndustry, mapHeaders, parseTable } from "@/lib/parse";

// 엑셀·구글 시트에서 표를 복사해 붙여넣으면 기업을 한 번에 등록합니다. 첫 줄은 머리글이어야 합니다.
export default function ImportPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const { headers, fields, rows } = useMemo(() => {
    const t = parseTable(text);
    const headers = t[0] || [];
    return { headers, fields: mapHeaders(headers), rows: t.slice(1) };
  }, [text]);

  const records = useMemo(
    () =>
      rows.map((r) => {
        const o: Record<string, string> = {};
        fields.forEach((f, i) => {
          if (f && r[i]) o[f] = r[i];
        });
        o.industry = guessIndustry(o.industry);
        return o;
      }),
    [rows, fields],
  );
  const hasName = fields.includes("name");

  async function submit() {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const r = await api<{ created: number; skipped: string[] }>("/import", { method: "POST", body: { rows: records } });
      setResult(
        `${r.created}곳을 등록했습니다.` + (r.skipped.length ? ` 이미 있거나 이름이 없는 ${r.skipped.length}곳은 건너뛰었습니다: ${r.skipped.slice(0, 10).join(", ")}` : ""),
      );
      setText("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>일괄 등록</h1>
          <p className="muted">
            엑셀이나 구글 시트에서 머리글 줄까지 표를 복사해 붙여넣으세요. 한 번에 500곳까지, 같은 회사명·사업자번호는 건너뜁니다.
          </p>
        </div>
      </div>
      <section className="card form" style={{ marginBottom: 16 }}>
        <label className="field">
          표 붙여넣기 (CSV도 됩니다)
          <textarea rows={8} placeholder={"회사명\t업종\t지역\t매출\t홈페이지\t출처"} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <p className="small muted">
          알아보는 머리글: {Object.values(FIELD_LABELS).join(", ")}. 업종은 9개 산업 분류로 자동으로 맞춥니다.
        </p>
        {result && <p className="notice ok">{result}</p>}
        {error && <p className="notice">{error}</p>}
        {text && !hasName && <p className="notice">첫 줄에 &quot;회사명&quot; 머리글이 있어야 합니다.</p>}
        <div>
          <button className="btn" disabled={!hasName || records.length === 0 || busy} onClick={submit}>
            {records.length}곳 등록
          </button>
        </div>
      </section>
      {records.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i}>
                    {h} {fields[i] ? `→ ${FIELD_LABELS[fields[i]!]}` : "(무시)"}
                  </th>
                ))}
                <th>산업 분류</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r, i) => (
                <tr key={i}>
                  {headers.map((_, j) => (
                    <td key={j}>{r[j]}</td>
                  ))}
                  <td>{records[i].industry}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 50 && <p className="empty small">미리보기는 50줄까지 보여 줍니다.</p>}
        </div>
      )}
    </>
  );
}
