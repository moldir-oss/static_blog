#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createWriteStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ZipArchive } from "archiver";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = ["vercel", "netlify", "cloudflare", "github", "render", "static"];
const SECRET_KEYS = new Set([
  "VERCEL_TOKEN",
  "NETLIFY_AUTH_TOKEN",
  "CLOUDFLARE_API_TOKEN",
]);

function argValue(name) {
  const i = process.argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i === -1) return null;
  if (process.argv[i].includes("=")) return process.argv[i].split("=").slice(1).join("=");
  return process.argv[i + 1] ?? null;
}

function parseDotenv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const quoted = (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2);
    if (quoted) {
      value = value.slice(1, -1);
    } else {
      const hash = value.indexOf(" #");
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    if (key) out[key] = value;
  }
  return out;
}

function fail(msg) {
  console.error(`[package] ERROR: ${msg}`);
  process.exit(1);
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function showConfig(cfg) {
  console.log("[package] Local config:");
  for (const [k, v] of Object.entries(cfg)) {
    const display = SECRET_KEYS.has(k) ? (v ? "(set, hidden)" : "(empty)") : (v || "(empty)");
    console.log(`  ${k}=${display}`);
  }
}

function manualSteps(target, zipName) {
  const lines = {
    static: [
      "Classic host (cPanel, O2Switch, VPS...): upload the ZIP to the web root and extract it.",
      "Alternative: upload the contents of the public/ folder directly.",
    ],
    netlify: [
      "Netlify Dashboard > your site > Deploys: drag and drop the public/ folder (or `npm run package:deploy` with a token).",
    ],
    cloudflare: [
      "Cloudflare Dashboard > Pages > your project > Upload assets (or `npm run package:deploy` with a token).",
    ],
    vercel: [
      "Vercel does not accept ZIPs: push to Git (auto import) or use `npx vercel deploy`.",
      "The ZIP is only an archive/backup, also usable for generic hosts.",
    ],
    render: [
      "Render (Static Site) deploys from Git: push to the tracked branch.",
      "The ZIP is only an archive/backup, also usable for generic hosts.",
    ],
    github: [
      "GitHub Pages deploys via the workflow (.github/workflows/hugo.yml): push to main.",
      "The ZIP is not used here (archive/backup only).",
    ],
  };
  console.log(`[package] Next step — ${zipName}:`);
  for (const l of lines[target] ?? lines.static) console.log(`  - ${l}`);
}

function run(cmd, args, env, label) {
  console.log(`[package] ${label} : ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { cwd: ROOT, env, stdio: "inherit" });
  if ((r.status ?? 1) !== 0) fail(`${label} failed (code ${r.status ?? "?"}).`);
}

async function zipPublic(publicDir, zipPath) {
  await new Promise((resolvePromise, reject) => {
    const output = createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    output.on("close", resolvePromise);
    output.on("error", reject);
    archive.on("warning", (err) => {
      if (err.code === "ENOENT") console.warn(`[package] avertissement zip : ${err.message}`);
      else reject(err);
    });
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(publicDir, false);
    archive.finalize();
  });
  const { size } = await stat(zipPath);
  return size;
}

function tryAutoDeploy(cfg) {
  const target = cfg.TARGET;
  if (target === "netlify") {
    if (!cfg.NETLIFY_AUTH_TOKEN) {
      console.log("[package] --deploy: NETLIFY_AUTH_TOKEN missing, upload skipped (see steps above).");
      return;
    }
    if (!cfg.NETLIFY_SITE_ID) fail("--deploy Netlify: NETLIFY_SITE_ID missing in the local config.");
    run("npx", ["--yes", "netlify-cli", "deploy", "--dir=public", "--prod", "--site", cfg.NETLIFY_SITE_ID, "--message", `package ${timestamp()}`],
      { ...process.env, NETLIFY_AUTH_TOKEN: cfg.NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID: cfg.NETLIFY_SITE_ID },
      "Netlify deploy");
    return;
  }
  if (target === "cloudflare") {
    if (!cfg.CLOUDFLARE_API_TOKEN) {
      console.log("[package] --deploy: CLOUDFLARE_API_TOKEN missing, upload skipped (see steps above).");
      return;
    }
    if (!cfg.CF_PROJECT) fail("--deploy Cloudflare: CF_PROJECT (Pages project name) missing in the local config.");
    run("npx", ["--yes", "wrangler", "pages", "deploy", "public", "--project-name", cfg.CF_PROJECT],
      { ...process.env, CLOUDFLARE_API_TOKEN: cfg.CLOUDFLARE_API_TOKEN, ...(cfg.CLOUDFLARE_ACCOUNT_ID ? { CLOUDFLARE_ACCOUNT_ID: cfg.CLOUDFLARE_ACCOUNT_ID } : {}) },
      "Cloudflare Pages deploy");
    return;
  }
  console.log(`[package] --deploy: auto-upload not supported for "${target}", follow the manual steps above.`);
}

const configPath = resolve(ROOT, argValue("config") || ".deploy.local");
if (!existsSync(configPath)) {
  fail(`file not found: ${configPath}\n  Create it: cp deploy-examples/<platform>.example .deploy.local (vercel, netlify, cloudflare, github, render, static).`);
}
const cfg = parseDotenv(readFileSync(configPath, "utf8"));

if (!cfg.TARGET || !TARGETS.includes(cfg.TARGET)) {
  fail(`invalid or missing TARGET (expected: ${TARGETS.join(" | ")}).`);
}
if (!cfg.SITE_URL || !/^https?:\/\/[^/]+/.test(cfg.SITE_URL)) {
  fail("missing or invalid SITE_URL (e.g. https://mon-blog.fr or https://blog.mon-domaine.fr).");
}

showConfig(cfg);

const envLocal = [
  "# Generated by npm run package — local config, do not commit.",
  `HUGO_BASEURL=${cfg.SITE_URL}`,
  ...["GISCUS_REPO", "GISCUS_REPO_ID", "GISCUS_CATEGORY", "GISCUS_CATEGORY_ID", "CUSDIS_APP_ID", "CUSDIS_HOST", "ANONYMIZE_IP", "HUGO_VISIT_API_URL",
      "HUGO_GOOGLE_SITE_VERIFICATION", "HUGO_BING_SITE_VERIFICATION", "INDEXNOW_KEY",
      "VERCEL_TOKEN", "NETLIFY_AUTH_TOKEN", "NETLIFY_SITE_ID", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "CF_PROJECT"]
    .filter((k) => cfg[k])
    .map((k) => `${k}=${cfg[k]}`),
  "",
].join("\n");
writeFileSync(join(ROOT, ".env.local"), envLocal);
console.log("[package] .env.local updated (local only, git-ignored).");

const buildEnv = {
  ...process.env,
  HUGO_BASEURL: cfg.SITE_URL,
  ...Object.fromEntries(
    ["GISCUS_REPO", "GISCUS_REPO_ID", "GISCUS_CATEGORY", "GISCUS_CATEGORY_ID", "CUSDIS_APP_ID", "CUSDIS_HOST", "ANONYMIZE_IP", "HUGO_VISIT_API_URL", "HUGO_GOOGLE_SITE_VERIFICATION", "HUGO_BING_SITE_VERIFICATION", "INDEXNOW_KEY"]
      .filter((k) => cfg[k])
      .map((k) => [k, cfg[k]]),
  ),
};
run(process.execPath, ["scripts/build.mjs", "--target", cfg.TARGET], buildEnv, "Build");

const publicDir = join(ROOT, "public");
if (!existsSync(join(publicDir, "index.html"))) fail("public/index.html not found after the build.");

const zipName = `site-${cfg.TARGET}-${timestamp()}.zip`;
const zipPath = join(ROOT, zipName);
console.log(`[package] Compressing public/ -> ${zipName} ...`);
const bytes = await zipPublic(publicDir, zipPath);
console.log(`[package] ZIP ready: ${zipName} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);

manualSteps(cfg.TARGET, zipName);
if (process.argv.includes("--deploy")) tryAutoDeploy(cfg);
else console.log("[package] Tip: `npm run package:deploy` to attempt auto-upload (token required).");
