import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { buildApp } from "./app.js";

// `import.meta.url` is `.../apps/api/src/index.ts` (or `.../dist/index.js`); go up to monorepo root for `.env`.
const monorepoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
loadEnv({ path: path.join(monorepoRoot, ".env") });

const port = Number(process.env["PORT"] ?? 3000);
const host = process.env["HOST"] ?? "0.0.0.0";
const logLevel = process.env["LOG_LEVEL"] ?? "info";
const isQuiet = ["warn", "error", "fatal", "silent"].includes(logLevel);

const app = buildApp();
await app.listen({ port, host });
if (isQuiet) {
  console.log(`Legacy API http://127.0.0.1:${port}`);
} else {
    app.log.info(`Legacy API listening on ${host}:${port}`);
}
