import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";
import { parseIntoClientConfig } from "pg-connection-string";
import type { ClientConfig } from "pg";
import { loadMonorepoRootEnv } from "./src/config/loadMonorepoRootEnv.js";

const configDirectory = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(configDirectory, "../..");
loadMonorepoRootEnv(monorepoRoot);
loadEnv({ path: resolve(configDirectory, ".env"), override: true });

/** Cloud SQL / hosted Postgres from GitHub Actions often fails TLS verify ("unable to verify the first certificate"). */
function migrateTlsInsecure(): boolean {
  const raw = process.env["MEMORIES_MIGRATE_TLS_INSECURE"];
  return raw === "true" || raw === "1";
}

/**
 * drizzle-kit PostgreSQL typings allow either `{ url }` **or** `{ host, database, ssl, ... }`.
 * Combining `url` + `ssl` is not a supported shape and is ignored at runtime, so insecure TLS
 * must use the expanded ClientConfig form.
 */
function buildPostgresDbCredentials(): { url: string } | ClientConfig {
  const url = process.env["DATABASE_URL"]?.trim() ?? "";
  if (!url) {
    return { url: "" };
  }
  if (!migrateTlsInsecure()) {
    return { url };
  }
  try {
    const cfg = parseIntoClientConfig(url) as ClientConfig;
    const baseSsl =
      typeof cfg.ssl === "object" && cfg.ssl !== null && !Array.isArray(cfg.ssl) ? cfg.ssl : {};
    return {
      ...cfg,
      ssl: { ...baseSsl, rejectUnauthorized: false },
    };
  } catch {
    return { url };
  }
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: buildPostgresDbCredentials(),
  strict: true,
  verbose: true,
});
