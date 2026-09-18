import { createHash } from "node:crypto";

export const runtime = "nodejs";

const recipient = "maria.mccrann@gmwater.com.au";
const maxBytes = 24_000;
// A conservative per-instance cap; shared across visitors, without trusting IP headers.
let windowStart = 0;
let attempts = 0;

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  // Railway terminates TLS before Next.js; request.url may use the internal host.
  // Compare with the HTTP Host header, not untrusted forwarded-host/IP headers.
  let sameOrigin = false;
  try {
    const source = new URL(origin ?? "");
    sameOrigin = ["https:", "http:"].includes(source.protocol) &&
      source.host === (request.headers.get("host") ?? new URL(request.url).host);
  } catch { /* Missing or malformed Origin is rejected below. */ }
  if (!sameOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
    return error("Please submit your request from the Engineering Tools website.", 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return error("Please submit a JSON request.", 415);
  }

  let body: unknown;
  const reader = request.body?.getReader();
  if (!reader) return error("Please enter your tool idea.", 400);
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return error("Your request is too long. Please use 5,000 characters or fewer.", 413);
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return error("We could not read your request. Please try again.", 400);
  }
  if (!body || typeof body !== "object" || !("text" in body) || typeof body.text !== "string" ||
      !body.text.trim() || body.text.length > 5_000 || !("requestId" in body) ||
      typeof body.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) {
    return error("Please enter a tool idea of 1–5,000 characters and try again.", 400);
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.TOOL_REQUEST_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    return error("Request email is not available yet. Please email maria.mccrann@gmwater.com.au directly.", 503);
  }
  const now = Date.now();
  if (now - windowStart >= 60_000) { windowStart = now; attempts = 0; }
  if (++attempts > 10) return error("Too many requests right now. Please wait a minute and try again.", 429);

  const text = body.text.trim();
  // Retries of the same submission reuse a provider key, including after a timeout.
  const digest = createHash("sha256").update(text).digest("hex");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `tool-request/${body.requestId}/${digest}`,
      },
      body: JSON.stringify({ from, to: [recipient], subject: "Engineering Tools: new tool request", text: `A new tool has been requested from the Engineering Tools dashboard.\n\n${text}` }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.error("Tool request email rejected", { status: response.status });
      return error("We could not send your request. Please try again shortly, or email maria.mccrann@gmwater.com.au.", 502);
    }
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string" || !result.id) {
      throw new Error("Missing provider acknowledgement");
    }
    return Response.json({ ok: true });
  } catch {
    return error("We could not confirm your request was sent. Please retry with the same text, or email maria.mccrann@gmwater.com.au.", 502);
  }
}
