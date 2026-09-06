#!/usr/bin/env node
const argv = process.argv.slice(2);
const get = (name) => {
  const i = argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i === -1) return null;
  if (argv[i].includes("=")) return argv[i].split("=").slice(1).join("=");
  return argv[i + 1] ?? "1";
};

if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) {
  console.log(`
Visit / IP lookup — single backend, private consultation.
(Nothing is exposed or displayed on the site: private consultation only.)

0) Canonical Worker+D1 (all platforms via VISIT_API_URL):
   npx wrangler d1 execute visits --remote --command "SELECT COUNT(*) AS total FROM visits"
   npx wrangler d1 execute visits --remote --command "SELECT ip, path, country, ts FROM visits ORDER BY id DESC LIMIT 20"
   See workers/README.md + IPS.md.

1) Legacy fallbacks (migration only, when HUGO_VISIT_API_URL is empty):
   - Vercel     : Dashboard > Storage > KV > keys "visits:total" + "visit:*"
                  or: node scripts/list-ips.mjs --vercel-dump
                  (env KV_REST_API_URL + KV_REST_API_TOKEN required)
   - Cloudflare KV legacy: npx wrangler kv:key list --namespace-id=<VISITS_ID>
                  Dashboard > Workers & Pages > KV > VISITS
   - Netlify    : Dashboard > Blobs > store "visits" (keys "total" + "visit:*")
                  (no native TTL — hence the D1 switch)
   - No backend : no measurement (silent).

2) Retention: uniform 90 days (opportunistic D1 purge + daily cron).
   Full details: IPS.md + /mentions-legales.
`);
  process.exit(0);
}

if (argv.includes("--vercel-dump")) {
  const limit = parseInt(get("limit") || "20", 10) || 20;
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error("KV_REST_API_URL / KV_REST_API_TOKEN missing (Vercel > Storage > KV > .env.local).");
    process.exit(1);
  }
  const { kv } = await import("@vercel/kv");
  const total = (await kv.get("visits:total")) ?? (await kv.get("visits:total".replace("visits:", ""))) ?? 0;
  console.log(`raw KV total: ${JSON.stringify(total)}`);
  let cursor = 0;
  const keys = [];
  try {
    do {
      const [next, batch] = await kv.scan(cursor, { match: "visit:*", count: 100 });
      cursor = Number(next);
      keys.push(...batch);
      if (keys.length >= limit * 5) break;
    } while (cursor !== 0);
  } catch (e) {
    console.error("scan failed:", e.message);
    console.error("Check the dashboard: Vercel > Storage > KV.");
    process.exit(1);
  }
  console.log(`${keys.length} visit:* key(s) found, showing the ${Math.min(limit, keys.length)} most recent (lexical sort ~ chronological).`);
  keys.sort().reverse();
  for (const k of keys.slice(0, limit)) {
    try {
      console.log(k, JSON.stringify(await kv.get(k)));
    } catch {
      console.log(k, "<unreadable>");
    }
  }
  process.exit(0);
}

console.error("Unknown option. See --help.");
process.exit(1);
