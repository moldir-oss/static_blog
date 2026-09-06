#!/usr/bin/env node
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) {
      const [k, v] = cur.slice(2).split("=");
      acc.push([k, v ?? arr[i + 1] ?? ""]);
    }
    return acc;
  }, [])
);

function printHelp() {
  console.log(`
Comments setup — Giscus (recommended)

1. Prerequisites (5 min, once):
   - PUBLIC GitHub repo with Discussions enabled (Settings > General > Features > Discussions)
   - Install the app https://github.com/apps/giscus on that repo
   - Open https://giscus.app, fill in repo + category, copy the 4 values

2. Run:
   node scripts/setup-comments.mjs --repo user/repo --repo-id R_xxx --category Announcements --category-id DIC_xxx

3. Apply ONE of the two displayed options (hugo.toml OR env vars).

Recovery if the site closes: see COMMENTAIRES.md (Discussions export + reuse).
`);
}

if (args.help || args.h) {
  printHelp();
  process.exit(0);
}

const { repo, category } = args;
const repoId = args["repo-id"] || args.repoId;
const categoryId = args["category-id"] || args.categoryId;

if (!repo || !repoId || !category || !categoryId) {
  printHelp();
  console.log("\nSample hugo.toml to paste:");
  console.log(`
  [params.giscus]
    repo = "user/repo"
    repoId = "R_xxx"
    category = "Announcements"
    categoryId = "DIC_xxx"
`);
  console.log("Or environment variables to set on Vercel / Netlify / Cloudflare:");
  console.log(`
GISCUS_REPO=user/repo
GISCUS_REPO_ID=R_xxx
GISCUS_CATEGORY=Announcements
GISCUS_CATEGORY_ID=DIC_xxx
`);
  process.exit(repo || repoId || category || categoryId ? 0 : 1);
}

console.log("\n--- Option A: hugo.toml (recommended, versioned) ---");
console.log(`
  [params.giscus]
    repo = "${repo}"
    repoId = "${repoId}"
    category = "${category}"
    categoryId = "${categoryId}"
`);

console.log("--- Option B: environment variables (no code changes) ---");
console.log(`
GISCUS_REPO=${repo}
GISCUS_REPO_ID=${repoId}
GISCUS_CATEGORY=${category}
GISCUS_CATEGORY_ID=${categoryId}
`);
console.log("Vercel: Project > Settings > Environment Variables. Netlify: Site settings > Environment variables.");
console.log("Cloudflare Pages: Dashboard > Pages > Settings > Environment variables.\n");
console.log("Check: rebuild then open a post, the Comments section shows Giscus.");
console.log("Recovery: see COMMENTAIRES.md.\n");
