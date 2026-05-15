import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractVitePrefixedKeys,
  readMemoriesEnvProfileFromEnvContent,
} from "../../packages/shared/src/dotenvFile.ts";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../..");
const viteEnvDashboardDir = path.join(__dirname, "vite-env-dashboard");

function readRootDotenvText(): string {
  const envPath = path.join(monorepoRoot, ".env");
  if (!existsSync(envPath)) {
    return "";
  }
  return readFileSync(envPath, "utf8");
}

const rootDotenvText = readRootDotenvText();
const profile = readMemoriesEnvProfileFromEnvContent(rootDotenvText);

const viteDefineFromRootEnv =
  profile === "dashboard" && rootDotenvText.length > 0
    ? Object.fromEntries(
        Object.entries(extractVitePrefixedKeys(rootDotenvText)).map(([key, value]) => [
          `import.meta.env.${key}`,
          JSON.stringify(value),
        ]),
      )
    : {};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: profile === "standalone" ? monorepoRoot : viteEnvDashboardDir,
  define: viteDefineFromRootEnv,
  server:
    profile === "standalone"
      ? { port: 5173, strictPort: true }
      : { port: 5174, strictPort: true },
});
