// Canonical counter on Cloudflare Pages — single D1 + CORS.
// Same logic as workers/visits-worker.js (single backend).
// Priority: D1 VISITS_DB (new, 90-day retention via purge) then legacy
// KV VISITS fallback (90-day expirationTtl) during migration.
// Called same-origin (/api/visit) OR cross-origin (absolute VISIT_API_URL).

const VISIT_TTL_SECONDS = 90 * 24 * 3600;
const RETENTION_DAYS = 90;

function getClientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
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
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts.slice(0, 3).join(":")}::`;
  }
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
  return {
    "access-control-allow-origin": acao,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, dnt, sec-gpc",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

async function writeD1(db, { ip, path, ua, country, ts }) {
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, ip TEXT, path TEXT NOT NULL DEFAULT '/', ua TEXT, country TEXT, ts TEXT NOT NULL)"
    ),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_visits_ts ON visits(ts)"),
    db.prepare("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)"),
  ]);
  await db.batch([
    db
      .prepare("INSERT INTO visits (ip, path, ua, country, ts) VALUES (?, ?, ?, ?, ?)")
      .bind(ip, path, ua, country, ts),
    db.prepare(
      "INSERT INTO meta (k, v) VALUES ('total', '1') ON CONFLICT(k) DO UPDATE SET v = CAST(CAST(v AS INTEGER) + 1 AS TEXT)"
    ),
  ]);
  if (Math.random() < 0.05) {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
    try {
      await db.prepare("DELETE FROM visits WHERE ts < ?").bind(cutoff).run();
    } catch {}
  }
}

async function writeLegacyKv(kv, { ip, path, ua, country, ts }) {
  const current = await kv.get("total");
  await kv.put("total", String((parseInt(current || "0", 10) || 0) + 1));
  if (ip) {
    const key = `visit:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
    await kv.put(key, JSON.stringify({ ip, country, path, ua, ts }), {
      expirationTtl: VISIT_TTL_SECONDS,
    });
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const cors = corsHeaders(request, env);
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "content-type": "application/json", "cache-control": "no-store", ...cors },
    });

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST" && request.method !== "GET") {
    return json({ error: "method-not-allowed" }, 405);
  }

  const hasD1 = Boolean(env && env.VISITS_DB);
  const hasKv = Boolean(env && env.VISITS);
  if (!hasD1 && !hasKv) {
    return json({ error: "counter-not-configured" }, 501);
  }

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

  const nowIso = new Date().toISOString();
  const rawIp = getClientIp(request);
  const anon = env && env.ANONYMIZE_IP === "1";
  const storeIp = dnt ? null : rawIp && anon ? anonymizeIp(rawIp) : rawIp;
  const record = {
    ip: storeIp,
    country: request.headers.get("cf-ipcountry") || null,
    path,
    ua: (request.headers.get("user-agent") || "").slice(0, 300),
    ts: nowIso,
  };

  try {
    if (hasD1) await writeD1(env.VISITS_DB, record);
    else await writeLegacyKv(env.VISITS, record);
  } catch {
    return json({ ok: false });
  }

  return json({ ok: true });
}
