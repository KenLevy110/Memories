import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const configDirectory = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(configDirectory, "../../.env") });
loadEnv({ path: resolve(configDirectory, ".env"), override: true });

/** Cloud SQL / hosted Postgres from GitHub Actions often fails TLS verify ("unable to verify the first certificate"). Set MEMORIES_MIGRATE_TLS_INSECURE=true only for that CI path, or supply a proper CA via your driver instead. */
function migrateTlsInsecure(): boolean {
  const raw = process.env["MEMORIES_MIGRATE_TLS_INSECURE"];
  return raw === "true" || raw === "1";
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
    ...(migrateTlsInsecure() ? { ssl: { rejectUnauthorized: false } as const } : {}),
  },
  strict: true,
  verbose: true,
});
