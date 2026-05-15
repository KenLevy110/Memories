import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

export type MemoriesEnvProfile = "dashboard" | "standalone";

/**
 * Reads `MEMORIES_ENV_PROFILE` after repo-root `.env` has been loaded into `process.env`.
 * Precedence: value already in `process.env` (shell / CI) wins; otherwise values from `.env`.
 */
export function resolveMemoriesEnvProfile(): MemoriesEnvProfile {
  const fromProcess = process.env["MEMORIES_ENV_PROFILE"]?.trim().toLowerCase() ?? "";
  if (fromProcess === "standalone" || fromProcess === "dashboard") {
    return fromProcess;
  }
  return "dashboard";
}

/**
 * Loads repo-root `.env`, then optionally `.env.local` when `MEMORIES_ENV_PROFILE=standalone`.
 * Dashboard mode ignores `.env.local` so a leftover standalone file cannot override Dashboard wiring.
 */
export function loadMonorepoRootEnv(monorepoRoot: string): void {
  loadEnv({ path: path.join(monorepoRoot, ".env") });
  const profile = resolveMemoriesEnvProfile();
  const envLocalPath = path.join(monorepoRoot, ".env.local");
  if (profile === "standalone" && existsSync(envLocalPath)) {
    loadEnv({ path: envLocalPath, override: true });
  }
}
