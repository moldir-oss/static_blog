// DEPRECATED — same-origin fallback only.
// Canonical: single Cloudflare Worker+D1 backend (workers/visits-worker.js,
// VISIT_API_URL). Kept only when HUGO_VISIT_API_URL is empty AND deployed on Netlify.
// Known limit: no native Blobs TTL here (retention >90 days) — hence the D1 switch.
const VISIT_TTL_MS = 90 * 24 * 3600 * 1000;

function getClientIp(headers) {
  const nf = headers["x-nf-client-connection-ip"];
  if (typeof nf === "string" && nf.length > 0) return nf.trim();
  const fwd = headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  if (typeof headers["x-real-ip"] === "string") return headers["x-real-ip"];
  return null;
}

function anonymizeIp(ip) {
  if (!ip) return null;
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    return ip;
  }
  if (ip.includes(":")) return `${ip.split(":").slice(0, 3).join(":")}::`;
  return ip;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST" && event.httpMethod !== "GET") {
    return json(405, { error: "method-not-allowed" });
  }

  let getStore;
  try {
    ({ getStore } = await import("@netlify/blobs"));
  } catch {
    return json(501, { error: "counter-not-configured" });
  }

  let store;
  try {
    store = getStore("visits");
  } catch {
    return json(501, { error: "counter-not-configured" });
  }

  const headersLower = {};
  for (const [k, v] of Object.entries(event.headers || {})) headersLower[k.toLowerCase()] = v;
  const dnt = headersLower.dnt === "1" || headersLower["sec-gpc"] === "1";

  let path = "/";
  try {
    if (event.httpMethod === "POST" && event.body) {
      const body = JSON.parse(event.body);
      if (body && typeof body.path === "string") path = body.path.slice(0, 200);
    } else if (event.queryStringParameters && typeof event.queryStringParameters.path === "string") {
      path = event.queryStringParameters.path.slice(0, 200);
    }
  } catch {
  }

  let total = 0;
  try {
    const current = await store.get("total");
    total = (parseInt(current || "0", 10) || 0) + 1;
    await store.set("total", String(total));
  } catch {
    return json(501, { error: "counter-not-configured" });
  }

  const rawIp = getClientIp(headersLower);
  const storeIp =
    dnt || !rawIp ? null : process.env.ANONYMIZE_IP === "1" ? anonymizeIp(rawIp) : rawIp;

  if (storeIp) {
    const now = Date.now();
    const key = `visit:${now}:${Math.random().toString(36).slice(2, 10)}`;
    try {
      await store.setJSON(key, {
        ip: storeIp,
        country: headersLower["x-country"] || null,
        path,
        ua: String(headersLower["user-agent"] || "").slice(0, 300),
        ts: new Date(now).toISOString(),
      });
    } catch {
    }
  }

  void VISIT_TTL_MS;

  return json(200, { ok: true });
};
