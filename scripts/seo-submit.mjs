#!/usr/bin/env node
// SEO — sitemap/URL submission to search engines (manual, post-deploy).
// 2026 context: Google and Bing sitemap "pings" are DEAD (404/410).
// - Google: one-time submit in Search Console (no API without OAuth).
// - Bing/Yandex/Naver/Seznam/Yep: IndexNow (instant push, free).
//   A single call to api.indexnow.org covers all participants.
//   Google does NOT take part in IndexNow.
//
// Usage:
//   node scripts/seo-submit.mjs --init     # generates INDEXNOW_KEY + static/<key>.txt
//   npm run build:<target>                 # rebuild to ship the key file
//   (deploy, check https://YOUR-SITE/<key>.txt)
//   node scripts/seo-submit.mjs            # pushes sitemap URLs to IndexNow
//
// Config: .deploy.local (SITE_URL, INDEXNOW_KEY) or environment variables.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);

function parseDotenv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

function loadLocal() {
  for (const name of [".deploy.local", ".env.local", ".env"]) {
    const p = join(ROOT, name);
    if (existsSync(p)) return parseDotenv(readFileSync(p, "utf8"));
  }
  return {};
}

const local = loadLocal();
const get = (k) => process.env[k] || local[k] || "";
const SITE_URL = (get("SITE_URL") || get("HUGO_BASEURL") || "").replace(/\/+$/, "");
const INDEXNOW_KEY = get("INDEXNOW_KEY") || "";

if (argv.includes("--init")) {
  const key = randomBytes(24).toString("base64url").slice(0, 32);
  const keyFile = join(ROOT, "static", `${key}.txt`);
  writeFileSync(keyFile, `${key}\n`);
  console.log(`[seo] IndexNow key generated: ${key}`);
  console.log(`[seo] Key file written: static/${key}.txt (public, committed, served from the root)`);
  console.log(`[seo] 1. Add to .deploy.local: INDEXNOW_KEY=${key}`);
  console.log(`[seo] 2. Rebuild + deploy, then check: ${SITE_URL || "https://YOUR-SITE"}/${key}.txt`);
  console.log(`[seo] 3. Then run: node scripts/seo-submit.mjs`);
  process.exit(0);
}

if (argv.includes("--help") || argv.includes("-h")) {
  console.log(`
SEO — search engine submission (see DEPLOY.md, SEO section).

  node scripts/seo-submit.mjs --init   Generates INDEXNOW_KEY + static/<key>.txt
  node scripts/seo-submit.mjs          Pushes public/sitemap.xml URLs to IndexNow
                                       (Bing, Yandex, Naver, Seznam, Yep — not Google)

  Google: once in Search Console (Sitemaps + URL Inspection).
  Bing:   once in Bing Webmaster Tools (or import from Search Console).
`);
  process.exit(0);
}

if (!SITE_URL || !/^https?:\/\/[^/]+/.test(SITE_URL)) {
  console.error("[seo] ERROR: missing SITE_URL (set it in .deploy.local).");
  process.exit(1);
}
if (!INDEXNOW_KEY) {
  console.error("[seo] ERROR: missing INDEXNOW_KEY. Run: node scripts/seo-submit.mjs --init");
  process.exit(1);
}

const sitemapPath = join(ROOT, "public", "sitemap.xml");
if (!existsSync(sitemapPath)) {
  console.error("[seo] ERROR: public/sitemap.xml not found. Build first (npm run build:<target>).");
  process.exit(1);
}
const urls = [...readFileSync(sitemapPath, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].trim())
  .filter((u) => u.startsWith("http"));
if (urls.length === 0) {
  console.error("[seo] ERROR: no URLs in public/sitemap.xml.");
  process.exit(1);
}

const { hostname } = new URL(SITE_URL);
const keyLocation = `${SITE_URL}/${INDEXNOW_KEY}.txt`;
const payload = { host: hostname, key: INDEXNOW_KEY, keyLocation, urlList: urls.slice(0, 10000) };

console.log(`[seo] ${payload.urlList.length} URL(s) -> IndexNow (host=${hostname}) ...`);
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload),
});
if (res.status === 200 || res.status === 202) {
  console.log("[seo] OK — URLs sent to Bing/Yandex/Naver/Seznam/Yep.");
  console.log("[seo] Reminder: Google ignores IndexNow — submit the sitemap once in Search Console.");
} else {
  console.error(`[seo] HTTP FAILURE ${res.status}: ${await res.text()}`);
  console.error("[seo] Check that the key file is live:", keyLocation);
  process.exit(1);
}
