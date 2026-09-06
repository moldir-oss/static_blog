// DEPRECATED — same-origin fallback only.
// Canonical: single Cloudflare Worker+D1 backend (workers/visits-worker.js,
// VISIT_API_URL). This Vercel KV file is kept only when HUGO_VISIT_API_URL
// is empty AND the site runs on Vercel. Retention here: 90-day TTL (KV ex).
const VISIT_TTL_SECONDS = 90 * 24 * 3600;

function getKv() {
  try {
    const { kv } = require("@vercel/kv");
    return kv;
  } catch {
    return null;
  }
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  if (typeof req.headers["x-real-ip"] === "string") return req.headers["x-real-ip"];
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

module.exports = async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ error: "method-not-allowed" });
    return;
  }

  const kv = getKv();
  if (!kv) {
    res.status(501).json({ error: "counter-not-configured" });
    return;
  }

  const dnt = req.headers.dnt === "1" || req.headers["sec-gpc"] === "1";

  let path = "/";
  try {
    if (req.method === "POST" && req.body && typeof req.body.path === "string") {
      path = req.body.path.slice(0, 200);
    } else if (typeof req.query.path === "string") {
      path = req.query.path.slice(0, 200);
    }
  } catch {
  }

  let total = 0;
  try {
    total = await kv.incr("visits:total");
  } catch {
    res.status(501).json({ error: "counter-not-configured" });
    return;
  }

  const rawIp = getClientIp(req);
  const storeIp =
    dnt || !rawIp ? null : process.env.ANONYMIZE_IP === "1" ? anonymizeIp(rawIp) : rawIp;

  if (storeIp) {
    const now = Date.now();
    const key = `visit:${now}:${Math.random().toString(36).slice(2, 10)}`;
    try {
      await kv.set(
        key,
        {
          ip: storeIp,
          country: req.headers["x-vercel-ip-country"] || null,
          path,
          ua: String(req.headers["user-agent"] || "").slice(0, 300),
          ts: new Date(now).toISOString(),
        },
        { ex: VISIT_TTL_SECONDS }
      );
    } catch {
    }
  }

  res.setHeader("cache-control", "no-store");
  res.status(200).json({ ok: true });
};
