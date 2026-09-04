/**
 * Build helper - compiles ESM and CJS, then renames .js -> .mjs / .cjs
 * and updates internal import/require paths to match.
 *
 * Usage: node scripts/build.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

function processDir(dir, ext) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { recursive: true })) {
    const full = join(dir, entry);
    if (full.endsWith(".js")) {
      // Rewrite internal imports before renaming
      const content = readFileSync(full, "utf-8");
      const updated = content
        .replace(/from\s+"\.\/([^"]+)\.js"/g, `from "./$1${ext}"`)
        .replace(/require\s*\(\s*"\.\/([^"]+)\.js"\s*\)/g, `require("./$1${ext}")`)
        // Maps are renamed to <name><ext>.map below; keep the comment in sync
        .replace(/^(\/\/[#@]\s*sourceMappingURL=)(.+)\.js\.map$/m, `$1$2${ext}.map`);
      if (updated !== content) {
        writeFileSync(full, updated);
      }
      renameSync(full, full.replace(/\.js$/, ext));
    }
    if (full.endsWith(".js.map")) {
      renameSync(full, full.replace(/\.js\.map$/, ext + ".map"));
    }
  }
}

// Build ESM
run("npx tsc -p tsconfig.esm.json");
processDir(join(root, "dist/esm"), ".mjs");

// Build CJS
run("npx tsc -p tsconfig.cjs.json");
processDir(join(root, "dist/cjs"), ".cjs");