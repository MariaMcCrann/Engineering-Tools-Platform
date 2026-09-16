import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../app/api/tool-requests/route.ts";

const id = "12345678-1234-4123-8123-123456789abc";
function request(body = { text: "A culvert checker", requestId: id }, headers = {}) {
  return new Request("https://tools.example/api/tool-requests", {
    method: "POST",
    headers: { origin: "https://tools.example", "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("validates requests and handles provider success, failure and retry without leaking secrets", async () => {
  const originalFetch = globalThis.fetch;
  const oldKey = process.env.RESEND_API_KEY;
  const oldFrom = process.env.TOOL_REQUEST_FROM_EMAIL;
  let calls = [];
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return Response.json({ id: "email-123" });
    };
    process.env.RESEND_API_KEY = "test-secret";
    process.env.TOOL_REQUEST_FROM_EMAIL = "Tools <tools@example.com>";
    assert.equal((await POST(request(undefined, { origin: "https://evil.example" }))).status, 403);
    assert.equal((await POST(request(undefined, { "content-type": "text/plain" }))).status, 415);
    for (const body of ["{", null, {}, { text: "  ", requestId: id }, { text: 42, requestId: id }, { text: "a".repeat(5001), requestId: id }, { text: "idea", requestId: "bad" }]) {
      assert.equal((await POST(request(body === null ? "null" : body))).status, 400);
    }
    assert.equal((await POST(request("x".repeat(24001)))).status, 413);
    assert.equal(calls.length, 0);
    delete process.env.RESEND_API_KEY;
    assert.equal((await POST(request())).status, 503);
    const proxied = new Request("http://localhost:3000/api/tool-requests", {
      method: "POST", headers: { origin: "https://tools.example", host: "tools.example", "content-type": "application/json" },
      body: JSON.stringify({ text: "idea", requestId: id }),
    });
    assert.equal((await POST(proxied)).status, 503);
    process.env.RESEND_API_KEY = "test-secret";
    const response = await POST(request({ text: "  <script>idea</script>  ", requestId: id, to: "evil@example.com" }));
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(calls[0].url, "https://api.resend.com/emails");
    const payload = JSON.parse(calls[0].options.body);
    assert.deepEqual(payload.to, ["maria.mccrann@floodriskadvisory.com.au"]);
    assert.equal(payload.html, undefined);
    assert.ok(payload.text.endsWith("<script>idea</script>"));
    await POST(request({ text: "<script>idea</script>", requestId: id }));
    assert.equal(calls[0].options.headers["Idempotency-Key"], calls[1].options.headers["Idempotency-Key"]);
    globalThis.fetch = async () => Response.json({ error: "private provider detail test-secret" }, { status: 401 });
    const failed = await POST(request());
    assert.equal(failed.status, 502);
    assert.doesNotMatch(await failed.text(), /test-secret|private provider/);
    globalThis.fetch = async () => { throw new DOMException("Timed out", "TimeoutError"); };
    assert.equal((await POST(request())).status, 502);
    globalThis.fetch = async () => Response.json({});
    assert.equal((await POST(request())).status, 502);
    globalThis.fetch = async () => Response.json({ id: "ok" });
    for (let i = 0; i < 5; i++) assert.equal((await POST(request())).status, 200);
    assert.equal((await POST(request())).status, 429);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey;
    if (oldFrom === undefined) delete process.env.TOOL_REQUEST_FROM_EMAIL; else process.env.TOOL_REQUEST_FROM_EMAIL = oldFrom;
  }
});
