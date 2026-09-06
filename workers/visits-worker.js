// Single visits/IP backend — Cloudflare Worker + D1 (canonical, free).
// Called from ANY host (GitHub Pages, Vercel, Netlify,
// Cloudflare Pages, local) via an absolute VISIT_API_URL. Single 90-day retention.
// Secrets (D1) stay server-side; the only public response is { ok: true }.
//
// Deploy: npx wrangler deploy -c workers/wrangler.visits.toml
// D1: npx wrangler d1 create visits -> paste database_id -> migrate schema.sql
// Read: npx wrangler d1 execute visits --remote --command "SELECT COUNT(*) FROM visits"
//       npx wrangler d1 execute visits --remote --command "SELECT ip, path, ts FROM visits ORDER BY id DESC LIMIT 20"

const RETENTION_DAYS = 90;

function getClientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
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

function corsHeaders(request, env) {
  const allow = (env && env.ALLOWED_ORIGINS) || "*";
  const origin = request.headers.get("origin") || "";
  let acao = allow;
  if (allow !== "*" && origin) {
    const list = allow.split(",").map((s) => s.trim()).filter(Boolean);
    acao = list.includes(origin) ? origin : list[0] || "null";
  }
  const headers = {
    "access-control-allow-origin": acao,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, dnt, sec-gpc",
    "access-control-max-age": "86400",
    vary: "origin",
  };
  if (allow !== "*" && acao !== "null") headers["access-control-allow-credentials"] = "false";
  return headers;
}

async function ensureSchema(db) {
  // D1 is applied via schema.sql in principle; guard if a table is missing.
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, ip TEXT, path TEXT NOT NULL DEFAULT '/', ua TEXT, country TEXT, ts TEXT NOT NULL)"
    ),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_visits_ts ON visits(ts)"),
    db.prepare("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)"),
  ]);
}

async function purgeOld(db, nowMs) {
  const cutoff = new Date(nowMs - RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
  try {
    await db.prepare("DELETE FROM visits WHERE ts < ?").bind(cutoff).run();
  } catch {}
}

async function handleVisit(request, env) {
  const cors = corsHeaders(request, env);
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        ...cors,
      },
    });

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST" && request.method !== "GET") {
    return json({ error: "method-not-allowed" }, 405);
  }
  const db = env && env.VISITS_DB;
  if (!db) return json({ error: "counter-not-configured" }, 501);

  const dnt = request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1";

  let path = "/";
  try {
    if (request.method === "POST") {
      const body = await request.json();
      if (body && typeof body.path === "string") path = body.path.slice(0, 200);
    } else {
      path = new URL(request.url).searchParams.get("path")?.slice(0, 200) || "/";
    }
  } catch {}

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const rawIp = getClientIp(request);
  const anon = env && env.ANONYMIZE_IP === "1";
  const storeIp = dnt || !rawIp ? null : anon ? anonymizeIp(rawIp) : rawIp;

  try {
    await ensureSchema(db);
  } catch {
    return json({ ok: false }, 200);
  }

  try {
    await db.batch([
      db
        .prepare("INSERT INTO visits (ip, path, ua, country, ts) VALUES (?, ?, ?, ?, ?)")
        .bind(
          storeIp,
          path,
          (request.headers.get("user-agent") || "").slice(0, 300),
          request.headers.get("cf-ipcountry") || null,
          nowIso
        ),
      db
        .prepare(
          "INSERT INTO meta (k, v) VALUES ('total', '1') ON CONFLICT(k) DO UPDATE SET v = CAST(CAST(v AS INTEGER) + 1 AS TEXT)"
        ),
    ]);
  } catch {
    return json({ ok: false }, 200);
  }

  // Opportunistic purge (~1 req in 20) + daily cron below.
  if (Math.random() < 0.05) {
    try {
      await purgeOld(db, now);
    } catch {}
  }

  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    return handleVisit(request, env);
  },
  // Daily cron (see triggers.crons): strict 90-day purge.
  async scheduled(event, env) {
    if (env && env.VISITS_DB) {
      try {
        await purgeOld(env.VISITS_DB, Date.now());
      } catch {}
    }
  },
};
