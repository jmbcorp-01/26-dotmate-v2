// 로컬 개발용 모의 API: 실제 Lambda 코드(infra/sales-api/index.mjs)를 메모리 저장소로 실행합니다.
// 사용: (처음 한 번) cd infra/sales-api && npm install
//       npm run mock  → http://localhost:3002
//       NEXT_PUBLIC_API_URL=http://localhost:3002 NEXT_PUBLIC_DEV_FAKE_AUTH=1 npm run dev
import http from "node:http";
import { handler, useLocalDev } from "../../infra/sales-api/index.mjs";

const store = new Map(); // "pk|sk" → item
const k = (key) => `${key.pk}|${key.sk}`;
const fakeDb = {
  async send(cmd) {
    const name = cmd.constructor.name;
    const i = cmd.input;
    if (name === "GetCommand") return { Item: structuredClone(store.get(k(i.Key))) };
    if (name === "PutCommand") return store.set(k(i.Item), structuredClone(i.Item)), {};
    if (name === "DeleteCommand") return store.delete(k(i.Key)), {};
    if (name === "BatchWriteCommand") {
      for (const reqs of Object.values(i.RequestItems)) for (const r of reqs) r.PutRequest ? store.set(k(r.PutRequest.Item), structuredClone(r.PutRequest.Item)) : store.delete(k(r.DeleteRequest.Key));
      return {};
    }
    if (name === "QueryCommand") {
      const pk = i.ExpressionAttributeValues[":p"];
      const items = [...store.values()].filter((x) => x.pk === pk).sort((a, b) => a.sk.localeCompare(b.sk));
      if (i.ScanIndexForward === false) items.reverse();
      return { Items: structuredClone(items) };
    }
    throw new Error("mock: unsupported " + name);
  },
};
useLocalDev(fakeDb, { email: "dev@localhost" });

http
  .createServer(async (req, res) => {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization,content-type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE",
    };
    if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
    let body = "";
    for await (const c of req) body += c;
    const url = new URL(req.url, "http://localhost");
    const r = await handler({ requestContext: { http: { method: req.method } }, rawPath: url.pathname, rawQueryString: url.search.slice(1), headers: req.headers, body: body || undefined });
    res.writeHead(r.statusCode, { ...cors, ...(r.headers || {}) }).end(r.body);
  })
  .listen(3002, () => console.log("mock API http://localhost:3002"));
