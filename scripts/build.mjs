#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HUGO_VERSION = "0.165.0";

function arg(name, fallback = null) {
  const i = process.argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i === -1) return fallback;
  const raw = process.argv[i];
  if (raw.includes("=")) return raw.split("=").slice(1).join("=");
  return process.argv[i + 1] ?? fallback;
}

function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

function resolveBaseUrl(target) {
  if (process.env.HUGO_BASEURL && process.env.HUGO_BASEURL.trim().length > 0) {
    return ensureTrailingSlash(process.env.HUGO_BASEURL.trim());
  }
  switch (target) {
    case "vercel":
      if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/`;
      return "https://mon-licenciement-blog.vercel.app/";
    case "netlify":
      if (process.env.DEPLOY_PRIME_URL) return ensureTrailingSlash(process.env.DEPLOY_PRIME_URL);
      if (process.env.URL) return ensureTrailingSlash(process.env.URL);
      return "https://mon-licenciement-blog.netlify.app/";
    case "cloudflare":
      if (process.env.CF_PAGES_URL) return ensureTrailingSlash(process.env.CF_PAGES_URL);
      return "https://mon-licenciement-blog.pages.dev/";
    case "github":
      if (process.env.GITHUB_PAGES_URL) return ensureTrailingSlash(process.env.GITHUB_PAGES_URL);
      if (process.env.GITHUB_REPOSITORY) {
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
        if (owner && repo) return `https://${owner}.github.io/${repo}/`;
      }
      return "https://moldir-oss.github.io/static_blog/";
    case "render":
      if (process.env.RENDER_EXTERNAL_URL) return ensureTrailingSlash(process.env.RENDER_EXTERNAL_URL);
      return "https://mon-licenciement-blog.onrender.com/";
    case "static":
    default:
      return "https://example.com/";
  }
}

function findHugo() {
  const check = (bin) => {
    const r = spawnSync(bin, ["version"], { encoding: "utf8" });
    return r.status === 0 ? bin : null;
  };
  try {
    if (check("hugo")) return "hugo";
  } catch {}
  for (const candidate of ["/tmp/hugo", join(tmpdir(), "hugo")]) {
    try {
      if (existsSync(candidate) && check(candidate)) return candidate;
    } catch {}
  }
  return null;
}

function installHugoLinux(dest) {
  const url = `https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz`;
  console.log(`[build] Hugo not found, downloading v${HUGO_VERSION}...`);
  const r = spawnSync("sh", ["-c", `curl -sL ${url} | tar xz -C ${dest} && chmod +x ${dest}/hugo && ${dest}/hugo version`], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.error("[build] Hugo download failed. Install Hugo manually: https://gohugo.io/installation/");
    process.exit(1);
  }
  return `${dest}/hugo`;
}

const target = (arg("target", process.env.DEPLOY_TARGET || "static") || "static").toLowerCase();
const baseURL = resolveBaseUrl(target);
const drafts = process.env.DRAFTS === "1";

let hugoBin = findHugo();
if (!hugoBin) {
  if (process.platform === "linux") {
    hugoBin = installHugoLinux("/tmp");
  } else {
    console.error("[build] Hugo is not installed. See https://gohugo.io/installation/");
    process.exit(1);
  }
}

console.log(`[build] target=${target} baseURL=${baseURL} hugo=${hugoBin}${drafts ? " (drafts)" : ""}`);

const args = ["--gc", "--minify", "--baseURL", baseURL];
if (drafts) args.push("--buildDrafts", "--buildFuture");

const res = spawnSync(hugoBin, args, { stdio: "inherit" });
process.exit(res.status ?? 1);
