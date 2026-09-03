import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenvFile } from "dotenv";

/**
 * Workspace-scoped npm scripts run with the package dir as cwd, so plain
 * `dotenv/config` would miss a repo-root .env. Loads it by explicit path,
 * never overriding real environment variables, and never crashes when the
 * file is absent (production supplies real env vars).
 */
export function loadRootEnvFile(cwd: string = process.cwd()): void {
  const path = resolve(cwd, "../../.env");
  if (!existsSync(path)) {
    return;
  }
  const result = loadDotenvFile({ path, override: false });
  if (result.error !== undefined) {
    throw new Error(`Failed to load .env at ${path}: ${result.error.message}`);
  }
}
