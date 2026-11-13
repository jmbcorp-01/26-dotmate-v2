// 무료 .AX 진단 신청 접수 Lambda (Function URL로 공개, SES로 메일 발송)
// 런타임: Node.js 22.x (AWS SDK v3 기본 포함)
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const ses = new SESv2Client({});
const TO = process.env.TO_ADDRESS || "dotmate@dotmate.co.kr";
// SES는 한글 표시 이름을 MIME encoded-word로 받아야 합니다.
const FROM = `=?UTF-8?B?${Buffer.from("닷메이트 웹사이트").toString("base64")}?= <${process.env.FROM_ADDRESS || "noreply@dotmate.co.kr"}>`;
const SYSTEMS = ["쇼핑몰", "ERP", "앱", "홈페이지", "기타"];

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const clean = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "");

export const handler = async (event) => {
  if (event.requestContext?.http?.method !== "POST") return json(405, { ok: false });

  let data;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body || "";
    if (raw.length > 20000) return json(413, { ok: false });
    data = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: "bad_json" });
  }

  // 스팸 봇용 숨은 칸. 값이 있으면 조용히 성공 처리
  if (clean(data.website, 200)) return json(200, { ok: true });

  const f = {
    company: clean(data.company, 100),
    name: clean(data.name, 50),
    phone: clean(data.phone, 30),
    email: clean(data.email, 120),
    pain: clean(data.pain, 3000),
  };
  const systems = (Array.isArray(data.systems) ? data.systems : []).filter((s) => SYSTEMS.includes(s));

  if (!f.company || !f.name || !f.phone || !f.email || systems.length === 0)
    return json(400, { ok: false, error: "missing" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return json(400, { ok: false, error: "email" });
  if (!/^[0-9+\-() ]{7,30}$/.test(f.phone)) return json(400, { ok: false, error: "phone" });
  if (data.agree !== "on" && data.agree !== true) return json(400, { ok: false, error: "agree" });

  const at = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const rows = [
    ["회사명", f.company],
    ["담당자", f.name],
    ["연락처", f.phone],
    ["이메일", f.email],
    ["바꾸고 싶은 시스템", systems.join(", ")],
    ["가장 불편한 점", f.pain || "(작성 안 함)"],
    ["개인정보 수집·이용 동의", `동의 (${at})`],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + "\n\n이 메일에 회신하면 신청자에게 바로 답장됩니다.";
  const html =
    `<h2 style="font-family:sans-serif">무료 .AX 진단 신청</h2><table style="font-family:sans-serif;border-collapse:collapse">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><th style="text-align:left;padding:6px 12px 6px 0;vertical-align:top;white-space:nowrap">${esc(k)}</th><td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`,
      )
      .join("") +
    `</table><p style="font-family:sans-serif;color:#666">이 메일에 회신하면 신청자에게 바로 답장됩니다.</p>`;

  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: FROM,
        Destination: { ToAddresses: [TO] },
        ReplyToAddresses: [f.email],
        Content: {
          Simple: {
            Subject: { Data: `[무료 진단 신청] ${f.company} / ${f.name}`, Charset: "UTF-8" },
            Body: { Text: { Data: text, Charset: "UTF-8" }, Html: { Data: html, Charset: "UTF-8" } },
          },
        },
      }),
    );
  } catch (err) {
    // 개인정보는 로그에 남기지 않음
    console.error("send_failed", err?.name, err?.message);
    return json(502, { ok: false, error: "send_failed" });
  }
  console.log("sent");
  return json(200, { ok: true });
};
