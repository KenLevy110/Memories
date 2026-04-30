import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const configDirectory = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(configDirectory, "../../.env") });
loadEnv({ path: resolve(configDirectory, ".env"), override: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
  strict: true,
  verbose: true,
});
