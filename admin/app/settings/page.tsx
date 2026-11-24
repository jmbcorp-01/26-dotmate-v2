"use client";

import { useState } from "react";
import { api, errorText } from "@/lib/api";
import { useQuoteSettings } from "@/lib/quoteApi";
import { DEFAULT_SETTINGS, krw } from "@/lib/quote";

export default function QuoteSettingsPage() {
  const { settings, setSettings, saved } = useQuoteSettings();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await api("/settings/quote", { method: "PUT", body: settings });
      setMsg("저장했습니다. 새로 만드는 견적부터 적용됩니다.");
    } catch (e) {
      setMsg(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const set = (patch: Partial<typeof settings>) => setSettings({ ...settings, ...patch });

  return (
    <>
      <div className="head">
        <div>
          <h1>견적 설정</h1>
          <p className="muted">
            새 견적에 쓰는 직무별 일 단가와 제경비·기술료 비율입니다. {saved ? "저장된 설정을 쓰고 있습니다." : "지금은 기본값(2026년 SW기술자 평균임금)을 쓰고 있습니다."}
          </p>
        </div>
        <button className="btn" disabled={busy} onClick={save}>
          저장
        </button>
      </div>
      {msg && <p className="notice ok">{msg}</p>}

      <section className="card form" style={{ marginBottom: 16 }}>
        <div className="grid grid-3">
          <label>
            <span className="small muted">제경비 (직접인건비 대비 %)</span>
            <input type="number" min={0} max={300} value={settings.overheadPct} onChange={(e) => set({ overheadPct: Number(e.target.value) })} />
          </label>
          <label>
            <span className="small muted">기술료 (인건비+제경비 대비 %)</span>
            <input type="number" min={0} max={100} value={settings.techFeePct} onChange={(e) => set({ techFeePct: Number(e.target.value) })} />
          </label>
          <label>
            <span className="small muted">견적 유효 기간 (일)</span>
            <input type="number" min={1} max={90} value={settings.validDays} onChange={(e) => set({ validDays: Number(e.target.value) })} />
          </label>
        </div>
        <p className="small muted">SW사업 대가산정 가이드의 통상 범위는 제경비 110~120%, 기술료 20~40%입니다. 기본값은 제경비 110%, 기술료 20%입니다.</p>
      </section>

      <section className="card">
        <div className="spread">
          <h2 style={{ margin: 0, fontSize: 16 }}>직무별 일 단가 ({settings.rateYear}년)</h2>
          <button className="btn ghost small" onClick={() => setSettings(DEFAULT_SETTINGS)}>
            2026년 공표 단가로 되돌리기
          </button>
        </div>
        <p className="small muted">한국SW산업협회 2026년 적용 SW기술자 평균임금(일평균임금). 해마다 12월에 새 단가가 공표되면 여기서 바꿉니다.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>직무</th>
                <th>일 단가</th>
                <th>월 단가 (20.5일)</th>
              </tr>
            </thead>
            <tbody>
              {settings.rates.map((r, i) => (
                <tr key={r.role}>
                  <td>{r.role}</td>
                  <td>
                    <input
                      type="number"
                      aria-label={`${r.role} 일 단가`}
                      value={r.daily}
                      onChange={(e) => set({ rates: settings.rates.map((x, j) => (j === i ? { ...x, daily: Number(e.target.value) } : x)) })}
                      style={{ width: 130 }}
                    />
                  </td>
                  <td>{krw(r.daily * 20.5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
